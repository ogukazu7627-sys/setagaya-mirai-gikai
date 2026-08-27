import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPublishedBudgetExplorationRows: vi.fn(),
}));

vi.mock("../repositories/budget-exploration-repository", () => mocks);

import type { BudgetExplorationRows } from "../repositories/budget-exploration-repository";
import {
  buildBudgetExplorationData,
  getBudgetExplorationData,
} from "./budget-exploration-service";

const rows: BudgetExplorationRows = {
  activeDataset: {
    id: "11111111-1111-4111-8111-111111111111",
    fiscal_year: 2026,
    budget_type: "initial_budget",
    schema_version: "public-budget-v1",
    currency_unit: "thousand_yen",
    validation_status: "PASS",
    manifest_json: {
      totals: { expenditureTotalAmountThousandYen: 621_033_664 },
    },
  },
  categories: [
    {
      id: "category-education",
      slug: "education",
      name: "教育",
      short_description: "教育分野",
      sort_order: 1,
      status: "published",
    },
    {
      id: "category-welfare",
      slug: "welfare",
      name: "福祉",
      short_description: "福祉分野",
      sort_order: 2,
      status: "published",
    },
    {
      id: "category-draft",
      slug: "draft",
      name: "下書き",
      short_description: "非公開",
      sort_order: 3,
      status: "draft",
    },
  ],
  topics: [
    {
      id: "topic-school",
      slug: "school-facility-aging",
      name: "学校施設の老朽化への対応",
      short_description: "学校施設",
      topic_kind: "problem",
      status: "published",
    },
    {
      id: "topic-review",
      slug: "review-topic",
      name: "レビュー中",
      short_description: "非公開",
      topic_kind: "problem",
      status: "review",
    },
  ],
  topicCategories: [
    {
      topic_id: "topic-school",
      category_id: "category-education",
      relevance_weight: 1,
      is_primary: true,
    },
    {
      topic_id: "topic-school",
      category_id: "category-welfare",
      relevance_weight: 0.5,
      is_primary: false,
    },
  ],
  topicPrograms: [
    {
      topic_id: "topic-school",
      dataset_id: "11111111-1111-4111-8111-111111111111",
      budget_program_identity_id: "bpi_school",
      relation_type: "responds_to",
      review_status: "published",
    },
    {
      topic_id: "topic-school",
      dataset_id: "11111111-1111-4111-8111-111111111111",
      budget_program_identity_id: "bpi_hidden",
      relation_type: "supports",
      review_status: "review",
    },
  ],
  identities: [
    {
      budget_program_identity_id: "bpi_school",
      account_code: "general",
      account_name: "一般会計",
      kan_name: "教育費",
      kou_name: "小学校費",
      moku_name: "学校施設充実費",
      display_program_name: "小学校施設改修工事",
      department_display_name: "教育委員会事務局 教育環境課",
      amount_thousand_yen: 4_140_518,
      is_zero_amount: false,
    },
    {
      budget_program_identity_id: "bpi_hidden",
      account_code: "general",
      account_name: "一般会計",
      kan_name: "教育費",
      kou_name: "小学校費",
      moku_name: "学校施設充実費",
      display_program_name: "非公開候補",
      department_display_name: "教育委員会事務局",
      amount_thousand_yen: 100,
      is_zero_amount: false,
    },
  ],
};

describe("budget-exploration-service", () => {
  beforeEach(() => {
    mocks.findPublishedBudgetExplorationRows.mockReset();
  });

  it("published topicとpublished relationだけを公開モデルにする", () => {
    const result = buildBudgetExplorationData(rows);

    expect(result.categories.map((category) => category.slug)).toEqual([
      "education",
      "welfare",
    ]);
    expect(result.availability).toBe("available");
    expect(result.activeDataset).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      fiscalYear: 2026,
      budgetType: "initial_budget",
      schemaVersion: "public-budget-v1",
      currencyUnit: "thousand_yen",
      validationStatus: "PASS",
      expenditureTotalAmountThousandYen: 621_033_664,
    });
    expect(result.categories[0]?.topics).toHaveLength(1);
    expect(result.categories[0]?.topics[0]?.programs).toEqual([
      expect.objectContaining({
        budgetProgramIdentityId: "bpi_school",
        displayProgramName: "小学校施設改修工事",
        categorySlugs: ["education", "welfare"],
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain("非公開候補");
    expect(JSON.stringify(result)).not.toContain("レビュー中");
  });

  it("active datasetがない場合はtopicを公開せず正しい空状態にする", () => {
    const result = buildBudgetExplorationData({
      ...rows,
      activeDataset: null,
    });

    expect(result.activeDataset).toBeNull();
    expect(result.availability).toBe("no_active_dataset");
    expect(result.categories).toHaveLength(2);
    expect(
      result.categories.every((category) => category.topics.length === 0)
    ).toBe(true);
  });

  it("repository結果をそのまま公開モデル変換へ渡す", async () => {
    mocks.findPublishedBudgetExplorationRows.mockResolvedValue(rows);

    await expect(getBudgetExplorationData()).resolves.toMatchObject({
      activeDataset: { id: rows.activeDataset?.id },
      categories: [{ slug: "education" }, { slug: "welfare" }],
    });
    expect(mocks.findPublishedBudgetExplorationRows).toHaveBeenCalledOnce();
  });
});
