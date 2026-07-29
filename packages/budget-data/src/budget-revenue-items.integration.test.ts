import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { EXPECTED_BUDGET_REVENUE_TOTAL } from "./budget-revenue-details";
import {
  EXPECTED_BUDGET_REVENUE_ITEM_ACCOUNT_COUNTS,
  EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT,
  parseBudgetRevenueSectionRows,
  serializeBudgetRevenueItems,
  transformBudgetRevenueItems,
  validateBudgetRevenueItems,
  validateSerializedBudgetRevenueItems,
  type BudgetRevenueItem,
  type BudgetRevenueItemValidation,
} from "./budget-revenue-items";
import {
  parseBudgetRevenueDetailRows,
  type BudgetRevenueSection,
  type BudgetRevenueSectionSourceDetail,
} from "./budget-revenue-sections";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const detailsPath = path.join(
  repoRoot,
  "processed", "core", "budget_revenue_details.csv",);
const sectionsPath = path.join(
  repoRoot,
  "processed", "core", "budget_revenue_sections.csv",);
const itemsPath = path.join(
  repoRoot,
  "processed", "core", "budget_revenue_items.csv",);

describe("budget revenue items integration", () => {
  let details: BudgetRevenueSectionSourceDetail[];
  let sections: BudgetRevenueSection[];
  let items: BudgetRevenueItem[];
  let validation: BudgetRevenueItemValidation;
  let outputCsv: string;

  beforeAll(() => {
    details = parseBudgetRevenueDetailRows(
      fs.readFileSync(detailsPath, "utf8"),
    );
    sections = parseBudgetRevenueSectionRows(
      fs.readFileSync(sectionsPath, "utf8"),
    );
    items = transformBudgetRevenueItems(details, sections);
    validation = validateBudgetRevenueItems(items, details, sections);
    outputCsv = fs.readFileSync(itemsPath, "utf8");
  });

  it("175目へ2,192明細と650節を欠落なく集約する", () => {
    expect(validation.rowCount).toBe(
      EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT,
    );
    expect(validation.uniqueRevenueItemKeyCount).toBe(
      EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT,
    );
    expect(validation.accountItemCounts).toEqual(
      EXPECTED_BUDGET_REVENUE_ITEM_ACCOUNT_COUNTS,
    );
    expect(validation.detailCountTotal).toBe(2_192);
    expect(validation.sectionCountTotal).toBe(650);
  });

  it("二経路の総額・一般会計財源・statusが一致する", () => {
    expect(validation.detailsCurrentAmountTotalThousandYen).toBe(
      EXPECTED_BUDGET_REVENUE_TOTAL,
    );
    expect(validation.sectionsCurrentAmountTotalThousandYen).toBe(
      EXPECTED_BUDGET_REVENUE_TOTAL,
    );
    expect(validation.itemsCurrentAmountTotalThousandYen).toBe(
      EXPECTED_BUDGET_REVENUE_TOTAL,
    );
    expect(
      validation.accountCurrentAmountTotalsThousandYen.general,
    ).toBe(431_353_010);
    expect(
      validation.accountGeneralRevenueTotalsThousandYen.general,
    ).toBe(279_402_113);
    expect(
      validation.accountSpecificRevenueTotalsThousandYen.general,
    ).toBe(151_950_897);
    expect(validation.statusCounts).toEqual({
      ok: 166,
      ok_zero_amount: 9,
      error_section_mismatch: 0,
      error_amount_mismatch: 0,
    });
    expect(validation.isPass).toBe(true);
  });

  it("正式出力が二つの入力からの再生成結果と完全一致する", () => {
    expect(() =>
      validateSerializedBudgetRevenueItems(outputCsv, items),
    ).not.toThrow();
    expect(outputCsv).toBe(serializeBudgetRevenueItems(items));
  });
});
