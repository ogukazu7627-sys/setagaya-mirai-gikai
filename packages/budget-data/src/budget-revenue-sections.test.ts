import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import {
  serializeBudgetRevenueDetails,
  type BudgetRevenueDetail,
} from "./budget-revenue-details";
import {
  BUDGET_REVENUE_SECTION_COLUMNS,
  parseBudgetRevenueDetailRows,
  serializeBudgetRevenueSections,
  transformBudgetRevenueSections,
  validateBudgetRevenueSections,
  validateSerializedBudgetRevenueSections,
} from "./budget-revenue-sections";

function detail(
  overrides: Partial<BudgetRevenueDetail> = {},
): BudgetRevenueDetail {
  return {
    revenue_detail_id:
      "rd_2026_general_revenue_12_01_01_01_01_2045100000",
    revenue_section_id:
      "rs_2026_general_revenue_12_01_01_01",
    revenue_item_key: "2026_general_revenue_12_01_01",
    fiscal_year: 2026,
    account_code: "general",
    account_name: "一般会計",
    budget_side: "revenue",
    kan_code: "12",
    kan_name: "使用料及手数料",
    kou_code: "01",
    kou_name: "使用料",
    moku_code: "01",
    moku_name: "総務使用料",
    setsu_code: "01",
    setsu_name: "総務管理使用料",
    saisetsu_code: "01",
    saisetsu_name: "庁舎使用料",
    department_code: "2045100000",
    department_name: "政策経営部＊財政課",
    source_revenue_number: "100",
    source_revenue_number_name: "庁舎使用料",
    source_funding_category_code: "1",
    source_funding_category_name: "一般財源",
    funding_nature: "general",
    previous_amount_thousand_yen: 60,
    requested_amount_thousand_yen: 70,
    estimated_amount_thousand_yen: 70,
    current_amount_thousand_yen: 70,
    allocated_amount_thousand_yen: 30,
    unallocated_amount_thousand_yen: 40,
    request_content: "",
    assessment_content: "",
    is_zero_amount: false,
    source_type: "official_csv",
    source_file: "ippansainyu.csv",
    source_row_number: 1,
    ...overrides,
  };
}

describe("budget revenue section source parsing", () => {
  it("Phase 21の36列CSVを解析する", () => {
    const csv = serializeBudgetRevenueDetails([detail()]);
    const rows = parseBudgetRevenueDetailRows(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      revenue_section_id:
        "rs_2026_general_revenue_12_01_01_01",
      current_amount_thousand_yen: 70,
      funding_nature: "general",
    });
  });
});

describe("budget revenue section transformation", () => {
  it("一般会計を節単位で集約し一般財源と特定財源を分ける", () => {
    const sections = transformBudgetRevenueSections([
      detail(),
      detail({
        revenue_detail_id:
          "rd_2026_general_revenue_12_01_01_01_02_2075100000",
        saisetsu_code: "02",
        department_code: "2075100000",
        source_revenue_number: "101",
        funding_nature: "specific",
        source_funding_category_name: "国庫支出金",
        previous_amount_thousand_yen: 20,
        requested_amount_thousand_yen: 30,
        estimated_amount_thousand_yen: 30,
        current_amount_thousand_yen: 30,
        allocated_amount_thousand_yen: 10,
        unallocated_amount_thousand_yen: 20,
        source_row_number: 2,
      }),
    ]);

    expect(sections).toEqual([
      {
        revenue_section_id:
          "rs_2026_general_revenue_12_01_01_01",
        revenue_item_key: "2026_general_revenue_12_01_01",
        fiscal_year: 2026,
        account_code: "general",
        account_name: "一般会計",
        budget_side: "revenue",
        kan_code: "12",
        kan_name: "使用料及手数料",
        kou_code: "01",
        kou_name: "使用料",
        moku_code: "01",
        moku_name: "総務使用料",
        setsu_code: "01",
        setsu_name: "総務管理使用料",
        previous_amount_thousand_yen: 80,
        current_amount_thousand_yen: 100,
        diff_amount_thousand_yen: 20,
        allocated_amount_thousand_yen: 40,
        unallocated_amount_thousand_yen: 60,
        general_revenue_thousand_yen: 70,
        specific_revenue_thousand_yen: 30,
        special_account_revenue_thousand_yen: 0,
        detail_count: 2,
        validation_status: "ok",
        source_type: "derived",
      },
    ]);
  });

  it("特別会計のcurrent_amountをspecial_account_revenueへ集約する", () => {
    const sections = transformBudgetRevenueSections([
      detail({
        revenue_detail_id:
          "rd_2026_national_health_insurance_revenue_21_01_01_01_01_2075100000",
        revenue_section_id:
          "rs_2026_national_health_insurance_revenue_21_01_01_01",
        revenue_item_key:
          "2026_national_health_insurance_revenue_21_01_01",
        account_code: "national_health_insurance",
        account_name: "国民健康保険事業会計",
        kan_code: "21",
        kan_name: "国民健康保険料",
        funding_nature: "special_account",
        previous_amount_thousand_yen: 25,
        current_amount_thousand_yen: 30,
        allocated_amount_thousand_yen: 30,
        unallocated_amount_thousand_yen: 0,
      }),
    ]);

    expect(sections[0]).toMatchObject({
      account_code: "national_health_insurance",
      general_revenue_thousand_yen: 0,
      specific_revenue_thousand_yen: 0,
      special_account_revenue_thousand_yen: 30,
      validation_status: "ok",
    });
  });

  it("0円節と金額不一致をそれぞれ判定する", () => {
    const zero = transformBudgetRevenueSections([
      detail({
        previous_amount_thousand_yen: 5,
        current_amount_thousand_yen: 0,
        allocated_amount_thousand_yen: 0,
        unallocated_amount_thousand_yen: 0,
        is_zero_amount: true,
      }),
    ])[0];
    const mismatch = transformBudgetRevenueSections([
      detail({
        current_amount_thousand_yen: 10,
        allocated_amount_thousand_yen: 4,
        unallocated_amount_thousand_yen: 5,
      }),
    ])[0];

    expect(zero).toMatchObject({
      diff_amount_thousand_yen: -5,
      validation_status: "ok_zero_amount",
    });
    expect(mismatch.validation_status).toBe("error_amount_mismatch");
  });

  it("同一section内の名称不一致を拒否する", () => {
    expect(() =>
      transformBudgetRevenueSections([
        detail(),
        detail({
          revenue_detail_id:
            "rd_2026_general_revenue_12_01_01_01_02_2075100000",
          setsu_name: "不一致の節名称",
        }),
      ]),
    ).toThrow("同一revenue_section_id内でsetsu_nameが一致しません");
  });

  it("会計とfunding_natureの矛盾を拒否する", () => {
    expect(() =>
      transformBudgetRevenueSections([
        detail({ funding_nature: "special_account" }),
      ]),
    ).toThrow("一般会計にspecial_accountの財源分類があります");
  });
});

describe("budget revenue section validation and serialization", () => {
  it("detail_count・総額・ステータスと25列出力を検証する", () => {
    const details = [detail()];
    const sections = transformBudgetRevenueSections(details);
    const validation = validateBudgetRevenueSections(sections, details);
    const csv = serializeBudgetRevenueSections(sections);
    const serializedValidation =
      validateSerializedBudgetRevenueSections(csv, sections);
    const records = parse(csv) as string[][];

    expect(validation).toMatchObject({
      rowCount: 1,
      uniqueRevenueSectionIdCount: 1,
      sourceDetailRowCount: 1,
      detailCountTotal: 1,
      detailCountMatchedCount: 1,
      detailsCurrentAmountTotalThousandYen: 70,
      sectionsCurrentAmountTotalThousandYen: 70,
      generalRevenueTotalThousandYen: 70,
      specificRevenueTotalThousandYen: 0,
      specialAccountRevenueTotalThousandYen: 0,
      errorStatusCount: 0,
      isPass: true,
    });
    expect(records[0]).toEqual(BUDGET_REVENUE_SECTION_COLUMNS);
    expect(serializedValidation).toEqual({
      rowCount: 1,
      columnCount: 25,
    });
  });

  it("detail_countが入力明細と異なる出力を拒否する", () => {
    const details = [detail()];
    const sections = transformBudgetRevenueSections(details);
    sections[0] = {
      ...sections[0],
      detail_count: 2,
    };

    expect(() =>
      validateBudgetRevenueSections(sections, details),
    ).toThrow("歳入節の集約値が明細と一致しません");
  });
});
