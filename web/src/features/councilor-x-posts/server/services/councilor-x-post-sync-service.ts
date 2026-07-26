import "server-only";

import type {
  CouncilorXSyncSource,
  CouncilorXSyncStateInput,
  PublicCouncilorXPost,
  StoredCouncilorXPost,
} from "../../shared/types/councilor-x-post";
import { buildXPostUrl } from "../../shared/utils/x-account";
import {
  type EligibleXApiPost,
  toEligibleXApiPost,
} from "../../shared/utils/x-api-post";
import {
  deduplicateXPosts,
  findBootstrapAccountsToContinue,
  sortXPostsNewestFirst,
} from "../../shared/utils/x-post-order";
import {
  findCouncilorXSyncSources,
  findLatestCouncilorXPosts,
  persistCouncilorXPostSync,
} from "../repositories/councilor-x-post-repository";
import {
  createXApiClient,
  type XApiClient,
  XApiResourceUnavailableError,
} from "./x-api-client";

const DEFAULT_CONCURRENCY = 8;
const INITIAL_PAGE_SIZE = 5;
const INCREMENTAL_PAGE_SIZE = 100;

type ResolvedCouncilorXSyncSource = CouncilorXSyncSource & {
  xUserId: string;
};

type AccountPageResult =
  | {
      status: "success";
      posts: EligibleXApiPost[];
      nextToken: string | null;
    }
  | {
      status: "unavailable";
    };

type BootstrapAccountState = {
  source: ResolvedCouncilorXSyncSource;
  posts: EligibleXApiPost[];
  nextToken: string | null;
  oldestFetchedPost: EligibleXApiPost | null;
  seenNextTokens: Set<string>;
};

type CouncilorXPostSyncDependencies = {
  xApiClient?: XApiClient;
  findSyncSources?: typeof findCouncilorXSyncSources;
  findLatestPosts?: typeof findLatestCouncilorXPosts;
  persistSync?: typeof persistCouncilorXPostSync;
  now?: () => Date;
  concurrency?: number;
};

export type CouncilorXPostSyncResult = {
  accountCount: number;
  syncedAccountCount: number;
  unavailableAccountCount: number;
  fetchedPostCount: number;
  storedPostCount: number;
  deletedPostCount: number;
};

export async function syncCouncilorXPosts(
  dependencies: CouncilorXPostSyncDependencies = {}
): Promise<CouncilorXPostSyncResult> {
  const findSyncSources =
    dependencies.findSyncSources ?? findCouncilorXSyncSources;
  const findLatestPosts =
    dependencies.findLatestPosts ?? findLatestCouncilorXPosts;
  const persistSync = dependencies.persistSync ?? persistCouncilorXPostSync;
  const now = dependencies.now ?? (() => new Date());
  const concurrency = dependencies.concurrency ?? DEFAULT_CONCURRENCY;

  const [sources, currentPosts] = await Promise.all([
    findSyncSources(),
    findLatestPosts(),
  ]);

  if (sources.length === 0) {
    return emptyResult();
  }

  const xApiClient = dependencies.xApiClient ?? createXApiClient();
  const resolution = await resolveXUsers(sources, xApiClient);
  if (resolution.sources.length === 0) {
    throw new Error("No public councilor X accounts could be resolved");
  }

  const incrementalSources = resolution.sources.filter(
    (source) => source.lastSeenPostId
  );
  const bootstrapSources = resolution.sources.filter(
    (source) => !source.lastSeenPostId
  );

  const incrementalResults = await runWithConcurrency(
    incrementalSources,
    concurrency,
    (source) => fetchAllNewPosts(source, xApiClient)
  );

  const successfulIncremental = incrementalResults.flatMap((result, index) => {
    const source = incrementalSources[index];
    return source && result.status === "success"
      ? [{ source, posts: result.posts }]
      : [];
  });
  let unavailableAccountCount =
    resolution.unavailableAccountCount +
    incrementalResults.filter((result) => result.status === "unavailable")
      .length;

  const firstBootstrapResults = await runWithConcurrency(
    bootstrapSources,
    concurrency,
    (source) =>
      fetchPostPage(source, xApiClient, { maxResults: INITIAL_PAGE_SIZE })
  );

  const bootstrapStates = new Map<string, BootstrapAccountState>();
  for (const [index, result] of firstBootstrapResults.entries()) {
    const source = bootstrapSources[index];
    if (!source) {
      continue;
    }
    if (result.status === "unavailable") {
      unavailableAccountCount += 1;
      continue;
    }

    bootstrapStates.set(source.councilorId, {
      source,
      posts: result.posts,
      nextToken: result.nextToken,
      oldestFetchedPost: findOldestPost(result.posts),
      seenNextTokens: new Set(
        result.nextToken ? [result.nextToken] : undefined
      ),
    });
  }

  unavailableAccountCount += await completeBootstrapPages({
    bootstrapStates,
    currentPosts,
    incrementalPosts: successfulIncremental.flatMap((result) => result.posts),
    xApiClient,
    concurrency,
  });

  const successfulBootstrap = Array.from(bootstrapStates.values()).map(
    (state) => ({
      source: state.source,
      posts: state.posts,
    })
  );
  const successfulAccounts = [...successfulIncremental, ...successfulBootstrap];

  if (successfulAccounts.length === 0) {
    throw new Error("No councilor X accounts could be synchronized");
  }

  const fetchedPosts = deduplicateXPosts(
    successfulAccounts.flatMap(({ source, posts }) =>
      posts.map((post) => toStoredPost(source, post))
    )
  );
  const syncStates = successfulAccounts.map(({ source, posts }) =>
    toSyncState(source, posts)
  );
  const persisted = await persistSync({
    activeAccounts: sources.map(({ councilorId, xUsername }) => ({
      councilorId,
      xUsername,
    })),
    posts: fetchedPosts,
    syncStates,
    syncedAt: now().toISOString(),
  });

  return {
    accountCount: sources.length,
    syncedAccountCount: successfulAccounts.length,
    unavailableAccountCount,
    fetchedPostCount: fetchedPosts.length,
    storedPostCount: persisted.storedCount,
    deletedPostCount: persisted.deletedCount,
  };
}

async function resolveXUsers(
  sources: CouncilorXSyncSource[],
  xApiClient: XApiClient
): Promise<{
  sources: ResolvedCouncilorXSyncSource[];
  unavailableAccountCount: number;
}> {
  const resolved = sources.flatMap((source) =>
    source.xUserId ? [{ ...source, xUserId: source.xUserId }] : []
  );
  const unresolved = sources.filter((source) => !source.xUserId);
  if (unresolved.length === 0) {
    return { sources: resolved, unavailableAccountCount: 0 };
  }

  const users = await xApiClient.findUsersByUsernames(
    unresolved.map((source) => source.xUsername)
  );
  const usersByUsername = new Map(
    users.map((user) => [user.username.toLowerCase(), user])
  );

  for (const source of unresolved) {
    const user = usersByUsername.get(source.xUsername.toLowerCase());
    if (user && !user.protected) {
      resolved.push({ ...source, xUserId: user.id });
    }
  }

  return {
    sources: resolved,
    unavailableAccountCount: sources.length - resolved.length,
  };
}

async function fetchAllNewPosts(
  source: ResolvedCouncilorXSyncSource,
  xApiClient: XApiClient
): Promise<AccountPageResult> {
  const posts: EligibleXApiPost[] = [];
  const seenNextTokens = new Set<string>();
  let paginationToken: string | undefined;

  do {
    const page = await fetchPostPage(source, xApiClient, {
      maxResults: INCREMENTAL_PAGE_SIZE,
      paginationToken,
      sinceId: source.lastSeenPostId ?? undefined,
    });
    if (page.status === "unavailable") {
      return page;
    }
    posts.push(...page.posts);

    if (page.nextToken && seenNextTokens.has(page.nextToken)) {
      throw new Error("X API pagination did not advance");
    }
    if (page.nextToken) {
      seenNextTokens.add(page.nextToken);
    }
    paginationToken = page.nextToken ?? undefined;
  } while (paginationToken);

  return { status: "success", posts, nextToken: null };
}

async function fetchPostPage(
  source: ResolvedCouncilorXSyncSource,
  xApiClient: XApiClient,
  input: {
    maxResults: number;
    paginationToken?: string;
    sinceId?: string;
  }
): Promise<AccountPageResult> {
  try {
    const page = await xApiClient.findUserPosts({
      userId: source.xUserId,
      maxResults: input.maxResults,
      paginationToken: input.paginationToken,
      sinceId: input.sinceId,
    });
    return {
      status: "success",
      posts: page.posts.flatMap(toEligiblePostArray),
      nextToken: page.nextToken,
    };
  } catch (error) {
    if (error instanceof XApiResourceUnavailableError) {
      return { status: "unavailable" };
    }
    throw error;
  }
}

async function completeBootstrapPages(input: {
  bootstrapStates: Map<string, BootstrapAccountState>;
  currentPosts: PublicCouncilorXPost[];
  incrementalPosts: EligibleXApiPost[];
  xApiClient: XApiClient;
  concurrency: number;
}): Promise<number> {
  let unavailableAccountCount = 0;

  while (true) {
    const bootstrapStateSnapshot = Array.from(input.bootstrapStates.values());
    const bootstrapPosts = bootstrapStateSnapshot.flatMap(
      (state) => state.posts
    );
    const accountKeys = findBootstrapAccountsToContinue(
      bootstrapStateSnapshot.map((state) => ({
        accountKey: state.source.councilorId,
        nextToken: state.nextToken,
        oldestFetchedPost: state.oldestFetchedPost,
      })),
      [...input.currentPosts, ...input.incrementalPosts, ...bootstrapPosts]
    );

    if (accountKeys.length === 0) {
      return unavailableAccountCount;
    }

    const states = accountKeys.flatMap((key) => {
      const state = input.bootstrapStates.get(key);
      return state ? [state] : [];
    });
    const results = await runWithConcurrency(
      states,
      input.concurrency,
      async (state) => {
        const paginationToken = state.nextToken ?? undefined;
        if (!paginationToken) {
          return { status: "success", posts: [], nextToken: null } as const;
        }
        return fetchPostPage(state.source, input.xApiClient, {
          maxResults: INITIAL_PAGE_SIZE,
          paginationToken,
        });
      }
    );

    for (const [index, result] of results.entries()) {
      const state = states[index];
      if (!state) {
        continue;
      }
      if (result.status === "unavailable") {
        input.bootstrapStates.delete(state.source.councilorId);
        unavailableAccountCount += 1;
        continue;
      }
      if (result.nextToken && state.seenNextTokens.has(result.nextToken)) {
        throw new Error("X API pagination did not advance");
      }
      if (result.nextToken) {
        state.seenNextTokens.add(result.nextToken);
      }
      state.posts.push(...result.posts);
      state.nextToken = result.nextToken;
      state.oldestFetchedPost = findOldestPost(result.posts);
    }
  }
}

async function runWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  task: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  const workerCount = Math.min(
    values.length,
    Math.max(1, Math.floor(concurrency))
  );
  const state: {
    nextIndex: number;
    failure: { error: unknown } | null;
  } = {
    nextIndex: 0,
    failure: null,
  };

  const workers = Array.from({ length: workerCount }, async () => {
    while (!state.failure && state.nextIndex < values.length) {
      const index = state.nextIndex;
      state.nextIndex += 1;
      const value = values[index];
      if (value !== undefined) {
        try {
          results[index] = await task(value);
        } catch (error) {
          state.failure ??= { error };
        }
      }
    }
  });
  await Promise.all(workers);
  if (state.failure) {
    throw state.failure.error;
  }

  return results;
}

function toEligiblePostArray(
  post: Parameters<typeof toEligibleXApiPost>[0]
): EligibleXApiPost[] {
  const eligible = toEligibleXApiPost(post);
  return eligible ? [eligible] : [];
}

function findOldestPost(
  posts: readonly EligibleXApiPost[]
): EligibleXApiPost | null {
  return sortXPostsNewestFirst(posts).at(-1) ?? null;
}

function toStoredPost(
  source: ResolvedCouncilorXSyncSource,
  post: EligibleXApiPost
): StoredCouncilorXPost {
  return {
    postId: post.postId,
    councilorId: source.councilorId,
    postUrl: buildXPostUrl(source.xUsername, post.postId),
    postedAt: post.postedAt,
    postType: post.postType,
  };
}

function toSyncState(
  source: ResolvedCouncilorXSyncSource,
  posts: EligibleXApiPost[]
): CouncilorXSyncStateInput {
  return {
    councilorId: source.councilorId,
    xUsername: source.xUsername,
    xUserId: source.xUserId,
    lastSeenPostId:
      sortXPostsNewestFirst(posts)[0]?.postId ?? source.lastSeenPostId,
  };
}

function emptyResult(): CouncilorXPostSyncResult {
  return {
    accountCount: 0,
    syncedAccountCount: 0,
    unavailableAccountCount: 0,
    fetchedPostCount: 0,
    storedPostCount: 0,
    deletedPostCount: 0,
  };
}
