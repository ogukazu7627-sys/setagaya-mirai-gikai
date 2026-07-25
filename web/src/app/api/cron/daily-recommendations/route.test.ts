import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendDailyRecommendationPushes: vi.fn(),
}));

vi.mock(
  "@/features/recommendations/server/services/daily-push-service",
  () => ({
    sendDailyRecommendationPushes: mocks.sendDailyRecommendationPushes,
  })
);

import { GET } from "./route";

describe("daily recommendation cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
    mocks.sendDailyRecommendationPushes.mockResolvedValue({
      claimed: 1,
      sent: 1,
      skipped: 0,
      expired: 0,
      failed: 0,
    });
  });

  it("rejects requests without the exact bearer secret", async () => {
    const response = await GET(
      new Request("https://example.test/api/cron/daily-recommendations")
    );
    expect(response.status).toBe(401);
    expect(mocks.sendDailyRecommendationPushes).not.toHaveBeenCalled();
  });

  it("runs once for an authenticated Vercel Cron request", async () => {
    const response = await GET(
      new Request("https://example.test/api/cron/daily-recommendations", {
        headers: { authorization: "Bearer cron-test-secret" },
      })
    );
    expect(response.status).toBe(200);
    expect(mocks.sendDailyRecommendationPushes).toHaveBeenCalledTimes(1);
  });
});
