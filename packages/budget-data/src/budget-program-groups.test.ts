import { describe, expect, it } from "vitest";
import type { BudgetAccountsConfig } from "./budget-accounts";
import {
  type BudgetProgramGroupSourceItem,
  type BudgetProgramGroupSourceProgram,
  type BudgetProgramGroupSourceSection,
  deriveBudgetProgramGroupId,
  parseBudgetProgramGroupSourcePrograms,
  serializeBudgetProgramGroups,
  transformBudgetProgramGroups,
  validateBudgetProgramGroups,
  validateSerializedBudgetProgramGroups,
} from "./budget-program-groups";

function makeProgram(
  values: Partial<BudgetProgramGroupSourceProgram> = {},
): BudgetProgramGroupSourceProgram {
  return {
    program_id:
      "2026_general_expenditure_01_01_01_01_01_01",
    budget_program_group_id:
      "2026_general_expenditure_01_01_01_01_01",
    budget_item_key: "2026_general_expenditure_01_01_01",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    budget_side: "expenditure",
    major_program_name: "大事業",
    budget_program_name: "予算事業",
    department_name: "財務部＊課税課",
    department_display_name: "財務部 課税課",
    amount_thousand_yen: 100,
    detail_program_code: "01",
    ...values,
  };
}

function makeSection(
  values: Partial<BudgetProgramGroupSourceSection> = {},
): BudgetProgramGroupSourceSection {
  return {
    budget_item_key: "2026_general_expenditure_01_01_01",
    account_code: "general",
    budget_book_page: 311,
    ...values,
  };
}

function makeItem(
  values: Partial<BudgetProgramGroupSourceItem> = {},
): BudgetProgramGroupSourceItem {
  return {
    budget_item_key: "2026_general_expenditure_01_01_01",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    program_total_amount_thousand_yen: 150,
    validation_status: "ok",
    ...values,
  };
}

const config: BudgetAccountsConfig = {
  fiscal_year: 2026,
  accounts: [
    {
      account_code: "general",
      account_name: "一般会計",
      account_type: "general",
      budget_side: "expenditure",
      csv_account_name: "一般会計",
      expected_amount_thousand_yen: 150,
      pdf_budget_book_start_page: 310,
      pdf_budget_book_end_page: 479,
      pdf_page_start: 159,
      pdf_page_end: 243,
      status: "active",
    },
  ],
};

describe("budget program group ID", () => {
  it("program_idから内訳事業コードを除いて決定する", () => {
    expect(
      deriveBudgetProgramGroupId(
        "2026_general_expenditure_01_01_01_01_05_03",
        "03",
      ),
    ).toBe("2026_general_expenditure_01_01_01_01_05");
  });

  it("既存group列がない入力では決定的IDを補う", () => {
    const csv = [
      [
        "program_id",
        "budget_item_key",
        "fiscal_year",
        "account_code",
        "account_name",
        "budget_side",
        "major_program_name",
        "budget_program_name",
        "department_name",
        "amount_thousand_yen",
        "detail_program_code",
      ].join(","),
      [
        "2026_general_expenditure_01_01_01_01_05_03",
        "2026_general_expenditure_01_01_01",
        "2026",
        "general",
        "一般会計",
        "expenditure",
        "大事業",
        "予算事業",
        "財務部＊課税課",
        "100",
        "03",
      ].join(","),
    ].join("\n");

    expect(
      parseBudgetProgramGroupSourcePrograms(csv)[0]
        .budget_program_group_id,
    ).toBe("2026_general_expenditure_01_01_01_01_05");
  });
});

describe("transformBudgetProgramGroups", () => {
  it("予算事業単位で金額・行数・節表ページを集約する", () => {
    const programs = [
      makeProgram(),
      makeProgram({
        program_id:
          "2026_general_expenditure_01_01_01_01_01_02",
        amount_thousand_yen: 50,
        detail_program_code: "02",
      }),
    ];
    const sections = [
      makeSection({ budget_book_page: 313 }),
      makeSection({ budget_book_page: 311 }),
      makeSection({ budget_book_page: 313 }),
    ];
    const groups = transformBudgetProgramGroups(programs, sections);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      total_amount_thousand_yen: 150,
      member_program_count: 2,
      candidate_budget_book_pages: "311|313",
      source_type: "derived",
    });
    expect(groups[0].department_display_name_for_matching).toBe(
      "財務部 課税課",
    );
  });

  it("同一group内の名称不一致を拒否する", () => {
    expect(() =>
      transformBudgetProgramGroups(
        [
          makeProgram(),
          makeProgram({
            program_id:
              "2026_general_expenditure_01_01_01_01_01_02",
            detail_program_code: "02",
            budget_program_name: "別事業",
          }),
        ],
        [makeSection()],
      ),
    ).toThrow("budget_program_name");
  });

  it("目マスタと金額を突合して直列化できる", () => {
    const programs = [
      makeProgram(),
      makeProgram({
        program_id:
          "2026_general_expenditure_01_01_01_01_01_02",
        amount_thousand_yen: 50,
        detail_program_code: "02",
      }),
    ];
    const sections = [makeSection()];
    const items = [makeItem()];
    const groups = transformBudgetProgramGroups(programs, sections);
    const validation = validateBudgetProgramGroups(
      groups,
      programs,
      sections,
      items,
      config,
    );
    const csv = serializeBudgetProgramGroups(groups);

    expect(validation.isPass).toBe(true);
    expect(validation.groupAmountTotalThousandYen).toBe(150);
    expect(() =>
      validateSerializedBudgetProgramGroups(csv, groups),
    ).not.toThrow();
  });
});
