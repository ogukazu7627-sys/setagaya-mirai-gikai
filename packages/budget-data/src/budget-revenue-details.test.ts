import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { describe, expect, it } from "vitest";
import type {
  BudgetAccountDefinition,
  BudgetAccountsConfig,
} from "./budget-accounts";
import {
  BUDGET_REVENUE_DETAIL_COLUMNS,
  parseSourceBudgetRevenueRows,
  serializeBudgetRevenueDetails,
  transformBudgetRevenueDetails,
  validateBudgetRevenueDetails,
  validateBudgetRevenueSourceTraceability,
  validateSerializedBudgetRevenueDetails,
  type SourceBudgetRevenueRow,
} from "./budget-revenue-details";

function account(
  overrides: Partial<BudgetAccountDefinition> = {},
): BudgetAccountDefinition {
  return {
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
    ...overrides,
  };
}

function config(
  accounts: BudgetAccountDefinition[] = [account()],
): BudgetAccountsConfig {
  return {
    fiscal_year: 2026,
    accounts,
  };
}

function sourceRow(
  overrides: Partial<SourceBudgetRevenueRow> = {},
): SourceBudgetRevenueRow {
  return {
    年度: "2026",
    当初補正区分名称: "当初",
    所属: "2045100000",
    所属名称: "政策経営部＊財政課",
    歳入番号: "100",
    歳入番号名称: "財政調整基金繰入金",
    会計名称: "一般会計",
    款: "18",
    款名称: "繰入金",
    項: "2",
    項名称: "基金繰入金",
    目: "1",
    目名称: "財政調整基金繰入金",
    節: "1",
    節名称: "財政調整基金繰入金",
    細節: "1",
    細節名称: "財政調整基金繰入金",
    予算前額: "9",
    予算要求額: "11",
    予算見積額: "10",
    現計予算額: "10",
    現計充当額: "4",
    現計未充当額: "6",
    財源区分: "1",
    財源区分名称: "一般財源",
    要求内容: "要求内容",
    査定内容: "査定内容",
    ...overrides,
  };
}

function sourceCsv(rows: SourceBudgetRevenueRow[]): string {
  return stringify(rows, {
    columns: Object.keys(sourceRow()),
    header: true,
  });
}

describe("budget revenue details", () => {
  it("一般会計の公式歳入行を36列の詳細行へ変換する", () => {
    const details = transformBudgetRevenueDetails(
      [sourceRow()],
      config(),
      "ippansainyu.csv",
    );

    expect(details).toHaveLength(1);
    expect(details[0]).toMatchObject({
      revenue_detail_id:
        "rd_2026_general_revenue_18_02_01_01_01_2045100000",
      revenue_section_id:
        "rs_2026_general_revenue_18_02_01_01",
      revenue_item_key: "2026_general_revenue_18_02_01",
      fiscal_year: 2026,
      account_code: "general",
      budget_side: "revenue",
      kan_code: "18",
      kou_code: "02",
      moku_code: "01",
      setsu_code: "01",
      saisetsu_code: "01",
      department_code: "2045100000",
      source_revenue_number: "100",
      funding_nature: "general",
      previous_amount_thousand_yen: 9,
      requested_amount_thousand_yen: 11,
      estimated_amount_thousand_yen: 10,
      current_amount_thousand_yen: 10,
      allocated_amount_thousand_yen: 4,
      unallocated_amount_thousand_yen: 6,
      is_zero_amount: false,
      source_type: "official_csv",
      source_file: "ippansainyu.csv",
      source_row_number: 1,
    });
  });

  it("一般会計の一般財源以外と特別会計を分類する", () => {
    const specialAccount = account({
      account_code: "national_health_insurance",
      account_name: "国民健康保険事業会計",
      account_type: "special",
      csv_account_name: "国民健康保険事業会計",
      expected_amount_thousand_yen: 0,
    });
    const details = transformBudgetRevenueDetails(
      [
        sourceRow({
          現計予算額: "0",
          現計充当額: "0",
          現計未充当額: "0",
          財源区分名称: "国庫支出金",
        }),
        sourceRow({
          会計名称: "国民健康保険事業会計",
          所属: "2075100000",
          現計予算額: "0",
          現計充当額: "0",
          現計未充当額: "0",
          財源区分名称: "一般財源",
        }),
      ],
      config([
        account({ expected_amount_thousand_yen: 0 }),
        specialAccount,
      ]),
    );

    expect(details.map((detail) => detail.funding_nature).sort()).toEqual([
      "special_account",
      "specific",
    ]);
    expect(details.every((detail) => detail.is_zero_amount)).toBe(true);
  });

  it("元CSV全体での論理行番号を保持して全36列を復元する", () => {
    const rows = parseSourceBudgetRevenueRows(
      sourceCsv([
        sourceRow({ 年度: "2025" }),
        sourceRow({ 歳入番号: "101" }),
      ]),
    );
    const details = transformBudgetRevenueDetails(
      rows,
      config(),
      "ippansainyu.csv",
    );
    const traceability = validateBudgetRevenueSourceTraceability(
      details,
      rows,
      config(),
      "ippansainyu.csv",
    );

    expect(details[0].source_row_number).toBe(2);
    expect(traceability).toEqual({
      rowCount: 1,
      recoveredSourceRowCount: 1,
      comparedColumnCount: 36,
    });
  });

  it("ID衝突時は歳入番号を勝手に追加せず原因を報告する", () => {
    expect(() =>
      transformBudgetRevenueDetails(
        [
          sourceRow({ 歳入番号: "100" }),
          sourceRow({ 歳入番号: "101" }),
        ],
        config([account({ expected_amount_thousand_yen: 20 })]),
      ),
    ).toThrow(
      "source_revenue_numberをID末尾へ追加する要否の確認が必要です",
    );
  });

  it("金額・ID・0円フラグを検証しUTF-8用CSVを再読込できる", () => {
    const details = transformBudgetRevenueDetails(
      [sourceRow()],
      config(),
    );
    const validation = validateBudgetRevenueDetails(details, config());
    const csv = serializeBudgetRevenueDetails(details);
    const serializedValidation =
      validateSerializedBudgetRevenueDetails(csv, details);
    const records = parse(csv) as string[][];

    expect(validation).toMatchObject({
      rowCount: 1,
      uniqueRevenueDetailIdCount: 1,
      uniqueRevenueItemKeyCount: 1,
      uniqueRevenueSectionIdCount: 1,
      balancedRowCount: 1,
      zeroFlagConsistentCount: 1,
      currentAmountTotalThousandYen: 10,
    });
    expect(records[0]).toEqual(BUDGET_REVENUE_DETAIL_COLUMNS);
    expect(records[1][32]).toBe("false");
    expect(serializedValidation).toEqual({
      rowCount: 1,
      columnCount: 36,
    });
  });

  it("現計予算額と充当・未充当額の不一致を拒否する", () => {
    const details = transformBudgetRevenueDetails(
      [sourceRow({ 現計未充当額: "5" })],
      config(),
    );

    expect(() =>
      validateBudgetRevenueDetails(details, config()),
    ).toThrow("現計予算額と充当・未充当額が一致しません");
  });
});
