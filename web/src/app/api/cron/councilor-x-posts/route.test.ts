import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { XApiRequestError } from "@/features/councilor-x-posts/server/services/x-api-client";

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
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
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

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  it("認証されていないリクエストを拒否する", async () => {
    mocks.isCouncilorXPostSyncRequestAuthorized.mockResolvedValue(false);

    const response = await GET(new Request(endpoint));

    expect(response.status).toBe(401);
    expect(mocks.syncCouncilorXPosts).not.toHaveBeenCalled();
  });

  it("認証後に同期を一度だけ実行する", async () => {
    const request = new Request(endpoint, {
      headers: { "x-vercel-id": "hnd1::request-id" },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mocks.isCouncilorXPostSyncRequestAuthorized).toHaveBeenCalledWith(
      request
    );
    expect(mocks.syncCouncilorXPosts).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      storedPostCount: 50,
    });
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Councilor X post sync started")
    );
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Councilor X post sync completed")
    );
  });

  it("同期失敗時に内部詳細をレスポンスへ出さず構造化ログへ残す", async () => {
    mocks.syncCouncilorXPosts.mockRejectedValue(
      new XApiRequestError({
        requestLabel: "user posts",
        status: 429,
        statusText: "Too Many Requests",
        responseBody: '{"title":"Too Many Requests"}',
      })
    );

    const response = await GET(
      new Request(endpoint, {
        headers: { "x-vercel-id": "hnd1::request-id" },
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "X post sync failed",
    });

    const logged = JSON.parse(String(consoleError.mock.calls[0]?.[0]));
    expect(logged).toMatchObject({
      level: "error",
      msg: "Councilor X post sync failed",
      route: "/api/cron/councilor-x-posts",
      requestId: "hnd1::request-id",
      error: {
        name: "XApiRequestError",
        message: "X API request failed (user posts, status 429)",
        xApi: {
          requestLabel: "user posts",
          status: 429,
          statusText: "Too Many Requests",
          responseBody: '{"title":"Too Many Requests"}',
        },
      },
    });
  });
});
