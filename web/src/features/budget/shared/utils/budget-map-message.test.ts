import { describe, expect, it } from "vitest";
import { TEST_ACTIVE_BUDGET_DATASET } from "../test-data/education-school-aging-exploration";
import type { BudgetExplorationData } from "../types/budget-exploration";
import {
  createBudgetMapHostMessage,
  createBudgetMapMessage,
  parseBudgetMapHostMessage,
  parseBudgetMapMessage,
  resolveBudgetMapViewReference,
} from "./budget-map-message";

const exploration: BudgetExplorationData = {
  activeDataset: TEST_ACTIVE_BUDGET_DATASET,
  availability: "available",
  categories: [
    {
      id: "category-education",
      slug: "education",
      name: "教育",
      shortDescription: "教育分野",
      sortOrder: 1,
      tone: "cyan",
      topics: [
        {
          id: "topic-school-aging",
          slug: "school-facility-aging",
          name: "学校施設の老朽化への対応",
          shortDescription: "学校施設を維持・改修する取組",
          topicKind: "problem",
          categorySlugs: ["education"],
          programs: [
            {
              budgetProgramIdentityId: "bpi_school",
              displayProgramName: "小学校施設改修工事",
              accountCode: "general",
              accountName: "一般会計",
              kanName: "教育費",
              kouName: "小学校費",
              mokuName: "学校施設費",
              departmentDisplayName: "教育環境課",
              amountThousandYen: 100,
              isZeroAmount: false,
              relationType: "responds_to",
              categorySlugs: ["education"],
            },
          ],
        },
      ],
    },
  ],
};

describe("budget map message", () => {
  it("許可した操作だけを復元する", () => {
    const message = createBudgetMapMessage(
      {
        action: "select-topic",
        categorySlug: "education",
        topicSlug: "school-facility-aging",
      },
      TEST_ACTIVE_BUDGET_DATASET.id
    );

    expect(parseBudgetMapMessage(message)).toEqual({
      action: "select-topic",
      categorySlug: "education",
      topicSlug: "school-facility-aging",
      activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
    });
  });

  it.each([
    null,
    {},
    {
      source: "another-frame",
      version: 1,
      action: "select-category",
      categorySlug: "education",
    },
    {
      source: "mirai-gikai-budget-map",
      version: 2,
      action: "back",
    },
    {
      source: "mirai-gikai-budget-map",
      version: 1,
      action: "select-category",
      categorySlug: "https://example.com",
    },
    {
      source: "mirai-gikai-budget-map",
      version: 1,
      action: "select-program",
      budgetProgramIdentityId: "../admin",
    },
    {
      source: "mirai-gikai-budget-map",
      version: 1,
      action: "navigate",
      href: "https://example.com",
    },
  ])("不正または未定義のメッセージを拒否する", (message) => {
    expect(parseBudgetMapMessage(message)).toBeNull();
  });

  it("親のtransitioning状態をIDだけの同期messageへ変換して復元する", () => {
    const category = exploration.categories[0];
    const topic = category?.topics[0];
    if (!category || !topic) {
      throw new Error("topic fixture is missing");
    }
    const message = createBudgetMapHostMessage(
      {
        kind: "transitioning",
        current: { kind: "category", category },
        target: { kind: "topic", category, topic },
      },
      TEST_ACTIVE_BUDGET_DATASET.id
    );
    const parsed = parseBudgetMapHostMessage(message);

    expect(parsed).toEqual({
      activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
      view: {
        kind: "transitioning",
        current: { kind: "category", categorySlug: "education" },
        target: {
          kind: "topic",
          categorySlug: "education",
          topicSlug: "school-facility-aging",
        },
      },
    });
    expect(
      parsed ? resolveBudgetMapViewReference(exploration, parsed.view) : null
    ).toEqual({
      kind: "transitioning",
      current: { kind: "category", category },
      target: { kind: "topic", category, topic },
    });
  });

  it("未知ID・任意URL・異なるsourceの親同期messageを拒否する", () => {
    expect(
      parseBudgetMapHostMessage({
        source: "another-host",
        version: 2,
        action: "sync-view",
        activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
        view: { kind: "overview" },
      })
    ).toBeNull();
    expect(
      parseBudgetMapHostMessage({
        source: "mirai-gikai-budget-host",
        version: 2,
        action: "sync-view",
        activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
        view: {
          kind: "category",
          categorySlug: "https://example.com",
        },
      })
    ).toBeNull();

    const unknownReference = parseBudgetMapHostMessage({
      source: "mirai-gikai-budget-host",
      version: 2,
      action: "sync-view",
      activeDatasetId: TEST_ACTIVE_BUDGET_DATASET.id,
      view: {
        kind: "topic",
        categorySlug: "education",
        topicSlug: "unknown-topic",
      },
    });
    expect(unknownReference).not.toBeNull();
    expect(
      unknownReference
        ? resolveBudgetMapViewReference(exploration, unknownReference.view)
        : null
    ).toBeNull();
  });
});
