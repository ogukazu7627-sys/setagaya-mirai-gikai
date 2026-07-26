import "server-only";

import { isValidXId } from "../../shared/utils/x-account";
import type { XApiPost } from "../../shared/utils/x-api-post";

const X_API_BASE_URL = "https://api.x.com/2";
const X_API_TIMEOUT_MS = 15_000;

export type XApiUser = {
  id: string;
  username: string;
  protected: boolean;
};

export type XApiPostPage = {
  posts: XApiPost[];
  nextToken: string | null;
};

export type XApiClient = {
  findUsersByUsernames(usernames: string[]): Promise<XApiUser[]>;
  findUserPosts(input: {
    userId: string;
    sinceId?: string;
    paginationToken?: string;
    maxResults: number;
  }): Promise<XApiPostPage>;
};

export class XApiResourceUnavailableError extends Error {
  constructor() {
    super("X account is unavailable");
    this.name = "XApiResourceUnavailableError";
  }
}

type XApiClientOptions = {
  bearerToken?: string;
  fetchImpl?: typeof fetch;
};

export function createXApiClient(options: XApiClientOptions = {}): XApiClient {
  const bearerToken =
    options.bearerToken ?? process.env.X_API_BEARER_TOKEN ?? "";
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!bearerToken) {
    throw new Error("X_API_BEARER_TOKEN is not configured");
  }

  const requestJson = async (
    url: URL,
    requestLabel: string,
    allowUnavailable = false
  ): Promise<unknown> => {
    let response: Response;

    try {
      response = await fetchImpl(url, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: AbortSignal.timeout(X_API_TIMEOUT_MS),
      });
    } catch {
      throw new Error(`X API request failed (${requestLabel})`);
    }

    if (
      allowUnavailable &&
      (response.status === 403 || response.status === 404)
    ) {
      throw new XApiResourceUnavailableError();
    }

    if (!response.ok) {
      throw new Error(
        `X API request failed (${requestLabel}, status ${response.status})`
      );
    }

    try {
      return await response.json();
    } catch {
      throw new Error(`X API returned invalid JSON (${requestLabel})`);
    }
  };

  return {
    async findUsersByUsernames(usernames) {
      if (usernames.length === 0) {
        return [];
      }

      const url = new URL(`${X_API_BASE_URL}/users/by`);
      url.searchParams.set("usernames", usernames.join(","));
      url.searchParams.set("user.fields", "protected");

      const payload = await requestJson(url, "user lookup");
      return parseUsers(payload);
    },

    async findUserPosts({ userId, sinceId, paginationToken, maxResults }) {
      const url = new URL(`${X_API_BASE_URL}/users/${userId}/tweets`);
      url.searchParams.set("exclude", "replies,retweets");
      url.searchParams.set("max_results", String(maxResults));
      url.searchParams.set("tweet.fields", "created_at,referenced_tweets");
      if (sinceId) {
        url.searchParams.set("since_id", sinceId);
      }
      if (paginationToken) {
        url.searchParams.set("pagination_token", paginationToken);
      }

      const payload = await requestJson(url, "user posts", true);
      return parsePostPage(payload);
    },
  };
}

function parseUsers(payload: unknown): XApiUser[] {
  const data = getRecord(payload)?.data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((value) => {
    const user = getRecord(value);
    if (
      !user ||
      typeof user.id !== "string" ||
      !isValidXId(user.id) ||
      typeof user.username !== "string"
    ) {
      return [];
    }

    return [
      {
        id: user.id,
        username: user.username,
        protected: user.protected === true,
      },
    ];
  });
}

function parsePostPage(payload: unknown): XApiPostPage {
  const record = getRecord(payload);
  const data = record?.data;
  const meta = getRecord(record?.meta);

  return {
    posts: Array.isArray(data)
      ? data.flatMap((value) => {
          const post = getRecord(value);
          if (
            !post ||
            typeof post.id !== "string" ||
            typeof post.created_at !== "string"
          ) {
            return [];
          }

          const references = Array.isArray(post.referenced_tweets)
            ? post.referenced_tweets.flatMap((reference) => {
                const referenceRecord = getRecord(reference);
                return typeof referenceRecord?.type === "string"
                  ? [referenceRecord.type]
                  : [];
              })
            : [];

          return [
            {
              id: post.id,
              createdAt: post.created_at,
              referencedPostTypes: references,
            },
          ];
        })
      : [],
    nextToken: typeof meta?.next_token === "string" ? meta.next_token : null,
  };
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}
