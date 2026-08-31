import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecommendationProfileRow } from "../repositories/recommendation-repository";
import { getOrCreateDailyRecommendations } from "./daily-recommendation-service";

const mocks = vi.hoisted(() => ({
  findDailyRecommendation: vi.fn(),
  findImpressedBillIds: vi.fn(),
  findRecommendationProfileById: vi.fn(),
  insertDailyRecommendation: vi.fn(),
  updateDailyRecommendationPicks: vi.fn(),
  getRecommendationCandidates: vi.fn(),
}));

vi.mock("../repositories/recommendation-repository", () => ({
  findDailyRecommendation: mocks.findDailyRecommendation,
  findImpressedBillIds: mocks.findImpressedBillIds,
  findRecommendationProfileById: mocks.findRecommendationProfileById,
  insertDailyRecommendation: mocks.insertDailyRecommendation,
  updateDailyRecommendationPicks: mocks.updateDailyRecommendationPicks,
}));

vi.mock("./recommendation-candidate-service", () => ({
  getRecommendationCandidates: mocks.getRecommendationCandidates,
}));

const profile: RecommendationProfileRow = {
  id: "11111111-1111-4111-8111-111111111111",
  installation_id: "22222222-2222-4222-8222-222222222222",
  selected_small_tags: ["不登校支援", "学校改築", "防災情報"],
  selected_parent_category_ids: ["education", "disaster-prevention"],
  preference_version: 1,
  timezone: "Asia/Tokyo",
  created_at: "2026-07-25T00:00:00.000Z",
  updated_at: "2026-07-25T00:00:00.000Z",
};

describe("getOrCreateDailyRecommendations", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  it("returns an existing non-empty daily recommendation without recalculating", async () => {
    const existing = {
      id: "daily-existing",
      profile_id: profile.id,
      recommendation_date: "2026-07-25",
      preference_version: 1,
      bill_ids: ["bill-existing"],
      sources: ["selected-subcategory"],
      created_at: "2026-07-25T00:00:00.000Z",
    };
    mocks.findDailyRecommendation.mockResolvedValue(existing);

    const result = await getOrCreateDailyRecommendations(profile, "2026-07-25");

    expect(result).toBe(existing);
    expect(mocks.getRecommendationCandidates).not.toHaveBeenCalled();
    expect(mocks.updateDailyRecommendationPicks).not.toHaveBeenCalled();
  });

  it("recalculates and updates an existing empty daily recommendation", async () => {
    const existing = {
      id: "daily-empty",
      profile_id: profile.id,
      recommendation_date: "2026-07-25",
      preference_version: 1,
      bill_ids: [],
      sources: [],
      created_at: "2026-07-25T00:00:00.000Z",
    };
    const updated = {
      ...existing,
      bill_ids: ["bill-seen"],
      sources: ["selected-subcategory"],
    };
    mocks.findDailyRecommendation.mockResolvedValue(existing);
    mocks.getRecommendationCandidates.mockResolvedValue([
      { id: "bill-seen", tags: ["不登校支援"] },
    ]);
    mocks.findImpressedBillIds.mockResolvedValue(new Set(["bill-seen"]));
    mocks.updateDailyRecommendationPicks.mockResolvedValue(updated);

    const result = await getOrCreateDailyRecommendations(profile, "2026-07-25");

    expect(result).toBe(updated);
    expect(mocks.updateDailyRecommendationPicks).toHaveBeenCalledWith({
      dailyRecommendationId: "daily-empty",
      picks: [{ billId: "bill-seen", source: "selected-subcategory" }],
    });
    expect(mocks.insertDailyRecommendation).not.toHaveBeenCalled();
  });
});
