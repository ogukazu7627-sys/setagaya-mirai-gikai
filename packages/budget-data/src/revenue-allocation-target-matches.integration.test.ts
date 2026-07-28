import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import {
  type BudgetProgramGroup,
  type BudgetProgramGroupValidation,
  parseBudgetProgramGroupSourceItems,
  parseBudgetProgramGroupSourcePrograms,
  parseBudgetProgramGroupSourceSections,
  serializeBudgetProgramGroups,
  transformBudgetProgramGroups,
  validateBudgetProgramGroups,
  validateSerializedBudgetProgramGroups,
} from "./budget-program-groups";
import {
  type RevenueAllocationTargetBuildResult,
  type RevenueAllocationTargetValidation,
  parseRevenueAllocationSourceMatchRows,
  serializeBudgetRevenueAllocations,
  serializeRevenueAllocationTargetOverrides,
  transformRevenueAllocationTargets,
  validateRevenueAllocationTargets,
  validateSerializedBudgetRevenueAllocations,
  validateSerializedRevenueAllocationTargetOverrides,
} from "./revenue-allocation-target-matches";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

describe("Phase 29 実データ回帰", () => {
  let groups: BudgetProgramGroup[];
  let groupValidation: BudgetProgramGroupValidation;
  let targetResult: RevenueAllocationTargetBuildResult;
  let targetValidation: RevenueAllocationTargetValidation;

  beforeAll(async () => {
    const [
      sourceMatchesCsv,
      programsCsv,
      sectionsCsv,
      itemsCsv,
      accountsJson,
    ] = await Promise.all([
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "staging",
          "revenue_allocation_source_matches.csv",
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
      fs.readFile(
        path.join(repoRoot, "config", "budget-accounts.json"),
        "utf8",
      ),
    ]);
    const programs =
      parseBudgetProgramGroupSourcePrograms(programsCsv);
    const sections =
      parseBudgetProgramGroupSourceSections(sectionsCsv);
    const items = parseBudgetProgramGroupSourceItems(itemsCsv);
    const sources =
      parseRevenueAllocationSourceMatchRows(sourceMatchesCsv);
    const config = parseBudgetAccountsConfig(accountsJson);
    groups = transformBudgetProgramGroups(programs, sections);
    groupValidation = validateBudgetProgramGroups(
      groups,
      programs,
      sections,
      items,
      config,
    );
    targetResult = transformRevenueAllocationTargets(
      sources,
      groups,
      config,
    );
    targetValidation = validateRevenueAllocationTargets(
      sources,
      groups,
      targetResult,
    );
  });

  it("1,170 programを1,166予算事業groupへ集約する", () => {
    expect(groupValidation).toMatchObject({
      rowCount: 1_166,
      uniqueGroupIdCount: 1_166,
      sourceProgramRowCount: 1_170,
      memberProgramCountTotal: 1_170,
      sourceAmountTotalThousandYen: 621_033_664,
      groupAmountTotalThousandYen: 621_033_664,
      groupsWithoutCandidatePages: 17,
      itemReconciliationErrorCount: 0,
      unknownAccountCount: 0,
      isPass: true,
    });
    expect(groupValidation.accountGroupCounts).toEqual({
      general: 1_073,
      latter_stage_elderly_healthcare: 17,
      long_term_care_insurance: 46,
      national_health_insurance: 29,
      school_lunch_fee: 1,
    });
  });

  it("1,948関係行を保持し1,909行を安全に自動接続する", () => {
    expect(targetValidation.sourceRowCount).toBe(1_948);
    expect(targetValidation.allocationRowCount).toBe(1_948);
    expect(targetValidation.uniqueAllocationLinkIdCount).toBe(1_948);
    expect(targetValidation.statusCounts).toEqual({
      matched: 1_909,
      ambiguous: 39,
      unmatched: 0,
      manually_confirmed: 0,
    });
    expect(targetValidation.methodCounts).toEqual({
      page_and_exact_name: 1_797,
      page_name_department: 1,
      page_and_normalized_name: 111,
      manual_override: 0,
    });
    expect(targetResult.overrideRows).toHaveLength(39);
    expect(targetValidation.structuralPass).toBe(true);
    expect(targetValidation.isPass).toBe(false);
  });

  it("金額を複製せず参照・重複検証を通す", () => {
    expect(targetValidation).toMatchObject({
      revenueDetailReferenceErrorCount: 0,
      targetReferenceErrorCount: 0,
      duplicateRevenueTargetPairCount: 0,
      nonBlankAllocationAmountCount: 0,
      amountAttributionStatusErrorCount: 0,
      sourceValueDifferenceCount: 0,
    });
    expect(
      targetResult.allocations.every(
        (allocation) =>
          allocation.amount_attribution_status === "not_available" &&
          allocation.allocation_amount_thousand_yen === "",
      ),
    ).toBe(true);
  });

  it("target会計をページから独立判定する", () => {
    expect(targetValidation.targetAccountCounts).toEqual({
      general: 1_626,
      latter_stage_elderly_healthcare: 29,
      long_term_care_insurance: 209,
      national_health_insurance: 84,
    });
    expect(targetValidation.sourceTargetAccountPairCounts).toEqual({
      "general->general": 1_626,
      "latter_stage_elderly_healthcare->latter_stage_elderly_healthcare": 29,
      "long_term_care_insurance->long_term_care_insurance": 209,
      "national_health_insurance->national_health_insurance": 84,
    });
    expect(targetValidation.pageOffsetCounts).toEqual({
      "0": 1_438,
      "2": 425,
      "4": 82,
      "6": 3,
    });
  });

  it("3つのCSVをUTF-8で再読込検証できる", () => {
    const groupsCsv = serializeBudgetProgramGroups(groups);
    const allocationsCsv = serializeBudgetRevenueAllocations(
      targetResult.allocations,
    );
    const overridesCsv =
      serializeRevenueAllocationTargetOverrides(
        targetResult.overrideRows,
      );
    expect(() =>
      validateSerializedBudgetProgramGroups(groupsCsv, groups),
    ).not.toThrow();
    expect(() =>
      validateSerializedBudgetRevenueAllocations(
        allocationsCsv,
        targetResult.allocations,
      ),
    ).not.toThrow();
    expect(() =>
      validateSerializedRevenueAllocationTargetOverrides(
        overridesCsv,
        targetResult.overrideRows,
      ),
    ).not.toThrow();
  });
});
