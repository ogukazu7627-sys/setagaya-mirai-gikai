import { describe, expect, it } from "vitest";
import {
  type BudgetProgramIdentitySourceGroup,
  transformBudgetProgramIdentities,
} from "./budget-program-identities";
import {
  type IdentityResolvedBudgetRevenueAllocation,
  parseBudgetRevenueAllocationsForIdentityResolution,
  resolveRevenueAllocationIdentities,
  serializeIdentityResolvedBudgetRevenueAllocations,
  serializeRevenueAllocationGroupAmbiguities,
  validateRevenueAllocationIdentityResolution,
  validateSerializedIdentityResolvedAllocations,
  validateSerializedRevenueAllocationGroupAmbiguities,
} from "./revenue-allocation-identity-resolution";
import {
  type BudgetRevenueAllocation,
  type RevenueAllocationTargetOverride,
  serializeBudgetRevenueAllocations,
} from "./revenue-allocation-target-matches";

function makeGroup(
  values: Partial<BudgetProgramIdentitySourceGroup> = {},
): BudgetProgramIdentitySourceGroup {
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
    ...values,
  };
}

function makeAllocation(
  values: Partial<IdentityResolvedBudgetRevenueAllocation> = {},
): IdentityResolvedBudgetRevenueAllocation {
  return {
    allocation_link_id: "ral_2026_general_001_001",
    revenue_detail_id:
      "rd_2026_general_revenue_11_01_01_01_01_001",
    target_budget_program_group_id: "",
    target_budget_item_key: "",
    target_account_code: "general",
    pdf_target_program_name: "対象事業",
    matched_budget_program_name: "",
    target_budget_book_page: "311",
    source_pdf_page: "1",
    source_budget_book_page: "67",
    target_match_status: "ambiguous",
    target_match_method: "",
    amount_attribution_status: "not_available",
    allocation_amount_thousand_yen: "",
    source_file: "budget.pdf",
    raw_text: "raw",
    review_note: "multiple_candidates",
    target_budget_program_identity_id: "",
    target_resolution_level: "",
    target_group_resolution_status: "",
    candidate_target_group_count: "",
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
    candidate_budget_program_group_ids:
      "2026_general_expenditure_01_01_01_01_01|" +
      "2026_general_expenditure_01_01_01_01_02",
    candidate_budget_item_keys:
      "2026_general_expenditure_01_01_01|" +
      "2026_general_expenditure_01_01_01",
    candidate_budget_program_names: "対象事業|対象事業",
    candidate_department_names:
      "財務部＊課税課|財務部＊課税課",
    candidate_budget_book_pages: "311|311",
    selected_budget_program_group_id: "",
    override_note: "multiple_candidates",
    ...values,
  };
}

const groups = [
  makeGroup(),
  makeGroup({
    budget_program_group_id:
      "2026_general_expenditure_01_01_01_01_02",
    total_amount_thousand_yen: 50,
  }),
  makeGroup({
    budget_program_group_id:
      "2026_general_expenditure_01_01_02_01_01",
    budget_item_key: "2026_general_expenditure_01_01_02",
    budget_program_name: "別事業",
    total_amount_thousand_yen: 30,
    candidate_budget_book_pages: "313",
  }),
];

describe("revenue allocation identity resolution", () => {
  it("exact groupと公開identityを同時に解決する", () => {
    const identityBuild = transformBudgetProgramIdentities(groups);
    const input = [
      makeAllocation({
        allocation_link_id: "ral_2026_general_001_000",
        target_budget_program_group_id:
          "2026_general_expenditure_01_01_02_01_01",
        target_budget_item_key:
          "2026_general_expenditure_01_01_02",
        pdf_target_program_name: "別事業",
        matched_budget_program_name: "別事業",
        target_budget_book_page: "313",
        target_match_status: "matched",
        target_match_method: "page_and_exact_name",
        review_note: "exact",
      }),
      makeAllocation(),
    ];
    const result = resolveRevenueAllocationIdentities(
      input,
      identityBuild,
      groups,
      [makeOverride()],
    );
    const validation =
      validateRevenueAllocationIdentityResolution(
        input,
        identityBuild,
        groups,
        result,
      );

    expect(result.allocations[0]).toMatchObject({
      target_resolution_level: "exact_group",
      target_group_resolution_status: "exact",
      candidate_target_group_count: "1",
    });
    expect(result.allocations[1]).toMatchObject({
      target_budget_program_group_id: "",
      target_budget_item_key:
        "2026_general_expenditure_01_01_01",
      matched_budget_program_name: "対象事業",
      target_match_status: "matched",
      target_match_method:
        "page_name_department_identity_cluster",
      target_resolution_level: "public_identity",
      target_group_resolution_status:
        "not_distinguishable_from_public_source",
      candidate_target_group_count: "2",
      review_note:
        "official_pdf_does_not_identify_internal_budget_program_group",
    });
    expect(result.groupAmbiguities).toHaveLength(1);
    expect(result.unresolvedOverrides).toHaveLength(0);
    expect(validation).toMatchObject({
      exactGroupCount: 1,
      publicIdentityCount: 1,
      ambiguousCount: 0,
      unmatchedCount: 0,
      isPass: true,
    });
  });

  it("identity解決済み出力を再入力しても同じ結果になる", () => {
    const identityBuild = transformBudgetProgramIdentities(groups);
    const first = resolveRevenueAllocationIdentities(
      [makeAllocation()],
      identityBuild,
      groups,
      [makeOverride()],
    );
    const second = resolveRevenueAllocationIdentities(
      first.allocations,
      identityBuild,
      groups,
      [],
    );

    expect(
      serializeIdentityResolvedBudgetRevenueAllocations(
        second.allocations,
      ),
    ).toBe(
      serializeIdentityResolvedBudgetRevenueAllocations(
        first.allocations,
      ),
    );
    expect(
      serializeRevenueAllocationGroupAmbiguities(
        second.groupAmbiguities,
      ),
    ).toBe(
      serializeRevenueAllocationGroupAmbiguities(
        first.groupAmbiguities,
      ),
    );
  });

  it("異なるidentityの候補を強制統合しない", () => {
    const identityBuild = transformBudgetProgramIdentities(groups);
    const override = makeOverride({
      candidate_budget_program_group_ids:
        "2026_general_expenditure_01_01_01_01_01|" +
        "2026_general_expenditure_01_01_02_01_01",
    });
    const input = [makeAllocation()];
    const result = resolveRevenueAllocationIdentities(
      input,
      identityBuild,
      groups,
      [override],
    );
    const validation =
      validateRevenueAllocationIdentityResolution(
        input,
        identityBuild,
        groups,
        result,
      );

    expect(result.allocations[0].target_match_status).toBe(
      "ambiguous",
    );
    expect(
      result.allocations[0].target_budget_program_identity_id,
    ).toBe("");
    expect(result.unresolvedOverrides).toEqual([override]);
    expect(validation.structuralPass).toBe(true);
    expect(validation.isPass).toBe(false);
  });

  it("selected groupをidentity処理で自動採用しない", () => {
    const identityBuild = transformBudgetProgramIdentities(groups);
    expect(() =>
      resolveRevenueAllocationIdentities(
        [makeAllocation()],
        identityBuild,
        groups,
        [
          makeOverride({
            selected_budget_program_group_id:
              "2026_general_expenditure_01_01_01_01_01",
          }),
        ],
      ),
    ).toThrow("selected_budget_program_group_id");
  });

  it("Phase 29の17列CSVを読み、21列で再読込検証できる", () => {
    const phase29: BudgetRevenueAllocation = {
      allocation_link_id: "ral_2026_general_001_001",
      revenue_detail_id:
        "rd_2026_general_revenue_11_01_01_01_01_001",
      target_budget_program_group_id: "",
      target_budget_item_key: "",
      target_account_code: "general",
      pdf_target_program_name: "対象事業",
      matched_budget_program_name: "",
      target_budget_book_page: 311,
      source_pdf_page: 1,
      source_budget_book_page: 67,
      target_match_status: "ambiguous",
      target_match_method: "",
      amount_attribution_status: "not_available",
      allocation_amount_thousand_yen: "",
      source_file: "budget.pdf",
      raw_text: "raw",
      review_note: "multiple_candidates",
    };
    const parsed =
      parseBudgetRevenueAllocationsForIdentityResolution(
        serializeBudgetRevenueAllocations([phase29]),
      );
    const identityBuild = transformBudgetProgramIdentities(groups);
    const result = resolveRevenueAllocationIdentities(
      parsed,
      identityBuild,
      groups,
      [makeOverride()],
    );
    const allocationsCsv =
      serializeIdentityResolvedBudgetRevenueAllocations(
        result.allocations,
      );
    const ambiguitiesCsv =
      serializeRevenueAllocationGroupAmbiguities(
        result.groupAmbiguities,
      );

    expect(parsed[0].target_budget_program_identity_id).toBe("");
    expect(() =>
      validateSerializedIdentityResolvedAllocations(
        allocationsCsv,
        result.allocations,
      ),
    ).not.toThrow();
    expect(() =>
      validateSerializedRevenueAllocationGroupAmbiguities(
        ambiguitiesCsv,
        result.groupAmbiguities,
      ),
    ).not.toThrow();
  });
});
