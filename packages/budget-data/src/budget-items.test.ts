import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { describe, expect, it } from "vitest";
import type { BudgetAccountsConfig } from "./budget-accounts";
import {
  BUDGET_ITEM_COLUMNS,
  BUDGET_ITEM_LEGACY_COLUMNS,
  parseBudgetProgramRows,
  parseBudgetSectionRows,
  parseExistingBudgetItemRows,
  serializeBudgetItems,
  transformBudgetItems,
  validateBudgetItemLegacyRegression,
  validateBudgetItems,
  validateGeneralBudgetItemRegression,
  type BudgetItem,
  type BudgetItemSourceRow,
} from "./budget-items";
import { buildBudgetItemKey } from "./budget-programs";

function testConfig(
  generalAmount = 0,
  nationalHealthInsuranceAmount = 0,
): BudgetAccountsConfig {
  return {
    fiscal_year: 2026,
    accounts: [
      {
        account_code: "general",
        account_name: "一般会計",
        account_type: "general",
        budget_side: "expenditure",
        csv_account_name: "一般会計",
        expected_amount_thousand_yen: generalAmount,
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
        expected_amount_thousand_yen: nationalHealthInsuranceAmount,
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
}

const accountNames: Record<string, string> = {
  general: "一般会計",
  national_health_insurance: "国民健康保険事業会計",
  school_lunch_fee: "学校給食費会計",
};

function sourceRow(
  mokuCode: string,
  amount: string,
  overrides: Partial<BudgetItemSourceRow> = {},
): BudgetItemSourceRow {
  const accountCode = overrides.account_code ?? "general";
  const accountName =
    overrides.account_name ?? accountNames[accountCode] ?? "未定義会計";
  const kanCode = overrides.kan_code ?? "01";
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
    amount_thousand_yen: amount,
    ...overrides,
  };
}

function rowsToCsv(rows: BudgetItemSourceRow[]): string {
  return stringify(rows, {
    columns: Object.keys(rows[0]),
    header: true,
  });
}

function existingRowFromItem(item: BudgetItem): BudgetItemSourceRow {
  return Object.fromEntries(
    Object.entries(item)
      .filter(([key]) => key !== "account_code")
      .map(([key, value]) => [key, String(value)]),
  );
}

describe("budget item source parsing", () => {
  it("programs、sections、既存itemsの必要列を解析する", () => {
    const sourceCsv = rowsToCsv([sourceRow("1", "100")]);
    const item = transformBudgetItems(
      [sourceRow("1", "100")],
      [sourceRow("1", "100")],
      testConfig(),
    )[0];
    const existingCsv = rowsToCsv([existingRowFromItem(item)]);

    expect(parseBudgetProgramRows(sourceCsv)).toHaveLength(1);
    expect(parseBudgetSectionRows(sourceCsv)).toHaveLength(1);
    expect(parseExistingBudgetItemRows(existingCsv)).toHaveLength(1);
  });
});

describe("all-account budget item transformation", () => {
  it("同一キーを集計し、名称とaccount_codeはprograms側を優先する", () => {
    const items = transformBudgetItems(
      [
        sourceRow("1", "60", { moku_name: "プログラム側名称" }),
        sourceRow("1", "40", { moku_name: "プログラム側名称" }),
      ],
      [
        sourceRow("1", "70", { moku_name: "節側名称" }),
        sourceRow("1", "30", { moku_name: "節側名称" }),
      ],
      testConfig(),
    );

    expect(items).toEqual([
      expect.objectContaining({
        budget_item_key: "2026_general_expenditure_01_01_01",
        account_code: "general",
        moku_name: "プログラム側名称",
        program_total_amount_thousand_yen: 100,
        section_total_amount_thousand_yen: 100,
        diff_amount_thousand_yen: 0,
        validation_status: "ok",
        program_row_count: 2,
        section_row_count: 2,
        source_type: "derived",
        is_zero_amount: false,
      }),
    ]);
  });

  it("inner joinせず両入力のunionで全ステータスを判定する", () => {
    const items = transformBudgetItems(
      [
        sourceRow("1", "100"),
        sourceRow("2", "0"),
        sourceRow("3", "25"),
        sourceRow("5", "40"),
      ],
      [
        sourceRow("1", "100"),
        sourceRow("4", "30"),
        sourceRow("5", "35"),
      ],
      testConfig(),
    );
    const byKey = Object.fromEntries(
      items.map((row) => [row.moku_code, row]),
    );

    expect(items).toHaveLength(5);
    expect(byKey["01"].validation_status).toBe("ok");
    expect(byKey["02"]).toEqual(
      expect.objectContaining({
        validation_status: "ok_zero_amount",
        program_row_count: 1,
        section_row_count: 0,
        is_zero_amount: true,
      }),
    );
    expect(byKey["03"]).toEqual(
      expect.objectContaining({
        validation_status: "error_missing_sections",
        diff_amount_thousand_yen: 25,
      }),
    );
    expect(byKey["04"]).toEqual(
      expect.objectContaining({
        validation_status: "error_missing_programs",
        diff_amount_thousand_yen: -30,
        program_row_count: 0,
      }),
    );
    expect(byKey["05"]).toEqual(
      expect.objectContaining({
        validation_status: "error_amount_mismatch",
        diff_amount_thousand_yen: 5,
      }),
    );
  });

  it("特別会計と学校給食費0円項目に会計コードを保持する", () => {
    const items = transformBudgetItems(
      [
        sourceRow("1", "30", {
          account_code: "national_health_insurance",
          kan_code: "21",
        }),
        sourceRow("1", "0", {
          account_code: "school_lunch_fee",
          kan_code: "71",
        }),
      ],
      [
        sourceRow("1", "30", {
          account_code: "national_health_insurance",
          kan_code: "21",
        }),
      ],
      testConfig(),
    );

    expect(items).toEqual([
      expect.objectContaining({
        account_code: "national_health_insurance",
        validation_status: "ok",
      }),
      expect.objectContaining({
        account_code: "school_lunch_fee",
        section_total_amount_thousand_yen: 0,
        section_row_count: 0,
        validation_status: "ok_zero_amount",
      }),
    ]);
  });

  it("設定外のaccount_codeを拒否する", () => {
    expect(() =>
      transformBudgetItems(
        [
          sourceRow("1", "10", {
            account_code: "unknown_account",
            account_name: "未定義会計",
          }),
        ],
        [],
        testConfig(),
      ),
    ).toThrow("設定外のaccount_code");
  });
});

describe("all-account budget item validation", () => {
  it("会計別合計とok・ok_zero_amountだけならPASSにする", () => {
    const config = testConfig(100, 30);
    const items = transformBudgetItems(
      [
        sourceRow("1", "100"),
        sourceRow("2", "0"),
        sourceRow("1", "30", {
          account_code: "national_health_insurance",
          kan_code: "21",
        }),
        sourceRow("1", "0", {
          account_code: "school_lunch_fee",
          kan_code: "71",
        }),
      ],
      [
        sourceRow("1", "100"),
        sourceRow("1", "30", {
          account_code: "national_health_insurance",
          kan_code: "21",
        }),
      ],
      config,
    );

    expect(validateBudgetItems(items, config)).toEqual({
      rowCount: 4,
      uniqueBudgetItemKeyCount: 4,
      programTotalAmountThousandYen: 130,
      sectionTotalAmountThousandYen: 130,
      expectedAmountTotalThousandYen: 130,
      accountItemCounts: {
        general: 2,
        national_health_insurance: 1,
        school_lunch_fee: 1,
      },
      accountProgramTotalsThousandYen: {
        general: 100,
        national_health_insurance: 30,
        school_lunch_fee: 0,
      },
      accountSectionTotalsThousandYen: {
        general: 100,
        national_health_insurance: 30,
        school_lunch_fee: 0,
      },
      expectedAccountTotalsThousandYen: {
        general: 100,
        national_health_insurance: 30,
        school_lunch_fee: 0,
      },
      statusCounts: {
        ok: 2,
        ok_zero_amount: 2,
        error_missing_sections: 0,
        error_missing_programs: 0,
        error_amount_mismatch: 0,
      },
      zeroAmountCount: 2,
      errorStatusCount: 0,
      isPass: true,
    });
  });

  it("合計が一致してもerror系ステータスがあればFAILにする", () => {
    const config = testConfig(165);
    const items = transformBudgetItems(
      [
        sourceRow("1", "100"),
        sourceRow("2", "0"),
        sourceRow("3", "25"),
        sourceRow("5", "40"),
      ],
      [
        sourceRow("1", "100"),
        sourceRow("4", "30"),
        sourceRow("5", "35"),
      ],
      config,
    );
    const validation = validateBudgetItems(items, config);

    expect(validation.programTotalAmountThousandYen).toBe(165);
    expect(validation.sectionTotalAmountThousandYen).toBe(165);
    expect(validation.errorStatusCount).toBe(3);
    expect(validation.isPass).toBe(false);
  });
});

describe("general-account regression and serialization", () => {
  it("account_code追加を除く一般会計16列が一致する", () => {
    const items = transformBudgetItems(
      [sourceRow("1", "100")],
      [sourceRow("1", "100")],
      testConfig(),
    );
    const existingRows = [existingRowFromItem(items[0])];

    expect(
      validateGeneralBudgetItemRegression(existingRows, items, 1),
    ).toEqual({
      rowCount: 1,
      comparedColumnCount: 16,
    });
    expect(() =>
      validateGeneralBudgetItemRegression(
        existingRows,
        [{ ...items[0], program_total_amount_thousand_yen: 101 }],
        1,
      ),
    ).toThrow("Phase 6回帰比較に失敗しました");
  });

  it("更新前17列を全件比較する", () => {
    const items = transformBudgetItems(
      [sourceRow("1", "100")],
      [sourceRow("1", "100")],
      testConfig(),
    );
    const legacyRows = items.map((item) =>
      Object.fromEntries(
        BUDGET_ITEM_LEGACY_COLUMNS.map((column) => [
          column,
          String(item[column]),
        ]),
      ),
    );

    expect(validateBudgetItemLegacyRegression(legacyRows, items)).toEqual({
      rowCount: 1,
      comparedColumnCount: 17,
    });
  });

  it("既存17列の末尾に派生データ列を付けて出力する", () => {
    const items = transformBudgetItems(
      [sourceRow("1", "100")],
      [sourceRow("1", "100")],
      testConfig(),
    );
    const rows = parse(serializeBudgetItems(items)) as string[][];

    expect(rows[0]).toEqual(BUDGET_ITEM_COLUMNS);
    expect(rows).toHaveLength(2);
    expect(rows[1][2]).toBe("general");
    expect(rows[1][11]).toBe("100");
    expect(rows[1][14]).toBe("ok");
    expect(rows[1][17]).toBe("derived");
    expect(rows[1][18]).toBe("false");
  });
});
