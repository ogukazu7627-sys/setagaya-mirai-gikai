import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { describe, expect, it } from "vitest";
import type { BudgetAccountsConfig } from "./budget-accounts";
import {
  BUDGET_SECTION_COLUMNS,
  BUDGET_SECTION_LEGACY_COLUMNS,
  DEFAULT_BUDGET_BOOK_SOURCE_FILE,
  parseBudgetProgramKeySet,
  parseExistingBudgetSectionRows,
  parseRawGeneralSectionRows,
  parseRawSpecialSectionRows,
  serializeBudgetSections,
  transformBudgetSections,
  transformBudgetSectionsFromRaw,
  validateBudgetSectionLegacyRegression,
  validateBudgetSections,
  validateGeneralRawSectionRegression,
  validateGeneralSectionRegression,
  type BudgetSectionSourceRow,
} from "./budget-sections";

const config: BudgetAccountsConfig = {
  fiscal_year: 2026,
  accounts: [
    {
      account_code: "general",
      account_name: "一般会計",
      account_type: "general",
      budget_side: "expenditure",
      csv_account_name: "一般会計",
      expected_amount_thousand_yen: 10,
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
      expected_amount_thousand_yen: 20,
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

function existingGeneralRow(
  overrides: Partial<BudgetSectionSourceRow> = {},
): BudgetSectionSourceRow {
  return {
    section_id: "2026_general_expenditure_01_01_01_section_01_001",
    budget_item_key: "2026_general_expenditure_01_01_01",
    fiscal_year: "2026",
    account_name: "一般会計",
    budget_side: "expenditure",
    kan_code: "01",
    kan_name: "議会費",
    kou_code: "01",
    kou_name: "議会費",
    moku_code: "01",
    moku_name: "議会費",
    setsu_code: "01",
    setsu_name: "報酬",
    amount_thousand_yen: "10",
    budget_book_page: "311",
    pdf_page: "159",
    source_file: "r8tousyoyosanallpage.pdf",
    ...overrides,
  };
}

function rawSpecialRow(
  overrides: Partial<BudgetSectionSourceRow> = {},
): BudgetSectionSourceRow {
  return {
    raw_section_id:
      "2026_national_health_insurance_expenditure_21_01_01_setsu_07_01",
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
    setsu_code: "07",
    setsu_name: "報償費",
    amount_thousand_yen: "20",
    budget_book_page: "591",
    pdf_page: "299",
    raw_text: "07 報償費 | 20",
    parse_status: "matched",
    review_reason: "",
    ...overrides,
  };
}

function rawGeneralRow(
  overrides: Partial<BudgetSectionSourceRow> = {},
): BudgetSectionSourceRow {
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
    moku_total_amount_thousand_yen: "10",
    setsu_code: "01",
    setsu_name: "報酬",
    setsu_amount_thousand_yen: "10",
    raw_text: "01 報酬 | 10",
    parse_status: "parsed",
    parse_note: "stateful_reconciliation=matched",
    ...overrides,
  };
}

function toCsv(row: BudgetSectionSourceRow): string {
  return stringify([row], {
    columns: Object.keys(row),
    header: true,
  });
}

describe("budget section source parsing", () => {
  it("既存一般会計CSVと特別会計raw CSVを解析する", () => {
    expect(
      parseExistingBudgetSectionRows(toCsv(existingGeneralRow())),
    ).toHaveLength(1);
    expect(parseRawSpecialSectionRows(toCsv(rawSpecialRow()))).toHaveLength(
      1,
    );
  });

  it("一般会計raw CSVを解析する", () => {
    expect(parseRawGeneralSectionRows(toCsv(rawGeneralRow()))).toHaveLength(
      1,
    );
  });

  it("budget_programs.csvからキー集合を作る", () => {
    const csv = stringify(
      [
        {
          budget_item_key: "2026_general_expenditure_01_01_01",
        },
        {
          budget_item_key:
            "2026_national_health_insurance_expenditure_21_01_01",
        },
      ],
      { header: true },
    );

    expect([...parseBudgetProgramKeySet(csv)]).toEqual([
      "2026_general_expenditure_01_01_01",
      "2026_national_health_insurance_expenditure_21_01_01",
    ]);
  });
});

describe("all-account budget section transformation", () => {
  it("一般・特別会計のraw CSVだけから全会計の節を構築する", () => {
    const sections = transformBudgetSectionsFromRaw(
      [rawGeneralRow()],
      [rawSpecialRow()],
      config,
    );

    expect(sections.map((row) => row.account_code)).toEqual([
      "general",
      "national_health_insurance",
    ]);
    expect(sections.map((row) => row.amount_thousand_yen)).toEqual([
      10, 20,
    ]);
    expect(
      validateGeneralRawSectionRegression(
        [rawGeneralRow()],
        sections,
        1,
      ),
    ).toEqual({
      rowCount: 1,
      comparedColumnCount: 16,
    });
  });

  it("一般会計rawのneeds_review行を拒否する", () => {
    expect(() =>
      transformBudgetSectionsFromRaw(
        [rawGeneralRow({ parse_status: "needs_review" })],
        [rawSpecialRow()],
        config,
      ),
    ).toThrow("parsed以外の行があります");
  });

  it("一般会計を保持し、特別会計をaccount_code付きで追加する", () => {
    const sections = transformBudgetSections(
      [existingGeneralRow()],
      [rawSpecialRow()],
      config,
    );

    expect(sections).toEqual([
      {
        section_id: "bs_2026_general_expenditure_01_01_01_01",
        budget_item_key: "2026_general_expenditure_01_01_01",
        fiscal_year: 2026,
        account_code: "general",
        account_name: "一般会計",
        budget_side: "expenditure",
        kan_code: "01",
        kan_name: "議会費",
        kou_code: "01",
        kou_name: "議会費",
        moku_code: "01",
        moku_name: "議会費",
        setsu_code: "01",
        setsu_name: "報酬",
        amount_thousand_yen: 10,
        budget_book_page: 311,
        pdf_page: 159,
        source_file: "r8tousyoyosanallpage.pdf",
        source_type: "official_pdf",
      },
      {
        section_id:
          "bs_2026_national_health_insurance_expenditure_21_01_01_07",
        budget_item_key:
          "2026_national_health_insurance_expenditure_21_01_01",
        fiscal_year: 2026,
        account_code: "national_health_insurance",
        account_name: "国民健康保険事業会計",
        budget_side: "expenditure",
        kan_code: "21",
        kan_name: "総務費",
        kou_code: "01",
        kou_name: "総務管理費",
        moku_code: "01",
        moku_name: "一般管理費",
        setsu_code: "07",
        setsu_name: "報償費",
        amount_thousand_yen: 20,
        budget_book_page: 591,
        pdf_page: 299,
        source_file: DEFAULT_BUDGET_BOOK_SOURCE_FILE,
        source_type: "official_pdf",
      },
    ]);
  });

  it("同一目・同一節コードが複数ある場合だけ連番を付ける", () => {
    const sections = transformBudgetSections(
      [existingGeneralRow()],
      [
        rawSpecialRow({ amount_thousand_yen: "12" }),
        rawSpecialRow({
          raw_section_id:
            "2026_national_health_insurance_expenditure_21_01_01_setsu_07_02",
          amount_thousand_yen: "8",
        }),
      ],
      config,
    );

    expect(sections.slice(1).map((row) => row.section_id)).toEqual([
      "bs_2026_national_health_insurance_expenditure_21_01_01_07_01",
      "bs_2026_national_health_insurance_expenditure_21_01_01_07_02",
    ]);
  });

  it("needs_review行を黙って除外せず失敗させる", () => {
    expect(() =>
      transformBudgetSections(
        [existingGeneralRow()],
        [rawSpecialRow({ parse_status: "needs_review" })],
        config,
      ),
    ).toThrow("matched以外の行があります");
  });

  it("abolished_zero会計の補完行を拒否する", () => {
    expect(() =>
      transformBudgetSections(
        [existingGeneralRow()],
        [
          rawSpecialRow({
            account_code: "school_lunch_fee",
            account_name: "学校給食費会計",
          }),
        ],
        config,
      ),
    ).toThrow("PDF節抽出対象外または未定義");
  });

  it("既存budget_item_keyと階層コードの不一致を拒否する", () => {
    expect(() =>
      transformBudgetSections(
        [
          existingGeneralRow({
            budget_item_key: "2026_general_expenditure_01_01_99",
          }),
        ],
        [rawSpecialRow()],
        config,
      ),
    ).toThrow("budget_item_keyが会計・款・項・目と一致しません");
  });
});

describe("all-account budget section validation", () => {
  it("会計別合計、ID、programキー、0円会計を検証する", () => {
    const sections = transformBudgetSections(
      [existingGeneralRow()],
      [rawSpecialRow()],
      config,
    );
    const programKeys = new Set(sections.map((row) => row.budget_item_key));

    expect(validateBudgetSections(sections, config, programKeys)).toEqual({
      rowCount: 2,
      uniqueSectionIdCount: 2,
      uniqueBudgetItemKeyCount: 2,
      budgetItemKeyConsistencyCount: 2,
      programBudgetItemKeyConsistencyCount: 2,
      accountRowCounts: {
        general: 1,
        national_health_insurance: 1,
        school_lunch_fee: 0,
      },
      accountAmountTotalsThousandYen: {
        general: 10,
        national_health_insurance: 20,
        school_lunch_fee: 0,
      },
      expectedAccountAmountTotalsThousandYen: {
        general: 10,
        national_health_insurance: 20,
        school_lunch_fee: 0,
      },
      amountTotalThousandYen: 30,
      expectedAmountTotalThousandYen: 30,
    });
  });

  it("section_idの重複を拒否する", () => {
    const sections = transformBudgetSections(
      [existingGeneralRow()],
      [rawSpecialRow()],
      config,
    );

    expect(() =>
      validateBudgetSections(
        [
          sections[0],
          { ...sections[1], section_id: sections[0].section_id },
        ],
        config,
        new Set(sections.map((row) => row.budget_item_key)),
      ),
    ).toThrow("section_idの一意性検証に失敗しました");
  });

  it("budget_programs.csvにないキーを拒否する", () => {
    const sections = transformBudgetSections(
      [existingGeneralRow()],
      [rawSpecialRow()],
      config,
    );

    expect(() =>
      validateBudgetSections(
        sections,
        config,
        new Set(["2026_general_expenditure_01_01_01"]),
      ),
    ).toThrow("budget_programs.csvにbudget_item_keyがありません");
  });
});

describe("general-account regression and serialization", () => {
  it("section_id移行を除く一般会計16列が一致する", () => {
    const existing = [existingGeneralRow()];
    const sections = transformBudgetSections(
      existing,
      [rawSpecialRow()],
      config,
    );

    expect(
      validateGeneralSectionRegression(existing, sections, 1),
    ).toEqual({
      rowCount: 1,
      comparedColumnCount: 16,
    });
    expect(() =>
      validateGeneralSectionRegression(
        existing,
        [
          { ...sections[0], amount_thousand_yen: 11 },
          sections[1],
        ],
        1,
      ),
    ).toThrow("Phase 6回帰比較に失敗しました");
  });

  it("更新前18列を全件比較する", () => {
    const sections = transformBudgetSections(
      [existingGeneralRow()],
      [rawSpecialRow()],
      config,
    );
    const legacyRows = sections.map((section) =>
      Object.fromEntries(
        BUDGET_SECTION_LEGACY_COLUMNS.map((column) => [
          column,
          section[column],
        ]),
      ),
    );
    const baselineCsv = stringify(legacyRows, {
      columns: [...BUDGET_SECTION_LEGACY_COLUMNS],
      header: true,
    });

    expect(
      validateBudgetSectionLegacyRegression(baselineCsv, sections),
    ).toEqual({
      rowCount: 2,
      comparedColumnCount: 18,
    });
  });

  it("既存18列の末尾にsource_typeを付けて出力する", () => {
    const sections = transformBudgetSections(
      [existingGeneralRow()],
      [rawSpecialRow()],
      config,
    );
    const rows = parse(serializeBudgetSections(sections)) as string[][];

    expect(rows[0]).toEqual(BUDGET_SECTION_COLUMNS);
    expect(rows).toHaveLength(3);
    expect(rows[1][3]).toBe("general");
    expect(rows[1][14]).toBe("10");
    expect(rows[2][3]).toBe("national_health_insurance");
    expect(rows[1][18]).toBe("official_pdf");
  });
});
