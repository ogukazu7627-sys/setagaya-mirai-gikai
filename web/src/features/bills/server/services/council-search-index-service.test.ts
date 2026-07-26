import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimCouncilSearchIndexJobs: vi.fn(),
  completeCouncilSearchIndexJob: vi.fn(),
  deleteCouncilSearchChunksByBillId: vi.fn(),
  deleteCouncilSearchChunksByIds: vi.fn(),
  failCouncilSearchIndexJob: vi.fn(),
  findCouncilSearchIndexSource: vi.fn(),
  findExistingCouncilSearchChunks: vi.fn(),
  upsertCouncilSearchChunks: vi.fn(),
}));

vi.mock("../repositories/council-search-index-repository", () => mocks);

import { processCouncilSearchIndexJobs } from "./council-search-index-service";

const job = {
  billId: "11111111-1111-4111-8111-111111111111",
  requestedAt: "2026-07-27T00:00:00.000Z",
  attemptCount: 2,
};

describe("processCouncilSearchIndexJobs", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
    mocks.claimCouncilSearchIndexJobs.mockResolvedValue([job]);
    mocks.findExistingCouncilSearchChunks.mockResolvedValue([]);
    mocks.completeCouncilSearchIndexJob.mockResolvedValue(undefined);
    mocks.failCouncilSearchIndexJob.mockResolvedValue(undefined);
    mocks.deleteCouncilSearchChunksByBillId.mockResolvedValue(undefined);
  });

  it("非公開案件の索引を削除してジョブを完了する", async () => {
    mocks.findCouncilSearchIndexSource.mockResolvedValue({
      source: null,
      publishStatus: "draft",
      sessionStartDate: "2026-01-01",
    });

    const result = await processCouncilSearchIndexJobs(
      { limit: 20, concurrency: 4 },
      { now: () => new Date("2026-07-27T00:00:00.000Z") }
    );

    expect(mocks.claimCouncilSearchIndexJobs).toHaveBeenCalledWith(20);
    expect(mocks.deleteCouncilSearchChunksByBillId).toHaveBeenCalledWith(
      job.billId
    );
    expect(mocks.completeCouncilSearchIndexJob).toHaveBeenCalledWith(job);
    expect(result).toEqual({ claimed: 1, completed: 1, failed: 0 });
  });

  it("障害時は検索文や本文を保存せず指数バックオフで再試行する", async () => {
    mocks.findCouncilSearchIndexSource.mockRejectedValue(
      new Error("embedding unavailable")
    );

    const result = await processCouncilSearchIndexJobs(
      {},
      { now: () => new Date("2026-07-27T00:00:00.000Z") }
    );

    expect(mocks.failCouncilSearchIndexJob).toHaveBeenCalledWith(
      job,
      "embedding unavailable",
      "2026-07-27T00:02:00.000Z"
    );
    expect(result).toEqual({ claimed: 1, completed: 0, failed: 1 });
  });
});
