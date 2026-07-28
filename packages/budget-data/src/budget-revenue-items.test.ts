import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import type { BudgetRevenueDetail } from "./budget-revenue-details";
import {
  BUDGET_REVENUE_ITEM_COLUMNS,
  parseBudgetRevenueSectionRows,
  serializeBudgetRevenueItems,
  transformBudgetRevenueItems,
  validateBudgetRevenueItems,
  validateSerializedBudgetRevenueItems,
} from "./budget-revenue-items";
import {
  serializeBudgetRevenueSections,
  transformBudgetRevenueSections,
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

function twoSectionDetails(): BudgetRevenueDetail[] {
  return [
    detail(),
    detail({
      revenue_detail_id:
        "rd_2026_general_revenue_12_01_01_02_01_2075100000",
      revenue_section_id:
        "rs_2026_general_revenue_12_01_01_02",
      setsu_code: "02",
      setsu_name: "総務手数料",
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
  ];
}

describe("budget revenue item source parsing", () => {
  it("Phase 22の25列CSVを解析する", () => {
    const details = twoSectionDetails();
    const sections = transformBudgetRevenueSections(details);
    const parsed = parseBudgetRevenueSectionRows(
      serializeBudgetRevenueSections(sections),
    );

    expect(parsed).toEqual(sections);
  });
});

describe("budget revenue item transformation", () => {
  it("detailsを直接集約しsectionsと独立突合する", () => {
    const details = twoSectionDetails();
    const sections = transformBudgetRevenueSections(details);
    const items = transformBudgetRevenueItems(details, sections);

    expect(items).toEqual([
      {
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
        previous_amount_thousand_yen: 80,
        current_amount_thousand_yen: 100,
        diff_amount_thousand_yen: 20,
        allocated_amount_thousand_yen: 40,
        unallocated_amount_thousand_yen: 60,
        general_revenue_thousand_yen: 70,
        specific_revenue_thousand_yen: 30,
        special_account_revenue_thousand_yen: 0,
        section_count: 2,
        detail_count: 2,
        validation_status: "ok",
        source_type: "derived",
      },
    ]);
  });

  it("sectionsが異なっても出力金額はdetails集計値を保持する", () => {
    const details = twoSectionDetails();
    const sections = transformBudgetRevenueSections(details);
    sections[0] = {
      ...sections[0],
      current_amount_thousand_yen: 69,
      diff_amount_thousand_yen: 9,
      allocated_amount_thousand_yen: 29,
      general_revenue_thousand_yen: 69,
    };
    const item = transformBudgetRevenueItems(details, sections)[0];

    expect(item).toMatchObject({
      current_amount_thousand_yen: 100,
      allocated_amount_thousand_yen: 40,
      general_revenue_thousand_yen: 70,
      validation_status: "error_section_mismatch",
    });
  });

  it("detailsとsectionsが一致しても収支式不一致ならerrorにする", () => {
    const details = [
      detail({
        current_amount_thousand_yen: 10,
        allocated_amount_thousand_yen: 4,
        unallocated_amount_thousand_yen: 5,
      }),
    ];
    const sections = transformBudgetRevenueSections(details);
    const item = transformBudgetRevenueItems(details, sections)[0];

    expect(item.validation_status).toBe("error_amount_mismatch");
  });

  it("detailsとsectionsがともに0ならok_zero_amountにする", () => {
    const details = [
      detail({
        current_amount_thousand_yen: 0,
        allocated_amount_thousand_yen: 0,
        unallocated_amount_thousand_yen: 0,
        funding_nature: "specific",
        is_zero_amount: true,
      }),
    ];
    const sections = transformBudgetRevenueSections(details);
    const item = transformBudgetRevenueItems(details, sections)[0];

    expect(item).toMatchObject({
      current_amount_thousand_yen: 0,
      validation_status: "ok_zero_amount",
    });
  });

  it("特別会計の財源を直接special_accountへ集約する", () => {
    const details = [
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
      }),
    ];
    const sections = transformBudgetRevenueSections(details);
    const item = transformBudgetRevenueItems(details, sections)[0];

    expect(item).toMatchObject({
      general_revenue_thousand_yen: 0,
      specific_revenue_thousand_yen: 0,
      special_account_revenue_thousand_yen: 70,
      validation_status: "ok",
    });
  });

  it("同一item内の名称不一致を拒否する", () => {
    const details = twoSectionDetails();
    details[1] = {
      ...details[1],
      moku_name: "不一致の目名称",
    };

    expect(() =>
      transformBudgetRevenueItems(
        details,
        transformBudgetRevenueSections([details[0]]),
      ),
    ).toThrow(
      "budget_revenue_details.csv内で同一revenue_item_keyのmokuName",
    );
  });
});

describe("budget revenue item validation and serialization", () => {
  it("件数・二経路総額・23列出力を検証する", () => {
    const details = twoSectionDetails();
    const sections = transformBudgetRevenueSections(details);
    const items = transformBudgetRevenueItems(details, sections);
    const validation = validateBudgetRevenueItems(
      items,
      details,
      sections,
    );
    const csv = serializeBudgetRevenueItems(items);
    const serializedValidation =
      validateSerializedBudgetRevenueItems(csv, items);
    const records = parse(csv) as string[][];

    expect(validation).toMatchObject({
      rowCount: 1,
      uniqueRevenueItemKeyCount: 1,
      sourceDetailRowCount: 2,
      sourceSectionRowCount: 2,
      detailCountTotal: 2,
      sectionCountTotal: 2,
      reconciledItemCount: 1,
      detailsCurrentAmountTotalThousandYen: 100,
      sectionsCurrentAmountTotalThousandYen: 100,
      itemsCurrentAmountTotalThousandYen: 100,
      errorStatusCount: 0,
      isPass: true,
    });
    expect(records[0]).toEqual(BUDGET_REVENUE_ITEM_COLUMNS);
    expect(serializedValidation).toEqual({
      rowCount: 1,
      columnCount: 23,
    });
  });
});
