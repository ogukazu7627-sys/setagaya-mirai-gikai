import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type BudgetProgramIdentityBuildResult,
  type BudgetProgramIdentitySourceGroup,
  type BudgetProgramIdentityValidation,
  parseBudgetProgramIdentitySourceGroups,
  serializeBudgetProgramIdentities,
  serializeBudgetProgramIdentityMembers,
  transformBudgetProgramIdentities,
  validateBudgetProgramIdentities,
  validateSerializedBudgetProgramIdentities,
  validateSerializedBudgetProgramIdentityMembers,
} from "./budget-program-identities";
import {
  type IdentityResolvedBudgetRevenueAllocation,
  type RevenueAllocationIdentityResolutionResult,
  type RevenueAllocationIdentityResolutionValidation,
  parseBudgetRevenueAllocationsForIdentityResolution,
  resolveRevenueAllocationIdentities,
  serializeIdentityResolvedBudgetRevenueAllocations,
  serializeRevenueAllocationGroupAmbiguities,
  validateRevenueAllocationIdentityResolution,
  validateSerializedIdentityResolvedAllocations,
  validateSerializedRevenueAllocationGroupAmbiguities,
} from "./revenue-allocation-identity-resolution";
import {
  parseRevenueAllocationTargetOverrides,
  serializeRevenueAllocationTargetOverrides,
  validateSerializedRevenueAllocationTargetOverrides,
} from "./revenue-allocation-target-matches";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

describe("Phase 29.5 実データ回帰", () => {
  let groups: BudgetProgramIdentitySourceGroup[];
  let inputAllocations: IdentityResolvedBudgetRevenueAllocation[];
  let identityBuild: BudgetProgramIdentityBuildResult;
  let identityValidation: BudgetProgramIdentityValidation;
  let resolutionResult: RevenueAllocationIdentityResolutionResult;
  let resolutionValidation: RevenueAllocationIdentityResolutionValidation;
  let programsCsv: string;
  let sectionsCsv: string;
  let itemsCsv: string;
  let groupsCsv: string;

  beforeAll(async () => {
    const [allocationsCsv, overridesCsv, corePrograms, coreSections, coreItems, coreGroups] =
      await Promise.all([
        fs.readFile(
          path.join(
            repoRoot,
            "processed",
            "budget_revenue_allocations.csv",
          ),
          "utf8",
        ),
        fs.readFile(
          path.join(
            repoRoot,
            "config",
            "revenue_allocation_target_overrides.csv",
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
          path.join(
            repoRoot,
            "processed",
            "budget_program_groups.csv",
          ),
          "utf8",
        ),
      ]);
    programsCsv = corePrograms;
    sectionsCsv = coreSections;
    itemsCsv = coreItems;
    groupsCsv = coreGroups;
    groups = parseBudgetProgramIdentitySourceGroups(groupsCsv);
    inputAllocations =
      parseBudgetRevenueAllocationsForIdentityResolution(
        allocationsCsv,
      );
    const overrides =
      parseRevenueAllocationTargetOverrides(overridesCsv);
    identityBuild = transformBudgetProgramIdentities(groups);
    identityValidation = validateBudgetProgramIdentities(
      groups,
      identityBuild,
    );
    resolutionResult = resolveRevenueAllocationIdentities(
      inputAllocations,
      identityBuild,
      groups,
      overrides,
    );
    resolutionValidation =
      validateRevenueAllocationIdentityResolution(
        inputAllocations,
        identityBuild,
        groups,
        resolutionResult,
      );
  });

  it("1,166 groupを1,156 identityへ損失なく所属させる", () => {
    expect(identityValidation).toMatchObject({
      sourceGroupCount: 1_166,
      identityCount: 1_156,
      memberCount: 1_166,
      uniqueIdentityIdCount: 1_156,
      uniqueMemberGroupIdCount: 1_166,
      multipleGroupIdentityCount: 7,
      sourceAmountTotalThousandYen: 621_033_664,
      identityAmountTotalThousandYen: 621_033_664,
      memberAmountTotalThousandYen: 621_033_664,
      groupMembershipErrorCount: 0,
      boundaryErrorCount: 0,
      amountErrorCount: 0,
      sourceTypeErrorCount: 0,
      isPass: true,
    });
  });

  it("異なる会計・目・ページを統合していない", () => {
    for (const identity of identityBuild.identities) {
      const members =
        identityBuild.groupsByIdentityId.get(
          identity.budget_program_identity_id,
        ) ?? [];
      expect(new Set(members.map((row) => row.account_code)).size).toBe(
        1,
      );
      expect(
        new Set(members.map((row) => row.budget_item_key)).size,
      ).toBe(1);
      expect(
        new Set(
          members.map((row) => row.candidate_budget_book_pages),
        ).size,
      ).toBe(1);
    }
  });

  it("全1,948関係をidentityへ接続し39件の内部曖昧性を残す", () => {
    expect(resolutionValidation).toMatchObject({
      inputAllocationCount: 1_948,
      outputAllocationCount: 1_948,
      uniqueAllocationLinkIdCount: 1_948,
      identityMatchedCount: 1_948,
      exactGroupCount: 1_909,
      publicIdentityCount: 39,
      ambiguousCount: 0,
      unmatchedCount: 0,
      groupAmbiguityCount: 39,
      overrideCount: 0,
      identityReferenceErrorCount: 0,
      groupReferenceErrorCount: 0,
      publicIdentityErrorCount: 0,
      immutableValueDifferenceCount: 0,
      nonBlankAllocationAmountCount: 0,
      amountAttributionStatusErrorCount: 0,
      structuralPass: true,
      isPass: true,
    });
    expect(
      resolutionResult.allocations.filter(
        (row) => row.target_resolution_level === "public_identity",
      ),
    ).toHaveLength(39);
    expect(
      resolutionResult.allocations.every(
        (row) =>
          row.target_budget_program_identity_id.length > 0 &&
          row.allocation_amount_thousand_yen === "" &&
          row.amount_attribution_status === "not_available",
      ),
    ).toBe(true);
  });

  it("歳出コア3CSVとgroupの固定ハッシュを維持する", () => {
    expect(sha256(programsCsv)).toBe(
      "6ae0a0fda94e2498be8749688cdab3427f3d1d54520b3e952152265672b81a27",
    );
    expect(sha256(sectionsCsv)).toBe(
      "5616dc3e29949fd8cf83128ea017b252f78587f8486d4091014d60ee7a1e2ad0",
    );
    expect(sha256(itemsCsv)).toBe(
      "a7edcf294bfd4256401ae396c63758f2fe28a0ffbd6fe26f3788fd35526b6822",
    );
    expect(sha256(groupsCsv)).toBe(
      "09a666931d3deb6eb33be727eac635b32381cd85826c4a232a4c3ce4801cf59f",
    );
  });

  it("4つのCSVをUTF-8で再読込検証できる", () => {
    const identitiesCsv = serializeBudgetProgramIdentities(
      identityBuild.identities,
    );
    const membersCsv = serializeBudgetProgramIdentityMembers(
      identityBuild.members,
    );
    const allocationsCsv =
      serializeIdentityResolvedBudgetRevenueAllocations(
        resolutionResult.allocations,
      );
    const ambiguitiesCsv =
      serializeRevenueAllocationGroupAmbiguities(
        resolutionResult.groupAmbiguities,
      );
    const overridesCsv =
      serializeRevenueAllocationTargetOverrides(
        resolutionResult.unresolvedOverrides,
      );

    expect(() =>
      validateSerializedBudgetProgramIdentities(
        identitiesCsv,
        identityBuild.identities,
      ),
    ).not.toThrow();
    expect(() =>
      validateSerializedBudgetProgramIdentityMembers(
        membersCsv,
        identityBuild.members,
      ),
    ).not.toThrow();
    expect(() =>
      validateSerializedIdentityResolvedAllocations(
        allocationsCsv,
        resolutionResult.allocations,
      ),
    ).not.toThrow();
    expect(() =>
      validateSerializedRevenueAllocationGroupAmbiguities(
        ambiguitiesCsv,
        resolutionResult.groupAmbiguities,
      ),
    ).not.toThrow();
    expect(() =>
      validateSerializedRevenueAllocationTargetOverrides(
        overridesCsv,
        resolutionResult.unresolvedOverrides,
      ),
    ).not.toThrow();
  });
});
