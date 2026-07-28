import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
  EXPECTED_BUDGET_REVENUE_TOTAL,
} from "./budget-revenue-details";
import {
  EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
  parseBudgetRevenueDetailRows,
  serializeBudgetRevenueSections,
  transformBudgetRevenueSections,
  validateBudgetRevenueSections,
  validateSerializedBudgetRevenueSections,
  type BudgetRevenueSection,
  type BudgetRevenueSectionSourceDetail,
  type BudgetRevenueSectionValidation,
} from "./budget-revenue-sections";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const detailsPath = path.join(
  repoRoot,
  "processed",
  "budget_revenue_details.csv",
);
const sectionsPath = path.join(
  repoRoot,
  "processed",
  "budget_revenue_sections.csv",
);

describe("budget revenue sections integration", () => {
  let details: BudgetRevenueSectionSourceDetail[];
  let sections: BudgetRevenueSection[];
  let validation: BudgetRevenueSectionValidation;
  let outputCsv: string;

  beforeAll(() => {
    details = parseBudgetRevenueDetailRows(
      fs.readFileSync(detailsPath, "utf8"),
    );
    sections = transformBudgetRevenueSections(details);
    validation = validateBudgetRevenueSections(sections, details);
    outputCsv = fs.readFileSync(sectionsPath, "utf8");
  });

  it("650節へ全2,192明細を欠落なく集約する", () => {
    expect(validation.rowCount).toBe(
      EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
    );
    expect(validation.uniqueRevenueSectionIdCount).toBe(
      EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
    );
    expect(validation.sourceDetailRowCount).toBe(
      EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
    );
    expect(validation.detailCountTotal).toBe(
      EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
    );
    expect(validation.detailCountMatchedCount).toBe(
      EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
    );
  });

  it("会計別・財源区分別の金額とstatus件数が一致する", () => {
    expect(
      validation.accountCurrentAmountTotalsThousandYen,
    ).toEqual({
      general: 431_353_010,
      latter_stage_elderly_healthcare: 29_414_796,
      long_term_care_insurance: 76_058_953,
      national_health_insurance: 84_206_905,
      school_lunch_fee: 0,
    });
    expect(validation.detailsCurrentAmountTotalThousandYen).toBe(
      EXPECTED_BUDGET_REVENUE_TOTAL,
    );
    expect(validation.sectionsCurrentAmountTotalThousandYen).toBe(
      EXPECTED_BUDGET_REVENUE_TOTAL,
    );
    expect(validation.generalRevenueTotalThousandYen).toBe(279_402_113);
    expect(validation.specificRevenueTotalThousandYen).toBe(
      151_950_897,
    );
    expect(validation.specialAccountRevenueTotalThousandYen).toBe(
      189_680_654,
    );
    expect(validation.statusCounts).toEqual({
      ok: 597,
      ok_zero_amount: 53,
      error_amount_mismatch: 0,
    });
    expect(validation.isPass).toBe(true);
  });

  it("正式出力が入力明細からの再生成結果と完全一致する", () => {
    expect(() =>
      validateSerializedBudgetRevenueSections(outputCsv, sections),
    ).not.toThrow();
    expect(outputCsv).toBe(serializeBudgetRevenueSections(sections));
  });
});
