import { describe, expect, it } from "vitest";
import {
  BUDGET_REVENUE_AI_CONSTRAINTS,
  PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS,
  buildBudgetRevenueAiContext,
  classifyBudgetRevenueQuestionAvailability,
  getPublicBudgetRevenueItemDetail,
  getRelatedExpenditurePrograms,
  getRelatedRevenuesForBudgetProgram,
  searchPublicBudgetRevenues,
  serializePublicBudgetRevenueDetails,
  validatePublicBudgetRevenueDetailCsv,
  type PublicBudgetRevenueAllocation,
  type PublicBudgetRevenueDetail,
  type PublicBudgetRevenueItem,
} from "./public-budget-revenue";

function makeDetail(
  values: Partial<PublicBudgetRevenueDetail> = {},
): PublicBudgetRevenueDetail {
  return {
    revenue_detail_id: "revenue_detail_1",
    revenue_section_id: "revenue_section_1",
    revenue_item_key: "2026_general_revenue_01_01_01",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    kan_code: "01",
    kan_name: "款",
    kou_code: "01",
    kou_name: "項",
    moku_code: "01",
    moku_name: "目",
    setsu_code: "01",
    setsu_name: "節",
    saisetsu_code: "01",
    saisetsu_name: "検索対象歳入",
    department_display_name: "財務部 納税課",
    source_funding_category_name: "一般財源",
    funding_nature: "general",
    previous_amount_thousand_yen: 90,
    current_amount_thousand_yen: 100,
    diff_amount_thousand_yen: 10,
    is_zero_amount: false,
    related_program_count: 1,
    source_file: "ippansainyu.csv",
    source_row_number: 1,
    ...values,
  };
}

function makeAllocation(
  values: Partial<PublicBudgetRevenueAllocation> = {},
): PublicBudgetRevenueAllocation {
  return {
    allocationLinkId: "allocation_1",
    revenueDetailId: "revenue_detail_1",
    targetBudgetProgramGroupId: "group_1",
    targetBudgetProgramIdentityId: "identity_1",
    targetBudgetItemKey: "2026_general_expenditure_01_01_01",
    targetAccountCode: "general",
    targetProgramName: "対象事業",
    targetBudgetBookPage: 311,
    targetResolutionLevel: "exact_group",
    candidateTargetGroupCount: 1,
    relationType: "allocated_to_program",
    allocationAmountThousandYen: null,
    amountAttributionStatus: "not_available",
    sourceReference: {
      sourceType: "official_pdf",
      sourceFile: "r8tousyoyosanallpage.pdf",
      pdfPage: 37,
      budgetBookPage: 67,
    },
    ...values,
  };
}

function makeItem(): PublicBudgetRevenueItem {
  return {
    revenueItemKey: "2026_general_revenue_01_01_01",
    fiscalYear: 2026,
    accountCode: "general",
    accountName: "一般会計",
    kan: { code: "01", name: "款" },
    kou: { code: "01", name: "項" },
    moku: { code: "01", name: "目" },
    previousAmountThousandYen: 90,
    currentAmountThousandYen: 100,
    diffAmountThousandYen: 10,
    revenueComposition: {
      generalRevenueThousandYen: 100,
      specificRevenueThousandYen: 0,
      specialAccountRevenueThousandYen: 0,
    },
    revenueSourceDisplay: {
      mode: "general_and_specific",
      entries: [
        { label: "一般財源", amountThousandYen: 100 },
        { label: "特定財源", amountThousandYen: 0 },
      ],
    },
    sections: [],
    details: [],
    dataAvailability: {
      actualRevenue: "not_available",
      settlement: "not_available",
      allocationAmounts: "not_available",
    },
    sourceReferences: [{ sourceType: "derived" }],
  };
}

describe("public budget revenue APIs", () => {
  it("公開CSVは許可26列だけを指定順で出力する", () => {
    const csv = serializePublicBudgetRevenueDetails([makeDetail()]);

    expect(() =>
      validatePublicBudgetRevenueDetailCsv(csv),
    ).not.toThrow();
    expect(csv.split("\n")[0].split(",")).toEqual(
      PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS,
    );
    expect(csv).not.toContain("requested_amount_thousand_yen");
    expect(csv).not.toContain("department_name");
    expect(csv).not.toContain("allocation_amount");
  });

  it("0円歳入を保持し通常検索だけ除外する", () => {
    const zero = makeDetail({
      revenue_detail_id: "zero_detail",
      saisetsu_name: "0円歳入",
      previous_amount_thousand_yen: 0,
      current_amount_thousand_yen: 0,
      diff_amount_thousand_yen: 0,
      is_zero_amount: true,
      related_program_count: 0,
    });

    expect(
      searchPublicBudgetRevenues("0円歳入", { details: [zero] }),
    ).toEqual([]);
    expect(
      searchPublicBudgetRevenues("0円歳入", {
        details: [zero],
        includeZeroAmount: true,
      }),
    ).toEqual([zero]);
  });

  it("目詳細と歳入から歳出への関係を取得する", () => {
    const item = makeItem();
    const allocation = makeAllocation();

    expect(
      getPublicBudgetRevenueItemDetail(item.revenueItemKey, [item]),
    ).toBe(item);
    expect(
      getRelatedExpenditurePrograms("revenue_detail_1", [
        allocation,
      ]),
    ).toEqual([allocation]);
  });

  it("歳出groupからはexact_groupだけを逆引きする", () => {
    const detail = makeDetail();
    const exact = makeAllocation();
    const publicIdentity = makeAllocation({
      allocationLinkId: "allocation_2",
      targetBudgetProgramGroupId: null,
      targetBudgetProgramIdentityId: "identity_public",
      targetResolutionLevel: "public_identity",
      candidateTargetGroupCount: 2,
    });

    expect(
      getRelatedRevenuesForBudgetProgram(
        "group_1",
        [exact, publicIdentity],
        [detail],
      ),
    ).toEqual([{ revenue: detail, relation: exact }]);
    expect(
      getRelatedRevenuesForBudgetProgram(
        "candidate_group",
        [publicIdentity],
        [detail],
      ),
    ).toEqual([]);
  });
});

describe("budget revenue AI restrictions", () => {
  it.each([
    [
      "実際に収入された金額はいくらですか",
      "ACTUAL_REVENUE_NOT_AVAILABLE",
    ],
    ["歳入の決算額を教えて", "REVENUE_SETTLEMENT_NOT_AVAILABLE"],
    [
      "この事業にいくら充当されますか",
      "REVENUE_ALLOCATION_AMOUNT_NOT_AVAILABLE",
    ],
    ["契約額はいくらですか", "CONTRACT_DATA_NOT_AVAILABLE"],
    ["どこの会社が事業者ですか", "VENDOR_DATA_NOT_AVAILABLE"],
  ] as const)(
    "回答不能質問「%s」にreason codeを返す",
    (query, reasonCode) => {
      expect(
        classifyBudgetRevenueQuestionAvailability(query),
      ).toBe(reasonCode);
      expect(
        buildBudgetRevenueAiContext({
          query,
          revenueDetails: [],
          revenueItems: [],
          allocations: [],
        }),
      ).toEqual({
        answerable: false,
        reasonCode,
        message: expect.any(String),
      });
    },
  );

  it("回答可能コンテキストへ4つの制約文を固定する", () => {
    const detail = makeDetail();
    const item = makeItem();
    const allocation = makeAllocation();
    const result = buildBudgetRevenueAiContext({
      query: "一般会計の特定財源を教えてください",
      revenueDetails: [detail],
      revenueItems: [item],
      allocations: [allocation],
    });

    expect(result.answerable).toBe(true);
    if (result.answerable) {
      expect(result.context.constraints).toEqual(
        BUDGET_REVENUE_AI_CONSTRAINTS,
      );
      expect(result.context.revenueDetails).toEqual([detail]);
      expect(result.context.allocations).toEqual([allocation]);
    }
  });
});
