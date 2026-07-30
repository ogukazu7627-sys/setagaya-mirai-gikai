import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findBudgetOverview: vi.fn(),
  findBudgetPrograms: vi.fn(),
  findBudgetProgramDetail: vi.fn(),
  findBudgetOfficialHierarchy: vi.fn(),
  findBudgetRevenueItem: vi.fn(),
}));

vi.mock("../repositories/budget-repository", () => mocks);

import {
  BudgetDataNotFoundError,
  getBudgetOfficialHierarchy,
  getBudgetOverview,
  getBudgetProgramDetail,
  getBudgetRevenueItem,
  searchBudgetPrograms,
} from "./budget-query-service";

const datasetId = "11111111-1111-4111-8111-111111111111";
const manifestSha256 = "a".repeat(64);
const activeDataset = {
  id: datasetId,
  fiscal_year: 2026,
  budget_type: "initial_budget",
  schema_version: "public-budget-v1",
  currency_unit: "thousand_yen",
  manifest_sha256: manifestSha256,
};
const sourceReference = {
  source_type: "official_csv",
  source_file: "source.csv",
  source_row_number: 1,
};

describe("budget-query-service", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  it("active datasetの概要をcamelCaseへ変換する", async () => {
    mocks.findBudgetOverview.mockResolvedValue({
      active_dataset: {
        ...activeDataset,
        validation_status: "PASS",
        activated_at: "2026-07-30T00:00:00.000Z",
      },
      fiscal_year: 2026,
      accounts: [
        {
          account_code: "general",
          account_name: "一般会計",
          expenditure_amount_thousand_yen: 100,
          revenue_amount_thousand_yen: 100,
          identity_count: 1,
        },
      ],
      expenditure_total_amount_thousand_yen: 100,
      revenue_total_amount_thousand_yen: 100,
      identity_count: 1,
    });

    await expect(getBudgetOverview(2026)).resolves.toMatchObject({
      fiscalYear: 2026,
      activeDataset: {
        id: datasetId,
        validationStatus: "PASS",
      },
      accounts: [
        {
          accountCode: "general",
          expenditureAmountThousandYen: 100,
          revenueAmountThousandYen: 100,
        },
      ],
    });
    expect(mocks.findBudgetOverview).toHaveBeenCalledWith(2026);
  });

  it("検索条件の既定値、ページング、0円事業指定をrepositoryへ渡す", async () => {
    mocks.findBudgetPrograms.mockResolvedValue([
      {
        dataset_id: datasetId,
        budget_program_identity_id: "bpi_test",
        fiscal_year: 2026,
        account_code: "general",
        account_name: "一般会計",
        budget_item_key: "2026_general_expenditure_01_01_01",
        kan_code: "01",
        kan_name: "款",
        kou_code: "01",
        kou_name: "項",
        moku_code: "01",
        moku_name: "目",
        display_program_name: "子育て事業",
        department_display_name: "子ども・若者部",
        amount_thousand_yen: 100,
        member_group_count: 1,
        member_program_count: 1,
        related_revenue_count: 0,
        has_public_identity_resolution: false,
        is_zero_amount: false,
        published_topics: [
          {
            slug: "child-rearing-support",
            name: "子育て支援",
          },
        ],
        score: 120,
        matched_field: "display_program_name",
        total_count: 1,
      },
    ]);

    const result = await searchBudgetPrograms({
      query: "  子育て  ",
      includeZeroAmount: true,
      page: 2,
      pageSize: 10,
    });

    expect(mocks.findBudgetPrograms).toHaveBeenCalledWith({
      query: "子育て",
      fiscalYear: null,
      accountCode: null,
      includeZeroAmount: true,
      page: 2,
      pageSize: 10,
    });
    expect(result).toMatchObject({
      total: 1,
      page: 2,
      pageSize: 10,
      items: [
        {
          budgetProgramIdentityId: "bpi_test",
          displayProgramName: "子育て事業",
          amountThousandYen: 100,
          publishedTopics: [
            {
              slug: "child-rearing-support",
              name: "子育て支援",
            },
          ],
        },
      ],
    });
  });

  it("事業詳細を目の節と関連歳入を兄弟データとして返す", async () => {
    mocks.findBudgetProgramDetail.mockResolvedValue(
      createProgramDetailRpcResult()
    );

    const result = await getBudgetProgramDetail("bpi_test", 2026);

    expect(result.identity.budgetProgramIdentityId).toBe("bpi_test");
    expect(result.memberPrograms[0]?.programId).toBe("program_test");
    expect(result.sections[0]).toMatchObject({
      sectionId: "section_test",
      scope: "budget_item",
    });
    expect(result.relatedRevenueDetails[0]).toMatchObject({
      revenueDetailId: "revenue_detail_test",
      amountAttributionStatus: "not_available",
    });
  });

  it("公的階層を1回のrepository呼び出しで返す", async () => {
    mocks.findBudgetOfficialHierarchy.mockResolvedValue({
      active_dataset: activeDataset,
      accounts: [
        {
          account_code: "general",
          account_name: "一般会計",
          amount_thousand_yen: 100,
          kans: [
            {
              code: "01",
              name: "款",
              amount_thousand_yen: 100,
              kous: [
                {
                  code: "01",
                  name: "項",
                  amount_thousand_yen: 100,
                  mokus: [
                    {
                      code: "01",
                      name: "目",
                      budget_item_key: "2026_general_expenditure_01_01_01",
                      amount_thousand_yen: 100,
                      validation_status: "ok",
                      is_zero_amount: false,
                      programs: [
                        {
                          budget_program_identity_id: "bpi_test",
                          display_program_name: "テスト事業",
                          department_display_name: "テスト部",
                          amount_thousand_yen: 100,
                          is_zero_amount: false,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await getBudgetOfficialHierarchy({
      fiscalYear: 2026,
      accountCode: "general",
    });

    expect(result.accounts[0]?.kans[0]?.kous[0]?.mokus[0]).toMatchObject({
      budgetItemKey: "2026_general_expenditure_01_01_01",
      programs: [{ budgetProgramIdentityId: "bpi_test" }],
    });
    expect(mocks.findBudgetOfficialHierarchy).toHaveBeenCalledTimes(1);
  });

  it("歳入の目・節・細節・関連事業を一括で返す", async () => {
    mocks.findBudgetRevenueItem.mockResolvedValue(createRevenueItemRpcResult());

    const result = await getBudgetRevenueItem(
      "2026_general_revenue_01_01_01",
      2026
    );

    expect(result.item.currentAmountThousandYen).toBe(100);
    expect(result.sections).toHaveLength(1);
    expect(result.details[0]?.revenueDetailId).toBe("revenue_detail_test");
    expect(result.relatedExpenditurePrograms[0]).toMatchObject({
      budgetProgramIdentityId: "bpi_test",
      relationCount: 1,
    });
  });

  it("存在しない詳細は型付きnot foundとして扱う", async () => {
    mocks.findBudgetProgramDetail.mockResolvedValue(null);
    mocks.findBudgetRevenueItem.mockResolvedValue(null);

    await expect(getBudgetProgramDetail("missing")).rejects.toEqual(
      new BudgetDataNotFoundError("budget-program-not-found")
    );
    await expect(getBudgetRevenueItem("missing")).rejects.toEqual(
      new BudgetDataNotFoundError("budget-revenue-item-not-found")
    );
  });

  it("PostgreSQL bigintが安全整数外なら応答を拒否する", async () => {
    mocks.findBudgetOverview.mockResolvedValue({
      active_dataset: null,
      fiscal_year: 2026,
      accounts: [],
      expenditure_total_amount_thousand_yen: Number.MAX_SAFE_INTEGER + 1,
      revenue_total_amount_thousand_yen: 0,
      identity_count: 0,
    });

    await expect(getBudgetOverview()).rejects.toThrow(
      "Budget read model returned an invalid response"
    );
  });
});

function createProgramDetailRpcResult() {
  return {
    active_dataset: activeDataset,
    identity: {
      budget_program_identity_id: "bpi_test",
      fiscal_year: 2026,
      account_code: "general",
      account_name: "一般会計",
      budget_side: "expenditure",
      budget_item_key: "2026_general_expenditure_01_01_01",
      kan_code: "01",
      kan_name: "款",
      kou_code: "01",
      kou_name: "項",
      moku_code: "01",
      moku_name: "目",
      display_program_name: "テスト事業",
      department_display_name: "テスト部",
      amount_thousand_yen: 100,
      member_group_count: 1,
      member_program_count: 1,
      related_revenue_count: 1,
      has_public_identity_resolution: false,
      is_zero_amount: false,
      source_type: "derived_public",
    },
    member_programs: [
      {
        program_id: "program_test",
        major_program_name: "大事業",
        budget_program_name: "テスト事業",
        detail_program_name: "内訳",
        department_display_name: "テスト部",
        amount_thousand_yen: 100,
        is_zero_amount: false,
        source_reference: sourceReference,
      },
    ],
    budget_item: {
      budget_item_key: "2026_general_expenditure_01_01_01",
      fiscal_year: 2026,
      account_code: "general",
      account_name: "一般会計",
      budget_side: "expenditure",
      kan_code: "01",
      kan_name: "款",
      kou_code: "01",
      kou_name: "項",
      moku_code: "01",
      moku_name: "目",
      amount_thousand_yen: 100,
      validation_status: "ok",
      is_zero_amount: false,
      data_availability: {},
      source_references: [sourceReference],
    },
    other_programs: [],
    sections: [
      {
        section_id: "section_test",
        setsu_code: "01",
        setsu_name: "節",
        amount_thousand_yen: 100,
        scope: "budget_item",
        source_reference: { source_type: "official_pdf" },
      },
    ],
    related_revenue_details: [
      {
        allocation_link_id: "allocation_test",
        target_resolution_level: "exact_group",
        relation_type: "allocated_to_program",
        amount_attribution_status: "not_available",
        revenue_detail_id: "revenue_detail_test",
        revenue_item_key: "2026_general_revenue_01_01_01",
        account_code: "general",
        account_name: "一般会計",
        kan_code: "01",
        kan_name: "歳入款",
        kou_code: "01",
        kou_name: "歳入項",
        moku_code: "01",
        moku_name: "歳入目",
        setsu_code: "01",
        setsu_name: "歳入節",
        saisetsu_code: "01",
        saisetsu_name: "歳入細節",
        department_display_name: "テスト部",
        source_funding_category_name: "一般財源",
        funding_nature: "general",
        current_amount_thousand_yen: 100,
        source_reference: sourceReference,
        allocation_source_reference: {
          source_type: "official_pdf",
        },
      },
    ],
    source_references: [sourceReference],
  };
}

function createRevenueItemRpcResult() {
  return {
    active_dataset: activeDataset,
    item: {
      revenue_item_key: "2026_general_revenue_01_01_01",
      fiscal_year: 2026,
      account_code: "general",
      account_name: "一般会計",
      budget_side: "revenue",
      kan_code: "01",
      kan_name: "歳入款",
      kou_code: "01",
      kou_name: "歳入項",
      moku_code: "01",
      moku_name: "歳入目",
      previous_amount_thousand_yen: 90,
      current_amount_thousand_yen: 100,
      diff_amount_thousand_yen: 10,
      general_revenue_thousand_yen: 100,
      specific_revenue_thousand_yen: 0,
      special_account_revenue_thousand_yen: 0,
      validation_status: "ok",
      is_zero_amount: false,
      revenue_source_display: {},
      data_availability: {},
      source_references: [sourceReference],
    },
    sections: [
      {
        revenue_section_id: "revenue_section_test",
        setsu_code: "01",
        setsu_name: "歳入節",
        previous_amount_thousand_yen: 90,
        current_amount_thousand_yen: 100,
        diff_amount_thousand_yen: 10,
        detail_count: 1,
        validation_status: "ok",
        source_reference: { source_type: "derived" },
      },
    ],
    details: [
      {
        revenue_detail_id: "revenue_detail_test",
        revenue_section_id: "revenue_section_test",
        setsu_code: "01",
        setsu_name: "歳入節",
        saisetsu_code: "01",
        saisetsu_name: "歳入細節",
        department_display_name: "テスト部",
        source_funding_category_name: "一般財源",
        funding_nature: "general",
        previous_amount_thousand_yen: 90,
        current_amount_thousand_yen: 100,
        diff_amount_thousand_yen: 10,
        is_zero_amount: false,
        related_program_count: 1,
        source_reference: sourceReference,
      },
    ],
    related_expenditure_programs: [
      {
        budget_program_identity_id: "bpi_test",
        budget_item_key: "2026_general_expenditure_01_01_01",
        account_code: "general",
        account_name: "一般会計",
        display_program_name: "テスト事業",
        department_display_name: "テスト部",
        amount_thousand_yen: 100,
        relation_count: 1,
        revenue_detail_ids: ["revenue_detail_test"],
        target_resolution_levels: ["exact_group"],
        source_references: [{ source_type: "official_pdf" }],
      },
    ],
    source_references: [sourceReference],
  };
}
