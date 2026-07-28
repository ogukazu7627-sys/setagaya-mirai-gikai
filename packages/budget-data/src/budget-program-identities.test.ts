import { describe, expect, it } from "vitest";
import type { BudgetProgramIdentitySourceGroup } from "./budget-program-identities";
import {
  buildBudgetProgramIdentityId,
  buildBudgetProgramIdentityKey,
  parseBudgetProgramIdentitySourceGroups,
  serializeBudgetProgramIdentities,
  serializeBudgetProgramIdentityMembers,
  transformBudgetProgramIdentities,
  validateBudgetProgramIdentities,
  validateSerializedBudgetProgramIdentities,
  validateSerializedBudgetProgramIdentityMembers,
} from "./budget-program-identities";

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
    budget_program_name: "ＤＸ 推進事業",
    department_name: "財務部＊課税課",
    total_amount_thousand_yen: 100,
    member_program_count: 1,
    candidate_budget_book_pages: "311",
    source_type: "derived",
    ...values,
  };
}

describe("budget program identity", () => {
  it("許可された表記差だけを同一identityへまとめる", () => {
    const groups = [
      makeGroup(),
      makeGroup({
        budget_program_group_id:
          "2026_general_expenditure_01_01_01_01_02",
        budget_program_name: "DX推進事業",
        department_name: "財務部*課税課",
        total_amount_thousand_yen: 50,
      }),
    ];
    const result = transformBudgetProgramIdentities(groups);
    const validation = validateBudgetProgramIdentities(
      groups,
      result,
    );

    expect(result.identities).toHaveLength(1);
    expect(result.identities[0]).toMatchObject({
      normalized_program_name: "DX推進事業",
      normalized_department_name: "財務部*課税課",
      total_amount_thousand_yen: 150,
      member_group_count: 2,
      source_type: "derived",
    });
    expect(result.members.map((member) => member.member_order)).toEqual([
      1, 2,
    ]);
    expect(validation.isPass).toBe(true);
  });

  it("会計・目・候補ページをまたいで統合しない", () => {
    const groups = [
      makeGroup(),
      makeGroup({
        budget_program_group_id:
          "2026_general_expenditure_01_01_02_01_01",
        budget_item_key: "2026_general_expenditure_01_01_02",
      }),
      makeGroup({
        budget_program_group_id:
          "2026_general_expenditure_01_01_01_01_03",
        candidate_budget_book_pages: "313",
      }),
      makeGroup({
        budget_program_group_id:
          "2026_national_health_insurance_expenditure_01_01_01_01_01",
        budget_item_key:
          "2026_national_health_insurance_expenditure_01_01_01",
        account_code: "national_health_insurance",
        account_name: "国民健康保険事業会計",
      }),
    ];

    expect(transformBudgetProgramIdentities(groups).identities).toHaveLength(
      4,
    );
  });

  it("identity IDは入力順に依存しない", () => {
    const first = makeGroup();
    const second = makeGroup({
      budget_program_group_id:
        "2026_general_expenditure_01_01_01_01_02",
      budget_program_name: "DX推進事業",
    });
    const forward = transformBudgetProgramIdentities([first, second]);
    const reverse = transformBudgetProgramIdentities([second, first]);

    expect(
      forward.identities[0].budget_program_identity_id,
    ).toBe(reverse.identities[0].budget_program_identity_id);
    expect(
      buildBudgetProgramIdentityId(
        buildBudgetProgramIdentityKey(first),
      ),
    ).toBe(forward.identities[0].budget_program_identity_id);
  });

  it("group CSVを読み、identityとmemberを再読込検証できる", () => {
    const csv = [
      [
        "budget_program_group_id",
        "budget_item_key",
        "fiscal_year",
        "account_code",
        "account_name",
        "major_program_name",
        "budget_program_name",
        "department_name",
        "total_amount_thousand_yen",
        "member_program_count",
        "candidate_budget_book_pages",
        "source_type",
      ].join(","),
      [
        "2026_general_expenditure_01_01_01_01_01",
        "2026_general_expenditure_01_01_01",
        "2026",
        "general",
        "一般会計",
        "大事業",
        "予算事業",
        "財務部＊課税課",
        "100",
        "1",
        "",
        "derived",
      ].join(","),
    ].join("\n");
    const groups = parseBudgetProgramIdentitySourceGroups(csv);
    const result = transformBudgetProgramIdentities(groups);
    const identitiesCsv = serializeBudgetProgramIdentities(
      result.identities,
    );
    const membersCsv = serializeBudgetProgramIdentityMembers(
      result.members,
    );

    expect(groups[0].candidate_budget_book_pages).toBe("");
    expect(() =>
      validateSerializedBudgetProgramIdentities(
        identitiesCsv,
        result.identities,
      ),
    ).not.toThrow();
    expect(() =>
      validateSerializedBudgetProgramIdentityMembers(
        membersCsv,
        result.members,
      ),
    ).not.toThrow();
  });
});
