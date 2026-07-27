import { beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_TAGS } from "@/lib/cache-tags";

const mocks = vi.hoisted(() => ({
  findRecommendationCandidates: vi.fn(),
  unstableCache: vi.fn((loader: () => Promise<unknown>) => loader),
}));

vi.mock("next/cache", () => ({
  unstable_cache: mocks.unstableCache,
}));

vi.mock("../repositories/recommendation-repository", () => ({
  findRecommendationCandidates: mocks.findRecommendationCandidates,
}));

import { getRecommendationCandidates } from "./recommendation-candidate-service";

describe("getRecommendationCandidates", () => {
  beforeEach(() => {
    mocks.findRecommendationCandidates.mockReset();
  });

  it("案件更新タグに連動する10分キャッシュを定義する", async () => {
    mocks.findRecommendationCandidates.mockResolvedValue([]);

    await getRecommendationCandidates();

    expect(mocks.unstableCache).toHaveBeenCalledWith(
      mocks.findRecommendationCandidates,
      ["recommendation-candidates"],
      {
        revalidate: 600,
        tags: [CACHE_TAGS.BILLS],
      }
    );
    expect(mocks.findRecommendationCandidates).toHaveBeenCalledTimes(1);
  });
});
