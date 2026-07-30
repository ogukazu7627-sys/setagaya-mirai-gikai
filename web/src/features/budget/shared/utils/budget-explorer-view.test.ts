import { describe, expect, it } from "vitest";
import type { BudgetExplorationData } from "../types/budget-exploration";
import {
  getBudgetExplorerAnnouncement,
  resolveBudgetExplorerView,
} from "./budget-explorer-view";

const exploration: BudgetExplorationData = {
  activeDatasetId: "dataset",
  availability: "available",
  categories: [
    {
      id: "category",
      slug: "education",
      name: "教育",
      shortDescription: "教育分野",
      sortOrder: 1,
      tone: "cyan",
      topics: [
        {
          id: "topic",
          slug: "school-facility-aging",
          name: "学校施設の老朽化への対応",
          shortDescription: "学校施設",
          topicKind: "problem",
          categorySlugs: ["education"],
          programs: [],
        },
      ],
    },
  ],
};

describe("resolveBudgetExplorerView", () => {
  it("URLなし・category・topicを決定的に復元する", () => {
    expect(
      resolveBudgetExplorerView(exploration, {
        categorySlug: null,
        topicSlug: null,
      }).kind
    ).toBe("overview");
    expect(
      resolveBudgetExplorerView(exploration, {
        categorySlug: "education",
        topicSlug: null,
      }).kind
    ).toBe("category");
    const topicView = resolveBudgetExplorerView(exploration, {
      categorySlug: "education",
      topicSlug: "school-facility-aging",
    });
    expect(topicView.kind).toBe("topic");
    expect(getBudgetExplorerAnnouncement(topicView)).toContain("0件");
  });

  it("不正なcategoryはoverview、不一致topicはcategoryへ安全に戻す", () => {
    expect(
      resolveBudgetExplorerView(exploration, {
        categorySlug: "unknown",
        topicSlug: "school-facility-aging",
      }).kind
    ).toBe("overview");
    expect(
      resolveBudgetExplorerView(exploration, {
        categorySlug: "education",
        topicSlug: "unknown",
      }).kind
    ).toBe("category");
  });
});
