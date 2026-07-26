import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isCouncilorXPostSyncRequestAuthorized: vi.fn(),
  syncCouncilorXPosts: vi.fn(),
}));

vi.mock(
  "@/features/councilor-x-posts/server/utils/councilor-x-post-sync-auth",
  () => ({
    isCouncilorXPostSyncRequestAuthorized:
      mocks.isCouncilorXPostSyncRequestAuthorized,
  })
);

vi.mock(
  "@/features/councilor-x-posts/server/services/councilor-x-post-sync-service",
  () => ({
    syncCouncilorXPosts: mocks.syncCouncilorXPosts,
  })
);

import { GET } from "./route";

const endpoint = "https://civictech-setagaya.org/api/cron/councilor-x-posts";

describe("GET /api/cron/councilor-x-posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isCouncilorXPostSyncRequestAuthorized.mockResolvedValue(true);
    mocks.syncCouncilorXPosts.mockResolvedValue({
      accountCount: 45,
      syncedAccountCount: 45,
      unavailableAccountCount: 0,
      fetchedPostCount: 4,
      storedPostCount: 50,
      deletedPostCount: 4,
    });
  });

  it("認証されていないリクエストを拒否する", async () => {
    mocks.isCouncilorXPostSyncRequestAuthorized.mockResolvedValue(false);

    const response = await GET(new Request(endpoint));

    expect(response.status).toBe(401);
    expect(mocks.syncCouncilorXPosts).not.toHaveBeenCalled();
  });

  it("認証後に同期を一度だけ実行する", async () => {
    const request = new Request(endpoint);
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mocks.isCouncilorXPostSyncRequestAuthorized).toHaveBeenCalledWith(
      request
    );
    expect(mocks.syncCouncilorXPosts).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      storedPostCount: 50,
    });
  });

  it("同期失敗時に既存データを変更する追加処理を行わない", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.syncCouncilorXPosts.mockRejectedValue(new Error("secret detail"));

    const response = await GET(new Request(endpoint));

    expect(response.status).toBe(500);
    expect(consoleError).toHaveBeenCalledWith("Councilor X post sync failed");
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("secret detail")
    );
    consoleError.mockRestore();
  });
});
