import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import { parseBudgetProgramIdentitySourceGroups } from "./budget-program-identities";
import { decodeBudgetCsv } from "./budget-programs";
import { parseSourceBudgetRevenueRows } from "./budget-revenue-details";
import { parseBudgetRevenueSectionRows } from "./budget-revenue-items";
import {
  parseRevenueValidationDetails,
  parseRevenueValidationItems,
  validateBudgetRevenueData,
} from "./budget-revenue-validation";
import {
  type IdentityResolvedBudgetRevenueAllocation,
  parseBudgetRevenueAllocationsForIdentityResolution,
} from "./revenue-allocation-identity-resolution";
import {
  REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS,
  type RevenueAllocationValidationInputs,
  renderBudgetRevenueDataDictionary,
  renderRevenueAllocationValidationReport,
  serializeRevenueAllocationValidationErrors,
  validateRevenueAllocationData,
} from "./revenue-allocation-validation";
import {
  type RawPdfRevenueAllocation,
  parseRawPdfRevenueAllocations,
} from "./revenue-allocation-source-matches";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

describe("Phase 30 実データ総合検証", () => {
  let normalInputs: RevenueAllocationValidationInputs;

  beforeAll(async () => {
    const [
      rawRevenueBytes,
      accountsJson,
      revenueDetailsCsv,
      revenueSectionsCsv,
      revenueItemsCsv,
      rawPdfAllocationsCsv,
      programGroupsCsv,
      allocationsCsv,
      budgetProgramsCsv,
      budgetSectionsCsv,
      budgetItemsCsv,
    ] = await Promise.all([
      fs.readFile(path.join(repoRoot, "raw", "ippansainyu.csv")),
      fs.readFile(
        path.join(repoRoot, "config", "budget-accounts.json"),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_revenue_details.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_revenue_sections.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_revenue_items.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "raw_pdf_revenue_allocations.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_program_groups.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_revenue_allocations.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "processed", "budget_programs.csv"),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "processed", "budget_sections.csv"),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "processed", "budget_items.csv"),
        "utf8",
      ),
    ]);
    const config = parseBudgetAccountsConfig(accountsJson);
    const decodedRawRevenue = decodeBudgetCsv(rawRevenueBytes);
    const details =
      parseRevenueValidationDetails(revenueDetailsCsv);
    const sections = parseBudgetRevenueSectionRows(
      revenueSectionsCsv,
    );
    const items = parseRevenueValidationItems(revenueItemsCsv);
    const phase24 = validateBudgetRevenueData(
      {
        rawSourceRows: parseSourceBudgetRevenueRows(
          decodedRawRevenue.text,
        ),
        rawSourceFile: "ippansainyu.csv",
        details,
        sections,
        items,
      },
      config,
    );

    normalInputs = {
      phase24,
      details,
      rawAllocations: parseRawPdfRevenueAllocations(
        rawPdfAllocationsCsv,
      ),
      programGroups:
        parseBudgetProgramIdentitySourceGroups(programGroupsCsv),
      allocations:
        parseBudgetRevenueAllocationsForIdentityResolution(
          allocationsCsv,
        ),
      config,
      coreCsvTexts: {
        budgetPrograms: budgetProgramsCsv,
        budgetSections: budgetSectionsCsv,
        budgetItems: budgetItemsCsv,
        budgetProgramGroups: programGroupsCsv,
      },
    };
  });

  it("Phase 24を維持し全1,948関係をエラー0件で検証する", () => {
    const result = validateRevenueAllocationData(normalInputs);

    expect(result.isPass).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.rowCounts).toMatchObject({
      rawAllocations: 1_948,
      finalAllocations: 1_948,
      revenueDetails: 2_192,
      programGroups: 1_166,
      programIdentities: 1_156,
    });
    expect(result.uniqueCounts).toEqual({
      rawAllocationIds: 1_948,
      allocationLinkIds: 1_948,
      sourceTargetPairs: 1_948,
    });
    expect(result.resolutionCounts).toEqual({
      exactGroup: 1_909,
      publicIdentity: 39,
      ambiguous: 0,
      unmatched: 0,
    });
    expect(result.multipleTargetRevenueDetails).toHaveLength(27);
    expect(
      Math.max(
        ...result.multipleTargetRevenueDetails.map(
          (detail) => detail.targetCount,
        ),
      ),
    ).toBe(6);
    expect(Object.values(result.checks).every(Boolean)).toBe(true);
  });

  it("public_identityの39件をgroup未確定の正常状態として検証する", () => {
    const result = validateRevenueAllocationData(normalInputs);
    const publicIdentityRows = normalInputs.allocations.filter(
      (row) => row.target_resolution_level === "public_identity",
    );

    expect(publicIdentityRows).toHaveLength(39);
    expect(
      publicIdentityRows.every(
        (row) =>
          row.target_budget_program_group_id === "" &&
          row.target_budget_program_identity_id.length > 0 &&
          row.target_group_resolution_status ===
            "not_distinguishable_from_public_source",
      ),
    ).toBe(true);
    expect(result.referenceErrors.targetGroup).toBe(0);
    expect(result.referenceErrors.targetIdentity).toBe(0);
  });

  it("正式なエラーCSV・レポート・辞書を決定的に再生成できる", async () => {
    const result = validateRevenueAllocationData(normalInputs);
    const errorsCsv = serializeRevenueAllocationValidationErrors(
      result.errors,
    );
    const report = renderRevenueAllocationValidationReport(result, {
      rawRevenueCsv: "raw/ippansainyu.csv",
      accountsConfig: "config/budget-accounts.json",
      revenueDetails: "processed/budget_revenue_details.csv",
      revenueSections: "processed/budget_revenue_sections.csv",
      revenueItems: "processed/budget_revenue_items.csv",
      rawPdfAllocations:
        "processed/raw_pdf_revenue_allocations.csv",
      budgetProgramGroups: "processed/budget_program_groups.csv",
      revenueAllocations:
        "processed/budget_revenue_allocations.csv",
      budgetPrograms: "processed/budget_programs.csv",
      budgetSections: "processed/budget_sections.csv",
      budgetItems: "processed/budget_items.csv",
      errors:
        "processed/revenue_allocation_validation_errors.csv",
      dictionary: "docs/budget_revenue_data_dictionary.md",
    });
    const dictionary = renderBudgetRevenueDataDictionary();

    expect(errorsCsv.trim()).toBe(
      REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS.join(","),
    );
    expect(report).toContain("**PASS**");
    expect(report).toContain(
      "| 複数targetを持つrevenue_detail | 27 |",
    );
    expect(dictionary).toContain(
      "allocation行を合計してはいけない",
    );
    expect(
      await fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "revenue_allocation_validation_errors.csv",
        ),
        "utf8",
      ),
    ).toBe(errorsCsv);
    expect(
      await fs.readFile(
        path.join(
          repoRoot,
          "docs",
          "revenue_allocation_validation_report.md",
        ),
        "utf8",
      ),
    ).toBe(report);
    expect(
      await fs.readFile(
        path.join(
          repoRoot,
          "docs",
          "budget_revenue_data_dictionary.md",
        ),
        "utf8",
      ),
    ).toBe(dictionary);
  });

  it("配分額、状態、target参照の破損を検出する", () => {
    const allocations =
      normalInputs.allocations.map((row, index) => {
        if (index !== 0) {
          return row;
        }
        return {
          ...row,
          target_match_status: "ambiguous",
          target_budget_program_group_id: "missing_group",
          amount_attribution_status: "estimated",
          allocation_amount_thousand_yen: "100",
        } as IdentityResolvedBudgetRevenueAllocation;
      });
    const result = validateRevenueAllocationData({
      ...normalInputs,
      allocations,
    });
    const errorTypes = new Set(
      result.errors.map((error) => error.error_type),
    );

    expect(result.isPass).toBe(false);
    expect(errorTypes).toContain("ambiguous_target_match");
    expect(errorTypes).toContain(
      "missing_exact_target_group_reference",
    );
    expect(errorTypes).toContain(
      "invalid_amount_attribution_status",
    );
    expect(errorTypes).toContain("allocation_amount_present");
  });

  it("ページ範囲外、学校給食費、複数targetへの金額複製を検出する", () => {
    const rawAllocations =
      normalInputs.rawAllocations.map((row, index) => {
        if (index !== 1) {
          return row;
        }
        return {
          ...row,
          account_code: "school_lunch_fee",
          pdf_page: "999",
          allocation_sequence: "2",
          pdf_revenue_amount_thousand_yen: "100",
        } as RawPdfRevenueAllocation;
      });
    const result = validateRevenueAllocationData({
      ...normalInputs,
      rawAllocations,
    });
    const errorTypes = new Set(
      result.errors.map((error) => error.error_type),
    );

    expect(result.isPass).toBe(false);
    expect(errorTypes).toContain("source_pdf_page_out_of_range");
    expect(errorTypes).toContain(
      "school_lunch_pdf_allocation_present",
    );
    expect(errorTypes).toContain(
      "raw_detail_amount_duplicated_to_multiple_target",
    );
  });

  it("歳出コアCSVの1文字変更を固定ハッシュで検出する", () => {
    const result = validateRevenueAllocationData({
      ...normalInputs,
      coreCsvTexts: {
        ...normalInputs.coreCsvTexts,
        budgetPrograms:
          `${normalInputs.coreCsvTexts.budgetPrograms}\n`,
      },
    });

    expect(result.isPass).toBe(false);
    expect(
      result.errors.some(
        (error) =>
          error.error_type === "expenditure_core_hash_mismatch",
      ),
    ).toBe(true);
    expect(result.checks.expenditureCoreUnchanged).toBe(false);
  });
});
