import { describe, expect, it } from "vitest";
import { getBudgetCategoryCoreLabelLayout } from "./budget-category-core-label";

describe("getBudgetCategoryCoreLabelLayout", () => {
  it.each([
    ["culture-sports", "culture-sports"],
    ["urban-development", "urban-development"],
    ["education", "default"],
  ] as const)("%s の中心表示を %s にする", (categorySlug, expected) => {
    expect(getBudgetCategoryCoreLabelLayout(categorySlug)).toBe(expected);
  });
});
