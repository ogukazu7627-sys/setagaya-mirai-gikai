import { describe, expect, it, vi } from "vitest";
import type {
  CouncilorXSyncSource,
  PublicCouncilorXPost,
} from "../../shared/types/councilor-x-post";
import { syncCouncilorXPosts } from "./councilor-x-post-sync-service";
import {
  type XApiClient,
  type XApiPostPage,
  XApiResourceUnavailableError,
} from "./x-api-client";

const source = (
  overrides: Partial<CouncilorXSyncSource> = {}
): CouncilorXSyncSource => ({
  councilorId: "11111111-1111-4111-8111-111111111111",
  xUsername: "test_member",
  xUserId: "2244994945",
  lastSeenPostId: "100",
  ...overrides,
});

const apiPost = (id: string, hour: number) => ({
  id,
  createdAt: `2026-07-27T${String(hour).padStart(2, "0")}:00:00.000Z`,
  referencedPostTypes: [] as string[],
});

function fakeClient(findUserPosts: XApiClient["findUserPosts"]): XApiClient {
  return {
    findUsersByUsernames: vi.fn().mockResolvedValue([]),
    findUserPosts,
  };
}

describe("syncCouncilorXPosts", () => {
  it("通常投稿と引用投稿だけを一度のトランザクション入力へ渡す", async () => {
    const persistSync = vi.fn().mockResolvedValue({
      storedCount: 2,
      deletedCount: 0,
    });
    const xApiClient = fakeClient(
      vi.fn().mockResolvedValue({
        posts: [
          apiPost("103", 10),
          {
            ...apiPost("102", 9),
            referencedPostTypes: ["quoted"],
          },
          {
            ...apiPost("101", 8),
            referencedPostTypes: ["replied_to"],
          },
        ],
        nextToken: null,
      })
    );

    const result = await syncCouncilorXPosts({
      xApiClient,
      findSyncSources: vi.fn().mockResolvedValue([source()]),
      findLatestPosts: vi.fn().mockResolvedValue([]),
      persistSync,
      now: () => new Date("2026-07-27T11:00:00.000Z"),
    });

    expect(persistSync).toHaveBeenCalledWith({
      activeAccounts: [
        {
          councilorId: "11111111-1111-4111-8111-111111111111",
          xUsername: "test_member",
        },
      ],
      posts: [
        expect.objectContaining({ postId: "103", postType: "original" }),
        expect.objectContaining({ postId: "102", postType: "quote" }),
      ],
      syncStates: [
        expect.objectContaining({
          lastSeenPostId: "103",
          xUserId: "2244994945",
        }),
      ],
      syncedAt: "2026-07-27T11:00:00.000Z",
    });
    expect(result).toMatchObject({
      fetchedPostCount: 2,
      storedPostCount: 2,
    });
  });

  it("API取得が一件でも失敗した場合は既存DBを更新しない", async () => {
    const persistSync = vi.fn();
    const xApiClient = fakeClient(
      vi.fn().mockRejectedValue(new Error("X unavailable"))
    );

    await expect(
      syncCouncilorXPosts({
        xApiClient,
        findSyncSources: vi.fn().mockResolvedValue([source()]),
        findLatestPosts: vi.fn().mockResolvedValue([
          {
            postId: "100",
            councilorName: "テスト議員",
            postUrl: "https://x.com/test_member/status/100",
            postedAt: "2026-07-27T07:00:00.000Z",
          },
        ] satisfies PublicCouncilorXPost[]),
        persistSync,
      })
    ).rejects.toThrow("X unavailable");

    expect(persistSync).not.toHaveBeenCalled();
  });

  it("初回同期では50件目に入り得るアカウントだけ次ページを読む", async () => {
    const firstSource = source({
      councilorId: "11111111-1111-4111-8111-111111111111",
      xUserId: "1",
      lastSeenPostId: null,
    });
    const secondSource = source({
      councilorId: "22222222-2222-4222-8222-222222222222",
      xUsername: "other_member",
      xUserId: "2",
      lastSeenPostId: null,
    });
    const findUserPosts = vi.fn(
      async (input: {
        userId: string;
        paginationToken?: string;
      }): Promise<XApiPostPage> => {
        if (input.userId === "1" && !input.paginationToken) {
          return {
            posts: [apiPost("200", 10), apiPost("190", 9)],
            nextToken: "next-new",
          };
        }
        if (input.userId === "1") {
          return {
            posts: [apiPost("180", 8)],
            nextToken: null,
          };
        }
        return {
          posts: [apiPost("50", 1)],
          nextToken: "next-old",
        };
      }
    );
    const currentPosts = Array.from({ length: 49 }, (_, index) => ({
      postId: String(170 - index),
      councilorName: "既存議員",
      postUrl: `https://x.com/existing/status/${170 - index}`,
      postedAt: `2026-07-27T07:${String(59 - index).padStart(2, "0")}:00.000Z`,
    }));

    await syncCouncilorXPosts({
      xApiClient: fakeClient(findUserPosts),
      findSyncSources: vi.fn().mockResolvedValue([firstSource, secondSource]),
      findLatestPosts: vi.fn().mockResolvedValue(currentPosts),
      persistSync: vi.fn().mockResolvedValue({
        storedCount: 50,
        deletedCount: 2,
      }),
    });

    expect(findUserPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "1",
        paginationToken: "next-new",
      })
    );
    expect(findUserPosts).not.toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "2",
        paginationToken: "next-old",
      })
    );
  });

  it("未解決のUser IDを一括取得し、非公開アカウントだけを除外する", async () => {
    const publicSource = source({
      xUsername: "public_member",
      xUserId: null,
    });
    const protectedSource = source({
      councilorId: "22222222-2222-4222-8222-222222222222",
      xUsername: "protected_member",
      xUserId: null,
    });
    const findUsersByUsernames = vi.fn().mockResolvedValue([
      {
        id: "10",
        username: "public_member",
        protected: false,
      },
      {
        id: "20",
        username: "protected_member",
        protected: true,
      },
    ]);
    const findUserPosts = vi.fn().mockResolvedValue({
      posts: [],
      nextToken: null,
    });
    const persistSync = vi.fn().mockResolvedValue({
      storedCount: 0,
      deletedCount: 0,
    });

    const result = await syncCouncilorXPosts({
      xApiClient: { findUsersByUsernames, findUserPosts },
      findSyncSources: vi
        .fn()
        .mockResolvedValue([publicSource, protectedSource]),
      findLatestPosts: vi.fn().mockResolvedValue([]),
      persistSync,
    });

    expect(findUsersByUsernames).toHaveBeenCalledWith([
      "public_member",
      "protected_member",
    ]);
    expect(findUserPosts).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "10", sinceId: "100" })
    );
    expect(result).toMatchObject({
      syncedAccountCount: 1,
      unavailableAccountCount: 1,
    });
    expect(persistSync).toHaveBeenCalledWith(
      expect.objectContaining({
        activeAccounts: [
          expect.objectContaining({ xUsername: "public_member" }),
          expect.objectContaining({ xUsername: "protected_member" }),
        ],
        syncStates: [
          expect.objectContaining({
            xUsername: "public_member",
            xUserId: "10",
            lastSeenPostId: "100",
          }),
        ],
      })
    );
  });

  it("一部アカウントが利用不能でも、成功したアカウントだけを保存する", async () => {
    const availableSource = source({ xUserId: "10" });
    const unavailableSource = source({
      councilorId: "22222222-2222-4222-8222-222222222222",
      xUsername: "unavailable_member",
      xUserId: "20",
    });
    const persistSync = vi.fn().mockResolvedValue({
      storedCount: 1,
      deletedCount: 0,
    });
    const findUserPosts = vi.fn(async ({ userId }: { userId: string }) => {
      if (userId === "20") {
        throw new XApiResourceUnavailableError();
      }
      return {
        posts: [apiPost("101", 10)],
        nextToken: null,
      };
    });

    const result = await syncCouncilorXPosts({
      xApiClient: fakeClient(findUserPosts),
      findSyncSources: vi
        .fn()
        .mockResolvedValue([availableSource, unavailableSource]),
      findLatestPosts: vi.fn().mockResolvedValue([]),
      persistSync,
    });

    expect(result).toMatchObject({
      syncedAccountCount: 1,
      unavailableAccountCount: 1,
    });
    expect(persistSync).toHaveBeenCalledWith(
      expect.objectContaining({
        posts: [expect.objectContaining({ councilorId: source().councilorId })],
        syncStates: [
          expect.objectContaining({ councilorId: source().councilorId }),
        ],
      })
    );
  });

  it("全アカウントが利用不能なら既存DBを更新しない", async () => {
    const persistSync = vi.fn();
    const xApiClient = fakeClient(
      vi.fn().mockRejectedValue(new XApiResourceUnavailableError())
    );

    await expect(
      syncCouncilorXPosts({
        xApiClient,
        findSyncSources: vi.fn().mockResolvedValue([source()]),
        findLatestPosts: vi.fn().mockResolvedValue([]),
        persistSync,
      })
    ).rejects.toThrow("No councilor X accounts could be synchronized");
    expect(persistSync).not.toHaveBeenCalled();
  });

  it("増分ページのnext_tokenが進まなければ保存せず停止する", async () => {
    const persistSync = vi.fn();
    const findUserPosts = vi.fn().mockResolvedValue({
      posts: [apiPost("101", 10)],
      nextToken: "repeated-token",
    });

    await expect(
      syncCouncilorXPosts({
        xApiClient: fakeClient(findUserPosts),
        findSyncSources: vi.fn().mockResolvedValue([source()]),
        findLatestPosts: vi.fn().mockResolvedValue([]),
        persistSync,
      })
    ).rejects.toThrow("X API pagination did not advance");

    expect(findUserPosts).toHaveBeenCalledTimes(2);
    expect(persistSync).not.toHaveBeenCalled();
  });

  it("遅い取得を待たず、空いた同時実行枠で次のアカウントを取得する", async () => {
    let resolveFirstRequest: ((page: XApiPostPage) => void) | undefined;
    const firstRequest = new Promise<XApiPostPage>((resolve) => {
      resolveFirstRequest = resolve;
    });
    const findUserPosts = vi.fn(
      ({ userId }: { userId: string }): Promise<XApiPostPage> => {
        if (userId === "1") {
          return firstRequest;
        }
        return Promise.resolve({ posts: [], nextToken: null });
      }
    );
    const syncPromise = syncCouncilorXPosts({
      xApiClient: fakeClient(findUserPosts),
      findSyncSources: vi.fn().mockResolvedValue([
        source({ xUserId: "1" }),
        source({
          councilorId: "22222222-2222-4222-8222-222222222222",
          xUsername: "second_member",
          xUserId: "2",
        }),
        source({
          councilorId: "33333333-3333-4333-8333-333333333333",
          xUsername: "third_member",
          xUserId: "3",
        }),
      ]),
      findLatestPosts: vi.fn().mockResolvedValue([]),
      persistSync: vi.fn().mockResolvedValue({
        storedCount: 0,
        deletedCount: 0,
      }),
      concurrency: 2,
    });

    await vi.waitFor(() => {
      expect(findUserPosts).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "3" })
      );
    });

    resolveFirstRequest?.({ posts: [], nextToken: null });
    await expect(syncPromise).resolves.toMatchObject({
      syncedAccountCount: 3,
    });
  });

  it("致命的な取得失敗後は待機中アカウントのAPIを呼ばない", async () => {
    const findUserPosts = vi.fn().mockRejectedValue(new Error("X failed"));
    const persistSync = vi.fn();

    await expect(
      syncCouncilorXPosts({
        xApiClient: fakeClient(findUserPosts),
        findSyncSources: vi.fn().mockResolvedValue([
          source({ xUserId: "1" }),
          source({
            councilorId: "22222222-2222-4222-8222-222222222222",
            xUsername: "second_member",
            xUserId: "2",
          }),
          source({
            councilorId: "33333333-3333-4333-8333-333333333333",
            xUsername: "third_member",
            xUserId: "3",
          }),
        ]),
        findLatestPosts: vi.fn().mockResolvedValue([]),
        persistSync,
        concurrency: 1,
      })
    ).rejects.toThrow("X failed");

    expect(findUserPosts).toHaveBeenCalledTimes(1);
    expect(persistSync).not.toHaveBeenCalled();
  });
});
