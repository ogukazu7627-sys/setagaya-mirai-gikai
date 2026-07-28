import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { describe, expect, it } from "vitest";
import type { BudgetAccountsConfig } from "./budget-accounts";
import {
  VALIDATION_ERROR_COLUMNS,
  parseValidationGeneralRawSectionRows,
  parseValidationItemRows,
  parseValidationProgramRows,
  parseValidationSectionRows,
  parseValidationSpecialRawSectionRows,
  renderValidationReport,
  serializeValidationErrors,
  validateBudgetData,
  type BudgetValidationInputs,
  type GeneralPhase6Baseline,
  type ValidationSourceRow,
} from "./budget-validation";
import { buildBudgetItemKey } from "./budget-programs";

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
      expected_amount_thousand_yen: 30,
      pdf_budget_book_start_page: 590,
      pdf_budget_book_end_page: 621,
      pdf_page_start: 299,
      pdf_page_end: 314,
      status: "active",
    },
    {
      account_code: "school_lunch_fee",
      account_name: "学校給食費会計",
      account_type: "special",
      budget_side: "expenditure",
      csv_account_name: "学校給食費会計",
      expected_amount_thousand_yen: 0,
      pdf_budget_book_start_page: null,
      pdf_budget_book_end_page: null,
      pdf_page_start: null,
      pdf_page_end: null,
      status: "abolished_zero",
    },
  ],
};

const accountNames: Record<string, string> = {
  general: "一般会計",
  national_health_insurance: "国民健康保険事業会計",
  school_lunch_fee: "学校給食費会計",
};

function dimensions(
  mokuCode: string,
  accountCode = "general",
  overrides: Partial<ValidationSourceRow> = {},
): ValidationSourceRow {
  const accountName = accountNames[accountCode] ?? "未定義会計";
  const kanCode =
    overrides.kan_code ??
    (accountCode === "national_health_insurance"
      ? "21"
      : accountCode === "school_lunch_fee"
        ? "71"
        : "01");
  const kouCode = overrides.kou_code ?? "01";
  const normalizedMokuCode = mokuCode.padStart(2, "0");
  const budgetItemKey = buildBudgetItemKey({
    fiscalYear: 2026,
    accountCode,
    accountName,
    budgetSide: "expenditure",
    kanCode,
    kouCode,
    mokuCode: normalizedMokuCode,
  });
  return {
    budget_item_key: budgetItemKey,
    fiscal_year: "2026",
    account_code: accountCode,
    account_name: accountName,
    budget_side: "expenditure",
    kan_code: kanCode,
    kan_name: "款",
    kou_code: kouCode,
    kou_name: "項",
    moku_code: normalizedMokuCode,
    moku_name: `目${mokuCode}`,
    ...overrides,
  };
}

function programRow(
  mokuCode: string,
  amount: string,
  accountCode = "general",
  overrides: Partial<ValidationSourceRow> = {},
): ValidationSourceRow {
  const base = dimensions(mokuCode, accountCode, overrides);
  return {
    ...base,
    program_id: `${base.budget_item_key}_01_01_01`,
    amount_thousand_yen: amount,
    ...overrides,
  };
}

function sectionRow(
  mokuCode: string,
  amount: string,
  accountCode = "general",
  overrides: Partial<ValidationSourceRow> = {},
): ValidationSourceRow {
  const base = dimensions(mokuCode, accountCode, overrides);
  return {
    ...base,
    section_id: `bs_${base.budget_item_key}_01`,
    amount_thousand_yen: amount,
    budget_book_page:
      accountCode === "national_health_insurance" ? "591" : "311",
    pdf_page: accountCode === "national_health_insurance" ? "299" : "159",
    source_file: "r8tousyoyosanallpage.pdf",
    ...overrides,
  };
}

function itemRow(
  mokuCode: string,
  programTotal: string,
  sectionTotal: string,
  status: string,
  accountCode = "general",
  overrides: Partial<ValidationSourceRow> = {},
): ValidationSourceRow {
  return {
    ...dimensions(mokuCode, accountCode, overrides),
    program_total_amount_thousand_yen: programTotal,
    section_total_amount_thousand_yen: sectionTotal,
    diff_amount_thousand_yen: String(
      Number(programTotal) - Number(sectionTotal),
    ),
    validation_status: status,
    program_row_count: "1",
    section_row_count: Number(sectionTotal) === 0 ? "0" : "1",
    ...overrides,
  };
}

function generalRawSectionRow(
  parseStatus: string,
  overrides: Partial<ValidationSourceRow> = {},
): ValidationSourceRow {
  return {
    source_file: "r8tousyoyosanallpage.pdf",
    pdf_page: "159",
    budget_book_page: "311",
    fiscal_year: "2026",
    account_name: "一般会計",
    budget_side: "expenditure",
    kan_code: "01",
    kan_name: "議会費",
    kou_code: "01",
    kou_name: "議会費",
    moku_code: "01",
    moku_name: "議会費",
    parse_status: parseStatus,
    parse_note: "",
    raw_text: "01 報酬 | 100",
    ...overrides,
  };
}

function specialRawSectionRow(
  parseStatus: string,
  overrides: Partial<ValidationSourceRow> = {},
): ValidationSourceRow {
  return {
    raw_section_id:
      "2026_national_health_insurance_expenditure_21_01_01_setsu_01_01",
    fiscal_year: "2026",
    account_code: "national_health_insurance",
    account_name: "国民健康保険事業会計",
    budget_side: "expenditure",
    kan_code: "21",
    kan_name: "総務費",
    kou_code: "01",
    kou_name: "総務管理費",
    moku_code: "01",
    moku_name: "一般管理費",
    setsu_code: "01",
    setsu_name: "報酬",
    amount_thousand_yen: "30",
    budget_book_page: "591",
    pdf_page: "299",
    raw_text: "01 報酬 | 30",
    parse_status: parseStatus,
    review_reason: "",
    ...overrides,
  };
}

function normalInputs(): BudgetValidationInputs {
  return {
    programRows: [
      programRow("1", "100"),
      programRow("2", "0"),
      programRow("1", "30", "national_health_insurance"),
      programRow("1", "0", "school_lunch_fee"),
    ],
    sectionRows: [
      sectionRow("1", "100"),
      sectionRow("1", "30", "national_health_insurance"),
    ],
    itemRows: [
      itemRow("1", "100", "100", "ok"),
      itemRow("2", "0", "0", "ok_zero_amount"),
      itemRow(
        "1",
        "30",
        "30",
        "ok",
        "national_health_insurance",
      ),
      itemRow(
        "1",
        "0",
        "0",
        "ok_zero_amount",
        "school_lunch_fee",
      ),
    ],
    generalRawSectionRows: [generalRawSectionRow("parsed")],
    specialRawSectionRows: [specialRawSectionRow("matched")],
  };
}

const miniGeneralBaseline: GeneralPhase6Baseline = {
  programRows: 2,
  sectionRows: 1,
  itemRows: 2,
  rawSectionRows: 1,
  programTotal: 100,
  sectionTotal: 100,
  itemProgramTotal: 100,
  itemSectionTotal: 100,
  programKeyCount: 2,
  sectionKeyCount: 1,
  itemKeyCount: 2,
  unionKeyCount: 2,
  okCount: 1,
  zeroAmountCount: 1,
  errorStatusCount: 0,
  needsReviewCount: 0,
  uniqueProgramIdCount: 2,
  uniqueSectionIdCount: 1,
  invalidProgramKeyRowCount: 0,
  invalidSectionKeyRowCount: 0,
  invalidItemKeyRowCount: 0,
};

const validationOptions = {
  expectedAllAccountTotalThousandYen: 130,
  generalPhase6Baseline: miniGeneralBaseline,
};

function rowsToCsv(rows: ValidationSourceRow[]): string {
  return stringify(rows, {
    columns: Object.keys(rows[0]),
    header: true,
  });
}

describe("budget validation input parsing", () => {
  it("全5種の入力CSVを必要列つきで解析する", () => {
    const inputs = normalInputs();

    expect(
      parseValidationProgramRows(rowsToCsv(inputs.programRows)),
    ).toHaveLength(4);
    expect(
      parseValidationSectionRows(rowsToCsv(inputs.sectionRows)),
    ).toHaveLength(2);
    expect(
      parseValidationItemRows(rowsToCsv(inputs.itemRows)),
    ).toHaveLength(4);
    expect(
      parseValidationGeneralRawSectionRows(
        rowsToCsv(inputs.generalRawSectionRows),
      ),
    ).toHaveLength(1);
    expect(
      parseValidationSpecialRawSectionRows(
        rowsToCsv(inputs.specialRawSectionRows),
      ),
    ).toHaveLength(1);
  });
});

describe("all-account budget data validation", () => {
  it("正常データをPASSにし、0円会計をsections補完なしで扱う", () => {
    const result = validateBudgetData(
      normalInputs(),
      config,
      validationOptions,
    );

    expect(result.isPass).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.rowCounts).toEqual({
      budgetPrograms: 4,
      budgetSections: 2,
      budgetItems: 4,
      rawPdfSectionsGeneral: 1,
      rawPdfSectionsSpecial: 1,
      rawPdfSectionsTotal: 2,
    });
    expect(result.validationStatusCounts).toEqual({
      ok: 2,
      ok_zero_amount: 2,
      error_missing_sections: 0,
      error_missing_programs: 0,
      error_amount_mismatch: 0,
    });
    expect(result.needsReviewCounts).toEqual({
      general: 0,
      special: 0,
      total: 0,
    });
    expect(
      result.accountSummaries.find(
        (row) => row.accountCode === "school_lunch_fee",
      ),
    ).toEqual(
      expect.objectContaining({
        sectionRowCount: 0,
        sectionAmountThousandYen: 0,
        isPass: true,
      }),
    );
    expect(result.generalCompatibility.isPass).toBe(true);
  });

  it("2種類のneeds_reviewとaccount_code不正をエラー化する", () => {
    const inputs = normalInputs();
    inputs.generalRawSectionRows = [
      generalRawSectionRow("needs_review", {
        parse_note: "amount_mismatch",
      }),
    ];
    inputs.specialRawSectionRows = [
      specialRawSectionRow("needs_review", {
        review_reason: "continued_page",
      }),
      specialRawSectionRow("matched", {
        raw_section_id: "unknown",
        account_code: "unknown_account",
        account_name: "未定義会計",
      }),
    ];
    const result = validateBudgetData(inputs, config, validationOptions);
    const errorTypes = new Set(
      result.errors.map((error) => error.error_type),
    );

    expect(result.isPass).toBe(false);
    expect(result.needsReviewCounts).toEqual({
      general: 1,
      special: 1,
      total: 2,
    });
    expect(errorTypes).toContain("pdf_section_needs_review");
    expect(errorTypes).toContain("invalid_account_code");
    expect(
      result.errors.some(
        (error) =>
          error.account_code === "national_health_insurance" &&
          error.source_file === "raw_pdf_sections_special.csv",
      ),
    ).toBe(true);
  });

  it("金額・status・ID・キーのエラーを記録してFAILにする", () => {
    const duplicateProgramId =
      "2026_general_expenditure_01_01_01_01_01_01";
    const duplicateSectionId =
      "bs_2026_general_expenditure_01_01_01_01";
    const inputs = normalInputs();
    inputs.programRows = [
      programRow("1", "50", "general", {
        program_id: duplicateProgramId,
      }),
      programRow("1", "40", "general", {
        program_id: duplicateProgramId,
      }),
    ];
    inputs.sectionRows = [
      sectionRow("1", "60", "general", {
        section_id: duplicateSectionId,
      }),
      sectionRow("1", "20", "general", {
        section_id: duplicateSectionId,
        budget_item_key: "2026_general_expenditure_01*01*01",
      }),
    ];
    inputs.itemRows = [
      itemRow("1", "80", "70", "error_amount_mismatch"),
      itemRow("2", "10", "0", "error_missing_sections"),
      itemRow("3", "0", "20", "error_missing_programs"),
    ];
    const result = validateBudgetData(inputs, config, validationOptions);
    const errorTypes = new Set(
      result.errors.map((error) => error.error_type),
    );

    expect(result.isPass).toBe(false);
    expect(errorTypes).toEqual(
      expect.objectContaining(
        new Set([
          "budget_programs_total_mismatch",
          "budget_sections_total_mismatch",
          "budget_items_program_total_mismatch",
          "budget_items_section_total_mismatch",
          "error_amount_mismatch",
          "error_missing_sections",
          "error_missing_programs",
          "duplicate_section_id",
          "duplicate_program_id",
          "invalid_budget_item_key_format",
          "general_phase6_compatibility_mismatch",
        ]),
      ),
    );
    expect(new Set(result.errors.map((error) => error.error_id)).size).toBe(
      result.errors.length,
    );
  });

  it("abolished_zero会計のsection補完行を拒否する", () => {
    const inputs = normalInputs();
    inputs.sectionRows.push(
      sectionRow("1", "0", "school_lunch_fee"),
    );
    const result = validateBudgetData(inputs, config, validationOptions);

    expect(result.isPass).toBe(false);
    expect(
      result.errors.map((error) => error.error_type),
    ).toContain("abolished_zero_sections_present");
  });
});

describe("validation outputs", () => {
  it("空のエラーCSVは指定14列のヘッダーだけを出力する", () => {
    const result = validateBudgetData(
      normalInputs(),
      config,
      validationOptions,
    );
    const rows = parse(serializeValidationErrors(result.errors)) as string[][];

    expect(rows).toEqual([[...VALIDATION_ERROR_COLUMNS]]);
  });

  it("Markdownレポートに全会計検証と互換性を記録する", () => {
    const result = validateBudgetData(
      normalInputs(),
      config,
      validationOptions,
    );
    const report = renderValidationReport(result, "2026-07-28");

    expect(report).toContain("**PASS**");
    expect(report).toContain("raw_pdf_sections_special.csv");
    expect(report).toContain("national_health_insurance");
    expect(report).toContain("`ok_zero_amount` | 2");
    expect(report).toContain("一般会計のPhase 6互換性");
    expect(report).toContain("総合判定: **PASS**");
    expect(report).toContain("status=abolished_zero");
    expect(report).toContain("validation_errors.csv` はヘッダーのみ");
  });
});
