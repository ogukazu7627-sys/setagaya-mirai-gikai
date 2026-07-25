import { describe, expect, it } from "vitest";
import {
  getParentCategoryIdsForTags,
  normalizeRecommendationTag,
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_CATEGORY_OPTIONS,
  RECOMMENDATION_SMALL_TAGS,
} from "./recommendation-taxonomy";

describe("recommendation taxonomy", () => {
  it("keeps the canonical ten categories and 84 small tags", () => {
    expect(RECOMMENDATION_CATEGORIES).toHaveLength(10);
    expect(RECOMMENDATION_SMALL_TAGS).toHaveLength(84);
    expect(new Set(RECOMMENDATION_SMALL_TAGS)).toHaveLength(84);
  });

  it("separates stable IDs, labels, and emoji", () => {
    expect(RECOMMENDATION_CATEGORY_OPTIONS[0]).toMatchObject({
      id: "education",
      name: "教育",
      emoji: "🏫",
      label: "教育🏫",
    });
    expect(RECOMMENDATION_CATEGORY_OPTIONS[9]).toMatchObject({
      id: "daily-life",
      label: "暮らし🙋",
    });
  });

  it("normalizes only explicit aliases", () => {
    expect(normalizeRecommendationTag("いじめ")).toBe("いじめ対策");
    expect(normalizeRecommendationTag(" 不登校支援 ")).toBe("不登校支援");
    expect(normalizeRecommendationTag("学校")).toBeNull();
  });

  it("derives unique parent category IDs from selected tags", () => {
    expect(
      getParentCategoryIdsForTags(["不登校支援", "学校改築", "防災情報"])
    ).toEqual(["education", "disaster-prevention"]);
  });
});
