import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import { decodeBudgetCsv } from "./budget-programs";
import {
  EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
  EXPECTED_BUDGET_REVENUE_TOTAL,
  EXPECTED_REVENUE_ITEM_KEY_COUNT,
  EXPECTED_REVENUE_SECTION_ID_COUNT,
  parseSourceBudgetRevenueRows,
  serializeBudgetRevenueDetails,
  transformBudgetRevenueDetails,
  validateBudgetRevenueDetails,
  validateBudgetRevenueSourceTraceability,
  validateSerializedBudgetRevenueDetails,
  type BudgetRevenueDetail,
  type BudgetRevenueDetailValidation,
} from "./budget-revenue-details";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const sourcePath = path.join(repoRoot, "raw", "ippansainyu.csv");
const configPath = path.join(
  repoRoot,
  "config",
  "budget-accounts.json",
);
const outputPath = path.join(
  repoRoot,
  "processed", "core", "budget_revenue_details.csv",);

describe("budget revenue details integration", () => {
  let details: BudgetRevenueDetail[];
  let validation: BudgetRevenueDetailValidation;
  let outputCsv: string;
  let recoveredSourceRowCount: number;

  beforeAll(() => {
    const decoded = decodeBudgetCsv(fs.readFileSync(sourcePath));
    const sourceRows = parseSourceBudgetRevenueRows(decoded.text);
    const config = parseBudgetAccountsConfig(
      fs.readFileSync(configPath, "utf8"),
    );
    details = transformBudgetRevenueDetails(
      sourceRows,
      config,
      path.basename(sourcePath),
    );
    validation = validateBudgetRevenueDetails(details, config);
    recoveredSourceRowCount =
      validateBudgetRevenueSourceTraceability(
        details,
        sourceRows,
        config,
        path.basename(sourcePath),
      ).recoveredSourceRowCount;
    outputCsv = fs.readFileSync(outputPath, "utf8");
  });

  it("指定された行数・ID種類数・金額を満たす", () => {
    expect(validation.rowCount).toBe(
      EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
    );
    expect(validation.uniqueRevenueDetailIdCount).toBe(
      EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
    );
    expect(validation.uniqueRevenueItemKeyCount).toBe(
      EXPECTED_REVENUE_ITEM_KEY_COUNT,
    );
    expect(validation.uniqueRevenueSectionIdCount).toBe(
      EXPECTED_REVENUE_SECTION_ID_COUNT,
    );
    expect(validation.currentAmountTotalThousandYen).toBe(
      EXPECTED_BUDGET_REVENUE_TOTAL,
    );
    expect(
      validation.accountCurrentAmountTotalsThousandYen,
    ).toEqual({
      general: 431_353_010,
      national_health_insurance: 84_206_905,
      latter_stage_elderly_healthcare: 29_414_796,
      long_term_care_insurance: 76_058_953,
      school_lunch_fee: 0,
    });
  });

  it("全行で金額式・0円フラグ・元行復元が成立する", () => {
    expect(validation.balancedRowCount).toBe(details.length);
    expect(validation.zeroFlagConsistentCount).toBe(details.length);
    expect(recoveredSourceRowCount).toBe(details.length);
  });

  it("正式出力が原CSVからの再生成結果と完全一致する", () => {
    expect(() =>
      validateSerializedBudgetRevenueDetails(outputCsv, details),
    ).not.toThrow();
    expect(outputCsv).toBe(serializeBudgetRevenueDetails(details));
  });
});
