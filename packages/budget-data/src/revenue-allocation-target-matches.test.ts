import { describe, expect, it } from "vitest";
import type { BudgetAccountsConfig } from "./budget-accounts";
import type { BudgetProgramGroup } from "./budget-program-groups";
import type { RevenueAllocationSourceMatch } from "./revenue-allocation-source-matches";
import {
  type RevenueAllocationTargetOverride,
  determineTargetAccount,
  normalizeTargetProgramName,
  serializeBudgetRevenueAllocations,
  serializeRevenueAllocationTargetOverrides,
  transformRevenueAllocationTargets,
  validateRevenueAllocationTargets,
  validateSerializedBudgetRevenueAllocations,
  validateSerializedRevenueAllocationTargetOverrides,
} from "./revenue-allocation-target-matches";

const config: BudgetAccountsConfig = {
  fiscal_year: 2026,
  accounts: [
    {
      account_code: "general",
      account_name: "一般会計",
      account_type: "general",
      budget_side: "expenditure",
      csv_account_name: "一般会計",
      expected_amount_thousand_yen: 100,
      pdf_budget_book_start_page: 310,
      pdf_budget_book_end_page: 479,
      pdf_page_start: 159,
      pdf_page_end: 243,
      status: "active",
    },
    {
      account_code: "national_health_insurance",
      account_name: "国民健康保険事業会計",
      account_type: "special",
      budget_side: "expenditure",
      csv_account_name: "国民健康保険事業会計",
      expected_amount_thousand_yen: 100,
      pdf_budget_book_start_page: 590,
      pdf_budget_book_end_page: 621,
      pdf_page_start: 299,
      pdf_page_end: 314,
      status: "active",
    },
  ],
};

function makeSource(
  values: Partial<RevenueAllocationSourceMatch> = {},
): RevenueAllocationSourceMatch {
  return {
    raw_allocation_id: "ra_2026_general_001_001",
    source_file: "budget.pdf",
    pdf_page: "1",
    budget_book_page: "67",
    fiscal_year: "2026",
    account_code: "general",
    account_name: "一般会計",
    kan_code: "11",
    kan_name: "款",
    kou_code: "01",
    kou_name: "項",
    moku_code: "01",
    moku_name: "目",
    setsu_code: "01",
    setsu_name: "節",
    saisetsu_code: "01",
    pdf_revenue_detail_name: "細節",
    pdf_department_name: "財務部",
    pdf_revenue_amount_thousand_yen: "100",
    allocation_sequence: "1",
    pdf_target_program_name: "対象事業",
    target_budget_book_page: "311",
    raw_text: "raw",
    parse_status: "parsed",
    parse_note: "",
    revenue_detail_id:
      "rd_2026_general_revenue_11_01_01_01_01_001",
    source_match_status: "matched",
    source_match_method: "hierarchy_code_amount",
    source_match_note: "matched",
    ...values,
  };
}

function makeGroup(
  values: Partial<BudgetProgramGroup> = {},
): BudgetProgramGroup {
  return {
    budget_program_group_id:
      "2026_general_expenditure_01_01_01_01_01",
    budget_item_key: "2026_general_expenditure_01_01_01",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    major_program_name: "大事業",
    budget_program_name: "対象事業",
    department_name: "財務部＊課税課",
    total_amount_thousand_yen: 100,
    member_program_count: 1,
    candidate_budget_book_pages: "311",
    source_type: "derived",
    department_display_name_for_matching: "財務部 課税課",
    ...values,
  };
}

function makeOverride(
  values: Partial<RevenueAllocationTargetOverride> = {},
): RevenueAllocationTargetOverride {
  return {
    raw_allocation_id: "ra_2026_general_001_001",
    revenue_detail_id:
      "rd_2026_general_revenue_11_01_01_01_01_001",
    target_budget_book_page: "311",
    target_account_code: "general",
    pdf_target_program_name: "対象事業",
    pdf_department_name: "財務部",
    candidate_budget_program_group_ids: "",
    candidate_budget_item_keys: "",
    candidate_budget_program_names: "",
    candidate_department_names: "",
    candidate_budget_book_pages: "",
    selected_budget_program_group_id: "",
    override_note: "",
    ...values,
  };
}

describe("target accountと名称正規化", () => {
  it("source会計ではなくtargetページから会計を決める", () => {
    expect(determineTargetAccount(311, config).account_code).toBe(
      "general",
    );
    expect(determineTargetAccount(590, config).account_code).toBe(
      "national_health_insurance",
    );
  });

  it("NFKCと許可した記号・空白だけを正規化する", () => {
    expect(normalizeTargetProgramName(" ＤＸ 推進（本部） ")).toBe(
      "DX推進(本部)",
    );
    expect(normalizeTargetProgramName("事業Ａ")).not.toBe(
      normalizeTargetProgramName("事業a"),
    );
  });
});

describe("transformRevenueAllocationTargets", () => {
  it("ページと完全名称で一意に接続する", () => {
    const source = makeSource();
    const group = makeGroup();
    const result = transformRevenueAllocationTargets(
      [source],
      [group],
      config,
    );

    expect(result.allocations[0]).toMatchObject({
      target_budget_program_group_id:
        group.budget_program_group_id,
      target_budget_item_key: group.budget_item_key,
      target_account_code: "general",
      target_match_status: "matched",
      target_match_method: "page_and_exact_name",
      amount_attribution_status: "not_available",
      allocation_amount_thousand_yen: "",
    });
  });

  it("sourceとtargetの会計が異なってもtargetページを優先する", () => {
    const result = transformRevenueAllocationTargets(
      [
        makeSource({
          account_code: "national_health_insurance",
          account_name: "国民健康保険事業会計",
        }),
      ],
      [makeGroup()],
      config,
    );

    expect(result.decisions[0]).toMatchObject({
      sourceAccountCode: "national_health_insurance",
      targetAccountCode: "general",
      status: "matched",
    });
  });

  it("全角英字・括弧の表記差をnormalized nameで接続する", () => {
    const result = transformRevenueAllocationTargets(
      [makeSource({ pdf_target_program_name: "DX推進(本部)" })],
      [
        makeGroup({
          budget_program_name: "ＤＸ推進（本部）",
        }),
      ],
      config,
    );

    expect(result.allocations[0].target_match_method).toBe(
      "page_and_normalized_name",
    );
  });

  it("同名ならtargetページに最も近いgroupを選ぶ", () => {
    const farther = makeGroup({
      budget_program_group_id: "group_farther",
      candidate_budget_book_pages: "311",
    });
    const nearest = makeGroup({
      budget_program_group_id: "group_nearest",
      budget_item_key: "item_nearest",
      candidate_budget_book_pages: "313",
    });
    const result = transformRevenueAllocationTargets(
      [makeSource({ target_budget_book_page: "313" })],
      [farther, nearest],
      config,
    );

    expect(
      result.allocations[0].target_budget_program_group_id,
    ).toBe("group_nearest");
  });

  it("同ページ・同名候補を部署名で一意化する", () => {
    const finance = makeGroup({
      budget_program_group_id: "group_finance",
      department_name: "財務部＊課税課",
      department_display_name_for_matching: "財務部 課税課",
    });
    const policy = makeGroup({
      budget_program_group_id: "group_policy",
      budget_item_key: "item_policy",
      department_name: "政策経営部＊政策企画課",
      department_display_name_for_matching:
        "政策経営部 政策企画課",
    });
    const result = transformRevenueAllocationTargets(
      [makeSource({ pdf_department_name: "政策経営部" })],
      [finance, policy],
      config,
    );

    expect(result.allocations[0]).toMatchObject({
      target_budget_program_group_id: "group_policy",
      target_match_method: "page_name_department",
    });
  });

  it("同ページ・同名・同部署が複数ならambiguousを保持する", () => {
    const result = transformRevenueAllocationTargets(
      [makeSource()],
      [
        makeGroup({ budget_program_group_id: "group_a" }),
        makeGroup({
          budget_program_group_id: "group_b",
          budget_item_key: "item_b",
        }),
      ],
      config,
    );

    expect(result.allocations[0]).toMatchObject({
      target_budget_program_group_id: "",
      target_match_status: "ambiguous",
      target_match_method: "",
      allocation_amount_thousand_yen: "",
    });
    expect(result.overrideRows).toHaveLength(1);
    expect(
      result.overrideRows[0].candidate_budget_program_group_ids,
    ).toBe("group_a|group_b");
  });

  it("名称候補がなければunmatchedにする", () => {
    const result = transformRevenueAllocationTargets(
      [makeSource({ pdf_target_program_name: "存在しない事業" })],
      [makeGroup()],
      config,
    );
    expect(result.allocations[0].target_match_status).toBe(
      "unmatched",
    );
    expect(result.overrideRows).toHaveLength(1);
  });

  it("ページ・会計候補内の手動補正だけを受け付ける", () => {
    const group = makeGroup();
    const result = transformRevenueAllocationTargets(
      [makeSource({ pdf_target_program_name: "別名" })],
      [group],
      config,
      [
        makeOverride({
          selected_budget_program_group_id:
            group.budget_program_group_id,
          override_note: "公式資料で確認",
        }),
      ],
    );
    expect(result.allocations[0]).toMatchObject({
      target_match_status: "manually_confirmed",
      target_match_method: "manual_override",
      review_note: "公式資料で確認",
    });
  });

  it("対象ページ候補外への手動補正を拒否する", () => {
    const group = makeGroup({
      candidate_budget_book_pages: "401",
    });
    expect(() =>
      transformRevenueAllocationTargets(
        [makeSource()],
        [group],
        config,
        [
          makeOverride({
            selected_budget_program_group_id:
              group.budget_program_group_id,
          }),
        ],
      ),
    ).toThrow("対象ページ・会計の候補外");
  });
});

describe("relation tableの安全検証", () => {
  it("金額を持たず、IDと入力由来列を検証して直列化できる", () => {
    const source = makeSource();
    const group = makeGroup();
    const result = transformRevenueAllocationTargets(
      [source],
      [group],
      config,
    );
    const validation = validateRevenueAllocationTargets(
      [source],
      [group],
      result,
    );
    const allocationsCsv = serializeBudgetRevenueAllocations(
      result.allocations,
    );
    const overridesCsv =
      serializeRevenueAllocationTargetOverrides(result.overrideRows);

    expect(validation.structuralPass).toBe(true);
    expect(validation.isPass).toBe(true);
    expect(validation.nonBlankAllocationAmountCount).toBe(0);
    expect(validation.duplicateRevenueTargetPairCount).toBe(0);
    expect(() =>
      validateSerializedBudgetRevenueAllocations(
        allocationsCsv,
        result.allocations,
      ),
    ).not.toThrow();
    expect(() =>
      validateSerializedRevenueAllocationTargetOverrides(
        overridesCsv,
        result.overrideRows,
      ),
    ).not.toThrow();
  });
});
