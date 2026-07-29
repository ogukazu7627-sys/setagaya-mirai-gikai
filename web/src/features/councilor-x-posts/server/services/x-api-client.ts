import "server-only";

import { isValidXId } from "../../shared/utils/x-account";
import type { XApiPost } from "../../shared/utils/x-api-post";

const X_API_BASE_URL = "https://api.x.com/2";
const X_API_TIMEOUT_MS = 15_000;
const X_API_ERROR_BODY_MAX_LENGTH = 1_000;

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

export class XApiRequestError extends Error {
  readonly requestLabel: string;
  readonly status: number | null;
  readonly statusText: string | null;
  readonly responseBody: string | null;
  readonly cause: unknown;

  constructor(input: {
    requestLabel: string;
    status?: number;
    statusText?: string;
    responseBody?: string | null;
    cause?: unknown;
  }) {
    const statusDetail =
      input.status !== undefined ? `, status ${input.status}` : "";
    super(`X API request failed (${input.requestLabel}${statusDetail})`);
    this.name = "XApiRequestError";
    this.requestLabel = input.requestLabel;
    this.status = input.status ?? null;
    this.statusText = input.statusText ?? null;
    this.responseBody = input.responseBody ?? null;
    this.cause = input.cause;
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
    } catch (cause) {
      throw new XApiRequestError({ requestLabel, cause });
    }

    if (
      allowUnavailable &&
      (response.status === 403 || response.status === 404)
    ) {
      throw new XApiResourceUnavailableError();
    }

    if (!response.ok) {
      throw new XApiRequestError({
        requestLabel,
        status: response.status,
        statusText: response.statusText,
        responseBody: await readErrorResponseBody(response),
      });
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

async function readErrorResponseBody(
  response: Response
): Promise<string | null> {
  try {
    const body = await response.text();
    if (!body) {
      return null;
    }
    return body.length > X_API_ERROR_BODY_MAX_LENGTH
      ? `${body.slice(0, X_API_ERROR_BODY_MAX_LENGTH)}...[truncated]`
      : body;
  } catch {
    return null;
  }
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
