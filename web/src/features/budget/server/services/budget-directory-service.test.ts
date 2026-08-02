import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  BudgetProgramDirectoryRows,
  BudgetRevenueDirectoryRows,
} from "../repositories/budget-repository";
import {
  getBudgetProgramDirectory,
  getBudgetRevenueDirectory,
} from "./budget-directory-service";

const mocks = vi.hoisted(() => ({
  findBudgetProgramDirectoryRows: vi.fn(),
  findBudgetRevenueDirectoryRows: vi.fn(),
}));

vi.mock("../repositories/budget-repository", () => ({
  findBudgetProgramDirectoryRows: mocks.findBudgetProgramDirectoryRows,
  findBudgetRevenueDirectoryRows: mocks.findBudgetRevenueDirectoryRows,
}));

const activeDataset = {
  id: "11111111-1111-4111-8111-111111111111",
  fiscal_year: 2026,
  budget_type: "initial_budget",
  schema_version: "public-budget-v1",
  currency_unit: "thousand_yen",
  manifest_sha256: "a".repeat(64),
  validation_status: "PASS",
  activated_at: "2026-07-31T00:00:00.000Z",
};

describe("budget directory service", () => {
  afterEach(() => {
    mocks.findBudgetProgramDirectoryRows.mockReset();
    mocks.findBudgetRevenueDirectoryRows.mockReset();
  });

  it("0円を除く既定条件でidentityとmember programを構築する", async () => {
    mocks.findBudgetProgramDirectoryRows.mockResolvedValue(createProgramRows());

    const result = await getBudgetProgramDirectory({
      accountCode: "general",
      kanCode: "08",
      page: 2,
      sort: "name_asc",
    });

    expect(mocks.findBudgetProgramDirectoryRows).toHaveBeenCalledWith({
      fiscalYear: 2026,
      accountCode: "general",
      kanCode: "08",
      kouCode: null,
      mokuCode: null,
      includeZeroAmount: false,
      sort: "name_asc",
      page: 2,
      pageSize: 24,
    });
    expect(result).toMatchObject({
      status: "ready",
      total: 1113,
      activeDataset: { fiscalYear: 2026, validationStatus: "PASS" },
      items: [
        {
          identity: {
            budgetProgramIdentityId: "bpi_school",
            displayProgramName: "小学校施設改修工事",
            amountThousandYen: 4_140_518,
          },
          memberPrograms: [
            {
              programId: "program_school",
              detailProgramName: "小学校施設改修工事",
            },
          ],
        },
      ],
    });
  });

  it("active datasetがない場合は公開済み件数を捏造しない", async () => {
    mocks.findBudgetProgramDirectoryRows.mockResolvedValue({
      activeDataset: null,
      hierarchy: [],
      identities: [],
      memberPrograms: [],
      total: 0,
    } satisfies BudgetProgramDirectoryRows);

    await expect(getBudgetProgramDirectory()).resolves.toMatchObject({
      status: "empty",
      activeDataset: null,
      total: 0,
      items: [],
    });
  });

  it("歳入の節・細節と金額なしのallocation関係を目ごとにまとめる", async () => {
    mocks.findBudgetRevenueDirectoryRows.mockResolvedValue(createRevenueRows());

    const result = await getBudgetRevenueDirectory({
      includeZeroAmount: true,
    });

    expect(mocks.findBudgetRevenueDirectoryRows).toHaveBeenCalledWith(
      expect.objectContaining({
        fiscalYear: 2026,
        includeZeroAmount: true,
        pageSize: 10,
      })
    );
    expect(result.items[0]).toMatchObject({
      item: {
        revenueItemKey: "2026_general_revenue_12_01_01",
        currentAmountThousandYen: 100,
        generalRevenueThousandYen: 40,
        specificRevenueThousandYen: 60,
      },
      sections: [
        {
          revenueSectionId: "rs_test",
          currentAmountThousandYen: 100,
        },
      ],
      details: [
        {
          revenueDetailId: "rd_test",
          departmentDisplayName: "教育委員会事務局 教育環境課",
        },
      ],
      relatedExpenditurePrograms: [
        {
          budgetProgramIdentityId: "bpi_school",
          relationCount: 1,
          revenueDetailIds: ["rd_test"],
          targetResolutionLevels: ["public_identity"],
        },
      ],
    });
  });
});

function createProgramRows(): BudgetProgramDirectoryRows {
  return {
    activeDataset,
    hierarchy: [
      {
        budget_item_key: "2026_general_expenditure_08_02_03",
        account_code: "general",
        account_name: "一般会計",
        kan_code: "08",
        kan_name: "教育費",
        kou_code: "02",
        kou_name: "小学校費",
        moku_code: "03",
        moku_name: "学校施設充実費",
      },
    ],
    identities: [
      {
        budget_program_identity_id: "bpi_school",
        fiscal_year: 2026,
        account_code: "general",
        account_name: "一般会計",
        budget_side: "expenditure",
        budget_item_key: "2026_general_expenditure_08_02_03",
        kan_code: "08",
        kan_name: "教育費",
        kou_code: "02",
        kou_name: "小学校費",
        moku_code: "03",
        moku_name: "学校施設充実費",
        display_program_name: "小学校施設改修工事",
        department_display_name: "教育委員会事務局 教育環境課",
        amount_thousand_yen: 4_140_518,
        member_group_count: 1,
        member_program_count: 1,
        related_revenue_count: 0,
        has_public_identity_resolution: false,
        is_zero_amount: false,
        source_type: "derived_public",
      },
    ],
    memberPrograms: [
      {
        program_id: "program_school",
        budget_program_identity_id: "bpi_school",
        major_program_name: "学校施設整備",
        budget_program_name: "小学校施設改修工事",
        detail_program_name: "小学校施設改修工事",
        department_display_name: "教育委員会事務局 教育環境課",
        amount_thousand_yen: 4_140_518,
        is_zero_amount: false,
        source_type: "official_csv",
        source_file: "ippansaisyutu.csv",
        source_row_number: 1,
      },
    ],
    total: 1113,
  };
}

function createRevenueRows(): BudgetRevenueDirectoryRows {
  const revenueItem = {
    dataset_id: activeDataset.id,
    revenue_item_key: "2026_general_revenue_12_01_01",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    budget_side: "revenue",
    kan_code: "12",
    kan_name: "分担金及負担金",
    kou_code: "01",
    kou_name: "負担金",
    moku_code: "01",
    moku_name: "福祉費負担金",
    previous_amount_thousand_yen: 90,
    current_amount_thousand_yen: 100,
    diff_amount_thousand_yen: 10,
    general_revenue_thousand_yen: 40,
    specific_revenue_thousand_yen: 60,
    special_account_revenue_thousand_yen: 0,
    validation_status: "ok",
    is_zero_amount: false,
    revenue_source_display: {},
    data_availability: {},
    source_references: [],
  };
  return {
    activeDataset,
    hierarchy: [
      {
        revenue_item_key: revenueItem.revenue_item_key,
        account_code: revenueItem.account_code,
        account_name: revenueItem.account_name,
        kan_code: revenueItem.kan_code,
        kan_name: revenueItem.kan_name,
        kou_code: revenueItem.kou_code,
        kou_name: revenueItem.kou_name,
        moku_code: revenueItem.moku_code,
        moku_name: revenueItem.moku_name,
      },
    ],
    items: [revenueItem],
    sections: [
      {
        dataset_id: activeDataset.id,
        revenue_section_id: "rs_test",
        revenue_item_key: revenueItem.revenue_item_key,
        setsu_code: "01",
        setsu_name: "負担金",
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
        dataset_id: activeDataset.id,
        revenue_detail_id: "rd_test",
        revenue_section_id: "rs_test",
        revenue_item_key: revenueItem.revenue_item_key,
        fiscal_year: 2026,
        account_code: "general",
        account_name: "一般会計",
        budget_side: "revenue",
        kan_code: "12",
        kan_name: "分担金及負担金",
        kou_code: "01",
        kou_name: "負担金",
        moku_code: "01",
        moku_name: "福祉費負担金",
        setsu_code: "01",
        setsu_name: "負担金",
        saisetsu_code: "01",
        saisetsu_name: "施設整備負担金",
        department_display_name: "教育委員会事務局 教育環境課",
        source_funding_category_name: "特定財源",
        funding_nature: "specific",
        previous_amount_thousand_yen: 90,
        current_amount_thousand_yen: 100,
        diff_amount_thousand_yen: 10,
        is_zero_amount: false,
        related_program_count: 1,
        source_type: "official_csv",
        source_file: "ippansainyu.csv",
        source_row_number: 1,
      },
    ],
    allocations: [
      {
        allocation_link_id: "allocation_test",
        revenue_detail_id: "rd_test",
        target_budget_program_identity_id: "bpi_school",
        target_budget_item_key: "2026_general_expenditure_08_02_03",
        target_resolution_level: "public_identity",
        relation_type: "allocated_to_program",
        amount_attribution_status: "not_available",
        source_reference: { source_type: "official_pdf" },
      },
    ],
    identities: [
      {
        budget_program_identity_id: "bpi_school",
        budget_item_key: "2026_general_expenditure_08_02_03",
        account_code: "general",
        account_name: "一般会計",
        display_program_name: "小学校施設改修工事",
        department_display_name: "教育委員会事務局 教育環境課",
        amount_thousand_yen: 4_140_518,
      },
    ],
    total: 175,
  };
}
