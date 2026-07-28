import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { describe, expect, it } from "vitest";
import type {
  BudgetAccountDefinition,
  BudgetAccountsConfig,
} from "./budget-accounts";
import type { DepartmentNameMapping } from "./department-name-map";
import {
  BUDGET_PROGRAM_COLUMNS,
  BUDGET_PROGRAM_LEGACY_COLUMNS,
  BUDGET_PROGRAM_PHASE_16_COLUMNS,
  buildBudgetItemKey,
  decodeBudgetCsv,
  normalizeHierarchyCode,
  parseSourceBudgetRows,
  parseThousandYenAmount,
  SOURCE_BUDGET_ROW_NUMBER,
  serializeBudgetPrograms,
  transformBudgetPrograms,
  validateBudgetProgramLegacyRegression,
  validateBudgetProgramPhase16Regression,
  validateBudgetPrograms,
  validateBudgetProgramSourceTraceability,
  validateGeneralProgramRegression,
  type SourceBudgetRow,
} from "./budget-programs";

function sourceRow(
  overrides: Partial<SourceBudgetRow> = {},
): SourceBudgetRow {
  return {
    年度: "2026",
    当初補正区分名称: "当初",
    会計名称: "一般会計",
    所属名称: "政策＊財政課",
    款: "2",
    款名称: "総務費",
    項: "1",
    項名称: "総務管理費",
    目: "2",
    目名称: "広報広聴費",
    大事業: "1",
    大事業名称: "区政の広報、広聴費",
    予算事業: "1",
    予算事業名称: "区民相談等事業運営",
    内訳事業: "1",
    内訳事業名称: "区民相談等事業運営",
    予算見積額: "32,774",
    充当額: "10,000",
    一般財源額: "22,774",
    ...overrides,
  };
}

function activeAccount(
  overrides: Partial<BudgetAccountDefinition> = {},
): BudgetAccountDefinition {
  return {
    account_code: "general",
    account_name: "一般会計",
    account_type: "general",
    budget_side: "expenditure",
    csv_account_name: "一般会計",
    expected_amount_thousand_yen: 32_774,
    pdf_budget_book_start_page: 310,
    pdf_budget_book_end_page: 479,
    pdf_page_start: 159,
    pdf_page_end: 243,
    status: "active",
    ...overrides,
  };
}

function config(
  accounts: BudgetAccountDefinition[] = [activeAccount()],
): BudgetAccountsConfig {
  return { fiscal_year: 2026, accounts };
}

function departmentMappings(): DepartmentNameMapping[] {
  return [
    {
      department_name_raw: "政策＊財政課",
      parent_department_display_name: "政策経営部",
      section_display_name: "財政課",
      department_display_name: "政策経営部 財政課",
      mapping_status: "matched",
      mapping_source: "official_pdf",
      mapping_note: "テスト",
    },
  ];
}

describe("decodeBudgetCsv", () => {
  it("UTF-8を優先して読み取る", () => {
    const result = decodeBudgetCsv(
      new TextEncoder().encode("年度,会計名称\n2026,一般会計\n"),
    );

    expect(result.encoding).toBe("utf-8");
    expect(result.text).toContain("一般会計");
  });

  it("UTF-8でなければCP932として読み取る", () => {
    const result = decodeBudgetCsv(
      Uint8Array.from([0x94, 0x4e, 0x93, 0x78]),
    );

    expect(result).toEqual({ encoding: "cp932", text: "年度" });
  });
});

describe("normalization", () => {
  it("一般会計の予算項目キーを_区切りで組み立てる", () => {
    expect(
      buildBudgetItemKey({
        fiscalYear: 2026,
        accountName: "一般会計",
        budgetSide: "expenditure",
        kanCode: "1",
        kouCode: "1",
        mokuCode: "1",
      }),
    ).toBe("2026_general_expenditure_01_01_01");
  });

  it("特別会計のaccount_codeを予算項目キーに含める", () => {
    expect(
      buildBudgetItemKey({
        fiscalYear: 2026,
        accountCode: "national_health_insurance",
        accountName: "国民健康保険事業会計",
        budgetSide: "expenditure",
        kanCode: "21",
        kouCode: "1",
        mokuCode: "1",
      }),
    ).toBe(
      "2026_national_health_insurance_expenditure_21_01_01",
    );
  });

  it("階層コードを2桁にする", () => {
    expect(normalizeHierarchyCode(" 2 ", "款")).toBe("02");
    expect(normalizeHierarchyCode("12", "款")).toBe("12");
  });

  it("桁区切りカンマを除去して整数にする", () => {
    expect(parseThousandYenAmount("431,353,010", "予算見積額")).toBe(
      431_353_010,
    );
    expect(parseThousandYenAmount("-3,267,254", "一般財源額")).toBe(
      -3_267_254,
    );
  });
});

describe("budget program transformation", () => {
  it("必要列を持つCSVを解析する", () => {
    const headers = Object.keys(sourceRow());
    const csv = `${headers.join(",")}\n${headers
      .map((header) => {
        const value = sourceRow()[header];
        return value.includes(",") ? `"${value}"` : value;
      })
      .join(",")}\n`;

    const rows = parseSourceBudgetRows(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0][SOURCE_BUDGET_ROW_NUMBER]).toBe(1);
  });

  it("公式行を正規化した予算事業に変換する", () => {
    const programs = transformBudgetPrograms(
      [sourceRow()],
      config(),
      departmentMappings(),
    );

    expect(programs).toEqual([
      expect.objectContaining({
        program_id:
          "2026_general_expenditure_02_01_02_01_01_01",
        budget_item_key: "2026_general_expenditure_02_01_02",
        account_code: "general",
        kan_code: "02",
        kou_code: "01",
        moku_code: "02",
        amount_thousand_yen: 32_774,
        general_revenue_thousand_yen: 22_774,
        allocated_revenue_thousand_yen: 10_000,
        major_program_code: "01",
        budget_program_code: "01",
        detail_program_code: "01",
        budget_program_group_id:
          "2026_general_expenditure_02_01_02_01_01",
        source_type: "official_csv",
        source_file: "ippansaisyutu.csv",
        source_row_number: 1,
        is_zero_amount: false,
        funding_data_status: "raw_source_only",
        department_display_name: "政策経営部 財政課",
        department_mapping_status: "matched",
      }),
    ]);
  });

  it("同じ予算事業の内訳事業に同じgroup_idを付ける", () => {
    const programs = transformBudgetPrograms(
      [
        sourceRow({
          内訳事業: "1",
          予算見積額: "100",
          充当額: "0",
          一般財源額: "100",
        }),
        sourceRow({
          内訳事業: "2",
          予算見積額: "200",
          充当額: "0",
          一般財源額: "200",
        }),
      ],
      config([activeAccount({ expected_amount_thousand_yen: 300 })]),
      departmentMappings(),
    );

    expect(new Set(programs.map((row) => row.budget_program_group_id))).toEqual(
      new Set(["2026_general_expenditure_02_01_02_01_01"]),
    );
  });

  it("0円と負数財源を補正せず原値のまま保持する", () => {
    const [program] = transformBudgetPrograms(
      [
        sourceRow({
          予算見積額: "0",
          充当額: "10",
          一般財源額: "-10",
        }),
      ],
      config([activeAccount({ expected_amount_thousand_yen: 0 })]),
      departmentMappings(),
    );

    expect(program).toEqual(
      expect.objectContaining({
        amount_thousand_yen: 0,
        general_revenue_thousand_yen: -10,
        allocated_revenue_thousand_yen: 10,
        is_zero_amount: true,
        funding_data_status: "raw_source_only",
      }),
    );
  });

  it("設定された全会計を抽出してaccount_code別キーを作る", () => {
    const accounts = [
      activeAccount(),
      activeAccount({
        account_code: "national_health_insurance",
        account_name: "国民健康保険事業会計",
        account_type: "special",
        csv_account_name: "国民健康保険事業会計",
        expected_amount_thousand_yen: 20,
      }),
      activeAccount({
        account_code: "latter_stage_elderly_healthcare",
        account_name: "後期高齢者医療会計",
        account_type: "special",
        csv_account_name: "後期高齢者医療会計",
        expected_amount_thousand_yen: 30,
      }),
      activeAccount({
        account_code: "long_term_care_insurance",
        account_name: "介護保険事業会計",
        account_type: "special",
        csv_account_name: "介護保険事業会計",
        expected_amount_thousand_yen: 40,
      }),
      {
        ...activeAccount(),
        account_code: "school_lunch_fee",
        account_name: "学校給食費会計",
        account_type: "special" as const,
        csv_account_name: "学校給食費会計",
        expected_amount_thousand_yen: 0,
        pdf_budget_book_start_page: null,
        pdf_budget_book_end_page: null,
        pdf_page_start: null,
        pdf_page_end: null,
        status: "abolished_zero" as const,
      },
    ];
    const rows = [
      sourceRow(),
      sourceRow({
        会計名称: "国民健康保険事業会計",
        款: "21",
        予算見積額: "20",
        充当額: "0",
        一般財源額: "20",
      }),
      sourceRow({
        会計名称: "後期高齢者医療会計",
        款: "61",
        予算見積額: "30",
        充当額: "0",
        一般財源額: "30",
      }),
      sourceRow({
        会計名称: "介護保険事業会計",
        款: "41",
        予算見積額: "40",
        充当額: "0",
        一般財源額: "40",
      }),
      sourceRow({
        会計名称: "学校給食費会計",
        款: "71",
        予算見積額: "0",
        充当額: "0",
        一般財源額: "0",
      }),
    ];

    const programs = transformBudgetPrograms(
      rows,
      config(accounts),
      departmentMappings(),
    );
    const validation = validateBudgetPrograms(programs, config(accounts));

    expect(programs).toHaveLength(5);
    expect(
      programs.map((program) => program.budget_item_key),
    ).toContain(
      "2026_national_health_insurance_expenditure_21_01_02",
    );
    expect(
      programs.map((program) => program.budget_item_key),
    ).toContain("2026_school_lunch_fee_expenditure_71_01_02");
    expect(validation.accountAmountTotalsThousandYen).toEqual({
      general: 32_774,
      national_health_insurance: 20,
      latter_stage_elderly_healthcare: 30,
      long_term_care_insurance: 40,
      school_lunch_fee: 0,
    });
  });

  it("重複するprogram_idを拒否する", () => {
    expect(() =>
      transformBudgetPrograms(
        [sourceRow(), sourceRow()],
        config(),
        departmentMappings(),
      ),
    ).toThrow("program_idが重複しています");
  });

  it("合計・ID・キー・財源内訳を検証する", () => {
    const programs = transformBudgetPrograms(
      [sourceRow()],
      config(),
      departmentMappings(),
    );

    expect(validateBudgetPrograms(programs, config())).toEqual({
      rowCount: 1,
      uniqueProgramIdCount: 1,
      budgetItemKeyConsistencyCount: 1,
      revenueBalanceCount: 1,
      accountRowCounts: { general: 1 },
      accountAmountTotalsThousandYen: { general: 32_774 },
      expectedAccountAmountTotalsThousandYen: { general: 32_774 },
      amountTotalThousandYen: 32_774,
      expectedAmountTotalThousandYen: 32_774,
      uniqueBudgetProgramGroupIdCount: 1,
      zeroAmountCount: 0,
      negativeGeneralRevenueCount: 0,
      uniqueDepartmentNameCount: 1,
      departmentMappingStatusCounts: {
        matched: 1,
        already_display: 0,
        needs_review: 0,
      },
      departmentNeedsReviewCount: 0,
    });
  });

  it("budget_item_keyと会計・款・項・目コードの不一致を拒否する", () => {
    const [program] = transformBudgetPrograms(
      [sourceRow()],
      config(),
      departmentMappings(),
    );

    expect(() =>
      validateBudgetPrograms(
        [
          {
            ...program,
            budget_item_key: "2026_general_expenditure_02_01_99",
          },
        ],
        config(),
      ),
    ).toThrow("budget_item_keyと会計・款・項・目コードが一致しません");
  });

  it("財源内訳の不一致を拒否する", () => {
    const [program] = transformBudgetPrograms(
      [sourceRow()],
      config(),
      departmentMappings(),
    );

    expect(() =>
      validateBudgetPrograms(
        [{ ...program, allocated_revenue_thousand_yen: 9_999 }],
        config(),
      ),
    ).toThrow("財源額が一致しません");
  });

  it("更新前19列を全件比較し、一般会計回帰も維持する", () => {
    const programs = transformBudgetPrograms(
      [sourceRow()],
      config(),
      departmentMappings(),
    );
    const priorRows = programs.map((program) =>
      Object.fromEntries(
        BUDGET_PROGRAM_LEGACY_COLUMNS.map((column) => [
          column,
          program[column],
        ]),
      ),
    );
    const priorCsv = stringify(priorRows, {
      columns: [...BUDGET_PROGRAM_LEGACY_COLUMNS],
      header: true,
    });

    expect(
      validateBudgetProgramLegacyRegression(priorCsv, programs),
    ).toEqual({
      rowCount: 1,
      comparedColumnCount: 19,
    });
    expect(validateGeneralProgramRegression(priorCsv, programs)).toEqual({
      rowCount: 1,
      comparedColumnCount: 18,
    });

    const phase16Csv = stringify(
      programs.map((program) => ({
        ...program,
        is_zero_amount: String(program.is_zero_amount),
      })),
      {
      columns: [...BUDGET_PROGRAM_PHASE_16_COLUMNS],
      header: true,
      },
    );
    expect(
      validateBudgetProgramPhase16Regression(phase16Csv, programs),
    ).toEqual({
      rowCount: 1,
      comparedColumnCount: 28,
    });
  });

  it("source_row_numberから元CSV行と既存19列を復元する", () => {
    const sourceRows = [
      sourceRow({ 年度: "2025" }),
      sourceRow(),
    ];
    const programs = transformBudgetPrograms(
      sourceRows,
      config(),
      departmentMappings(),
    );

    expect(programs[0].source_row_number).toBe(2);
    expect(
      validateBudgetProgramSourceTraceability(
        programs,
        sourceRows,
        config(),
      ),
    ).toEqual({
      rowCount: 1,
      recoveredSourceRowCount: 1,
      comparedColumnCount: 19,
    });
  });

  it("Phase 16の28列末尾に部署表示2列を付けて出力する", () => {
    const programs = transformBudgetPrograms(
      [sourceRow()],
      config(),
      departmentMappings(),
    );
    const csv = serializeBudgetPrograms(programs);
    const rows = parse(csv) as string[][];

    expect(rows[0]).toEqual(BUDGET_PROGRAM_COLUMNS);
    expect(rows).toHaveLength(2);
    expect(rows[1][16]).toBe("32774");
    expect(rows[1][19]).toBe("01");
    expect(rows[1][23]).toBe("official_csv");
    expect(rows[1][25]).toBe("1");
    expect(rows[1][26]).toBe("false");
    expect(rows[1][27]).toBe("raw_source_only");
    expect(rows[1][28]).toBe("政策経営部 財政課");
    expect(rows[1][29]).toBe("matched");
  });
});
