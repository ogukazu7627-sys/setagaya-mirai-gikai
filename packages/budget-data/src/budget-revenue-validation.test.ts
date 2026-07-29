import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import { decodeBudgetCsv } from "./budget-programs";
import {
  parseSourceBudgetRevenueRows,
  type BudgetRevenueDetail,
} from "./budget-revenue-details";
import {
  parseBudgetRevenueSectionRows,
} from "./budget-revenue-items";
import {
  parseRevenueValidationDetails,
  parseRevenueValidationItems,
  renderRevenueValidationReport,
  REVENUE_VALIDATION_ERROR_COLUMNS,
  serializeRevenueValidationErrors,
  validateBudgetRevenueData,
  type RevenueValidationInputs,
} from "./budget-revenue-validation";
import type { BudgetAccountsConfig } from "./budget-accounts";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

describe("budget revenue validation", () => {
  let config: BudgetAccountsConfig;
  let normalInputs: RevenueValidationInputs;

  beforeAll(() => {
    config = parseBudgetAccountsConfig(
      fs.readFileSync(
        path.join(repoRoot, "config", "budget-accounts.json"),
        "utf8",
      ),
    );
    const rawPath = path.join(repoRoot, "raw", "ippansainyu.csv");
    const decoded = decodeBudgetCsv(fs.readFileSync(rawPath));
    normalInputs = {
      rawSourceRows: parseSourceBudgetRevenueRows(decoded.text),
      rawSourceFile: path.basename(rawPath),
      details: parseRevenueValidationDetails(
        fs.readFileSync(
          path.join(
            repoRoot,
            "processed", "core", "budget_revenue_details.csv",
          ),
          "utf8",
        ),
      ),
      sections: parseBudgetRevenueSectionRows(
        fs.readFileSync(
          path.join(
            repoRoot,
            "processed", "core", "budget_revenue_sections.csv",
          ),
          "utf8",
        ),
      ),
      items: parseRevenueValidationItems(
        fs.readFileSync(
          path.join(
            repoRoot,
            "processed", "core", "budget_revenue_items.csv",
          ),
          "utf8",
        ),
      ),
    };
  });

  it("正常データはエラー0件・PASSになる", () => {
    const result = validateBudgetRevenueData(normalInputs, config);
    const errorsCsv = serializeRevenueValidationErrors(result.errors);
    const report = renderRevenueValidationReport(result, {
      raw: "raw/ippansainyu.csv",
      details: "processed/core/budget_revenue_details.csv",
      sections: "processed/core/budget_revenue_sections.csv",
      items: "processed/core/budget_revenue_items.csv",
      config: "config/budget-accounts.json",
      errors: "processed/validation/revenue_validation_errors.csv",
    });

    expect(result.isPass).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sourceTraceability.fullyMatchedSourceRows).toBe(2_192);
    expect(errorsCsv.trim()).toBe(
      REVENUE_VALIDATION_ERROR_COLUMNS.join(","),
    );
    expect(report).toContain("**PASS**");
  });

  it("正式なエラーCSVと検証レポートを再現できる", () => {
    const result = validateBudgetRevenueData(normalInputs, config);
    const expectedErrors = serializeRevenueValidationErrors(result.errors);
    const expectedReport = renderRevenueValidationReport(result, {
      raw: "raw/ippansainyu.csv",
      details: "processed/core/budget_revenue_details.csv",
      sections: "processed/core/budget_revenue_sections.csv",
      items: "processed/core/budget_revenue_items.csv",
      config: "config/budget-accounts.json",
      errors: "processed/validation/revenue_validation_errors.csv",
    });

    expect(
      fs.readFileSync(
        path.join(
          repoRoot,
          "processed", "validation", "revenue_validation_errors.csv",
        ),
        "utf8",
      ),
    ).toBe(expectedErrors);
    expect(
      fs.readFileSync(
        path.join(repoRoot, "docs", "validation", "revenue_validation_report.md"),
        "utf8",
      ),
    ).toBe(expectedReport);
  });

  it("detailsの収支式・集約・元行不一致を検出する", () => {
    const details = normalInputs.details.map((detail, index) =>
      index === 0
        ? {
            ...detail,
            current_amount_thousand_yen:
              detail.current_amount_thousand_yen + 1,
          }
        : detail,
    );
    const result = validateBudgetRevenueData(
      { ...normalInputs, details },
      config,
    );
    const errorTypes = new Set(
      result.errors.map((error) => error.error_type),
    );

    expect(result.isPass).toBe(false);
    expect(errorTypes).toContain("detail_amount_mismatch");
    expect(errorTypes).toContain("details_to_sections_mismatch");
    expect(errorTypes).toContain("details_to_items_mismatch");
    expect(errorTypes).toContain("source_record_mismatch");
  });

  it("itemsがdetails・sectionsと異なる場合を両経路で検出する", () => {
    const items = normalInputs.items.map((item, index) =>
      index === 0
        ? {
            ...item,
            current_amount_thousand_yen:
              item.current_amount_thousand_yen + 1,
          }
        : item,
    );
    const result = validateBudgetRevenueData(
      { ...normalInputs, items },
      config,
    );
    const errorTypes = new Set(
      result.errors.map((error) => error.error_type),
    );

    expect(errorTypes).toContain("details_to_items_mismatch");
    expect(errorTypes).toContain("sections_to_items_mismatch");
  });

  it("source_row_number重複・欠落と財源分類誤りを検出する", () => {
    const first = normalInputs.details[0];
    const second = normalInputs.details[1];
    const details = normalInputs.details.map((detail, index) => {
      if (index === 0) {
        return {
          ...detail,
          funding_nature:
            detail.funding_nature === "general"
              ? "specific"
              : "general",
        } as BudgetRevenueDetail;
      }
      if (index === 1) {
        return {
          ...second,
          source_row_number: first.source_row_number,
        };
      }
      return detail;
    });
    const result = validateBudgetRevenueData(
      { ...normalInputs, details },
      config,
    );
    const errorTypes = new Set(
      result.errors.map((error) => error.error_type),
    );

    expect(errorTypes).toContain("funding_nature_mismatch");
    expect(errorTypes).toContain("duplicate_source_row_number");
    expect(errorTypes).toContain("missing_source_row_number");
  });

  it("学校給食費会計の非0円を検出する", () => {
    const targetIndex = normalInputs.details.findIndex(
      (detail) => detail.account_code === "school_lunch_fee",
    );
    const details = normalInputs.details.map((detail, index) =>
      index === targetIndex
        ? {
            ...detail,
            current_amount_thousand_yen: 1,
          }
        : detail,
    );
    const result = validateBudgetRevenueData(
      { ...normalInputs, details },
      config,
    );

    expect(
      result.errors.some(
        (error) => error.error_type === "school_lunch_nonzero_amount",
      ),
    ).toBe(true);
  });
});
