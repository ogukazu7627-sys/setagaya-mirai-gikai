import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processCouncilSearchIndexJobs: vi.fn(),
}));

vi.mock(
  "@/features/bills/server/services/council-search-index-service",
  () => ({
    processCouncilSearchIndexJobs: mocks.processCouncilSearchIndexJobs,
  })
);

import { GET } from "./route";

describe("GET /api/cron/council-search-index", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    mocks.processCouncilSearchIndexJobs.mockReset();
    mocks.processCouncilSearchIndexJobs.mockResolvedValue({
      claimed: 2,
      completed: 2,
      failed: 0,
    });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("Bearer認証なしでは実行しない", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/council-search-index")
    );

    expect(response.status).toBe(401);
    expect(mocks.processCouncilSearchIndexJobs).not.toHaveBeenCalled();
  });

  it("20案件・並列4件でキューを処理する", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/council-search-index", {
        headers: { Authorization: "Bearer test-cron-secret" },
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.processCouncilSearchIndexJobs).toHaveBeenCalledWith({
      limit: 20,
      concurrency: 4,
    });
  });

  it("ワーカー障害を500へ変換する", async () => {
    mocks.processCouncilSearchIndexJobs.mockRejectedValue(
      new Error("database unavailable")
    );

    const response = await GET(
      new Request("http://localhost/api/cron/council-search-index", {
        headers: { Authorization: "Bearer test-cron-secret" },
      })
    );

    expect(response.status).toBe(500);
  });
});
