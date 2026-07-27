import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRecommendationAvailability: vi.fn(),
}));

vi.mock(
  "@/features/recommendations/server/services/recommendation-availability-service",
  () => ({
    getRecommendationAvailability: mocks.getRecommendationAvailability,
  })
);

import { GET } from "./route";

describe("GET /api/recommendations/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("候補件数を共有キャッシュ可能なレスポンスで返す", async () => {
    mocks.getRecommendationAvailability.mockResolvedValue({
      不登校支援: 3,
      学校改築: 2,
      防災情報: 1,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=600");
    expect(await response.json()).toEqual({
      不登校支援: 3,
      学校改築: 2,
      防災情報: 1,
    });
  });
});
