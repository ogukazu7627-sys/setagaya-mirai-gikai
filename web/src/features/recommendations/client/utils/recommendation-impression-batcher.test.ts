import { afterEach, describe, expect, it, vi } from "vitest";
import { createRecommendationImpressionBatcher } from "./recommendation-impression-batcher";

const context = {
  installationId: "11111111-1111-4111-8111-111111111111",
  recommendationDate: "2026-07-27",
  preferenceVersion: 1,
};

describe("recommendation impression batcher", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("短時間に表示した案件を一度に送り、重複を除く", async () => {
    vi.useFakeTimers();
    const send = vi.fn().mockResolvedValue(undefined);
    const batcher = createRecommendationImpressionBatcher(send, 500);

    batcher.record(context, "bill-1");
    batcher.record(context, "bill-2");
    batcher.record(context, "bill-1");
    await vi.advanceTimersByTimeAsync(500);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(context.installationId, [
      "bill-1",
      "bill-2",
    ]);
  });

  it("送信失敗後は同じ案件を再送できる", async () => {
    vi.useFakeTimers();
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined);
    const batcher = createRecommendationImpressionBatcher(send, 500);

    batcher.record(context, "bill-1");
    await vi.advanceTimersByTimeAsync(500);
    batcher.record(context, "bill-1");
    await vi.advanceTimersByTimeAsync(500);

    expect(send).toHaveBeenCalledTimes(2);
  });

  it("ページ離脱相当のflushで待機中の履歴をすぐ送る", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const batcher = createRecommendationImpressionBatcher(send, 10_000);

    batcher.record(context, "bill-1");
    await batcher.flush();

    expect(send).toHaveBeenCalledWith(context.installationId, ["bill-1"]);
  });
});
