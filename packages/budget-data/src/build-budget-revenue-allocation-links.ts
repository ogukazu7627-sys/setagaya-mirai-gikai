import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import {
  EXPECTED_BUDGET_PROGRAM_IDENTITY_ROW_COUNT,
  EXPECTED_MULTIPLE_GROUP_IDENTITY_COUNT,
  parseBudgetProgramIdentitySourceGroups,
  serializeBudgetProgramIdentities,
  serializeBudgetProgramIdentityMembers,
  transformBudgetProgramIdentities,
  validateBudgetProgramIdentities,
  validateSerializedBudgetProgramIdentities,
  validateSerializedBudgetProgramIdentityMembers,
} from "./budget-program-identities";
import {
  EXPECTED_BUDGET_PROGRAM_GROUP_ROW_COUNT,
  parseBudgetProgramGroupSourceItems,
  parseBudgetProgramGroupSourcePrograms,
  parseBudgetProgramGroupSourceSections,
  serializeBudgetProgramGroups,
  transformBudgetProgramGroups,
  validateBudgetProgramGroups,
} from "./budget-program-groups";
import {
  EXPECTED_EXACT_GROUP_ALLOCATION_COUNT,
  EXPECTED_PUBLIC_IDENTITY_ALLOCATION_COUNT,
  parseBudgetRevenueAllocationsForIdentityResolution,
  renderRevenueAllocationIdentityResolutionReport,
  resolveRevenueAllocationIdentities,
  serializeIdentityResolvedBudgetRevenueAllocations,
  serializeRevenueAllocationGroupAmbiguities,
  validateRevenueAllocationIdentityResolution,
  validateSerializedIdentityResolvedAllocations,
  validateSerializedRevenueAllocationGroupAmbiguities,
} from "./revenue-allocation-identity-resolution";
import {
  EXPECTED_BUDGET_REVENUE_ALLOCATION_ROW_COUNT,
  type RevenueAllocationTargetOverride,
  parseRevenueAllocationSourceMatchRows,
  parseRevenueAllocationTargetOverrides,
  renderRevenueAllocationTargetMatchReport,
  serializeBudgetRevenueAllocations,
  serializeRevenueAllocationTargetOverrides,
  transformRevenueAllocationTargets,
  validateRevenueAllocationTargets,
  validateSerializedBudgetRevenueAllocations,
  validateSerializedRevenueAllocationTargetOverrides,
} from "./revenue-allocation-target-matches";

interface CliOptions {
  sourceMatchesPath: string;
  groupsPath: string;
  targetOverridesPath: string;
  programsPath: string;
  sectionsPath: string;
  itemsPath: string;
  accountsPath: string;
  allocationsOutputPath: string;
  identitiesOutputPath: string;
  identityMembersOutputPath: string;
  ambiguitiesOutputPath: string;
  targetReportPath: string;
  identityReportPath: string;
}

interface OutputArtifact {
  path: string;
  content: string;
  validate?: (content: string) => void;
}

function resolveCliPath(value: string, repoRoot: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(repoRoot, value);
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const options: CliOptions = {
    sourceMatchesPath: path.join(
      repoRoot,
      "processed",
      "staging",
      "revenue_allocation_source_matches.csv",
    ),
    groupsPath: path.join(
      repoRoot,
      "processed",
      "budget_program_groups.csv",
    ),
    targetOverridesPath: path.join(
      repoRoot,
      "config",
      "revenue_allocation_target_overrides.csv",
    ),
    programsPath: path.join(repoRoot, "processed", "budget_programs.csv"),
    sectionsPath: path.join(repoRoot, "processed", "budget_sections.csv"),
    itemsPath: path.join(repoRoot, "processed", "budget_items.csv"),
    accountsPath: path.join(repoRoot, "config", "budget-accounts.json"),
    allocationsOutputPath: path.join(
      repoRoot,
      "processed",
      "budget_revenue_allocations.csv",
    ),
    identitiesOutputPath: path.join(
      repoRoot,
      "processed",
      "budget_program_identities.csv",
    ),
    identityMembersOutputPath: path.join(
      repoRoot,
      "processed",
      "budget_program_identity_members.csv",
    ),
    ambiguitiesOutputPath: path.join(
      repoRoot,
      "processed",
      "staging",
      "revenue_allocation_group_ambiguities.csv",
    ),
    targetReportPath: path.join(
      repoRoot,
      "docs",
      "revenue_allocation_target_match_report.md",
    ),
    identityReportPath: path.join(
      repoRoot,
      "docs",
      "revenue_allocation_identity_resolution_report.md",
    ),
  };
  const argumentMap: Record<keyof CliOptions, string> = {
    sourceMatchesPath: "--source-matches",
    groupsPath: "--groups",
    targetOverridesPath: "--target-overrides",
    programsPath: "--programs",
    sectionsPath: "--sections",
    itemsPath: "--items",
    accountsPath: "--accounts",
    allocationsOutputPath: "--allocations-output",
    identitiesOutputPath: "--identities-output",
    identityMembersOutputPath: "--identity-members-output",
    ambiguitiesOutputPath: "--ambiguities-output",
    targetReportPath: "--target-report",
    identityReportPath: "--identity-report",
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    const entry = Object.entries(argumentMap).find(
      ([, flag]) => flag === argument,
    ) as [keyof CliOptions, string] | undefined;
    const value = args[index + 1];
    if (!entry || !value) {
      throw new Error(`不明または値のない引数です: ${argument}`);
    }
    options[entry[0]] = resolveCliPath(value, repoRoot);
    index += 1;
  }
  return options;
}

async function readUtf8(pathname: string): Promise<string> {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    await fs.readFile(pathname),
  );
}

async function readOptionalUtf8(pathname: string): Promise<string> {
  try {
    return await readUtf8(pathname);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return "";
    }
    throw error;
  }
}

function displayPath(pathname: string, repoRoot: string): string {
  const relative = path.relative(repoRoot, pathname);
  return relative.startsWith("..") ? pathname : relative;
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function mergeFinalOverrides(
  inputOverrides: RevenueAllocationTargetOverride[],
  unresolvedOverrides: RevenueAllocationTargetOverride[],
): RevenueAllocationTargetOverride[] {
  const rowsByRawId = new Map<string, RevenueAllocationTargetOverride>();
  for (const override of inputOverrides) {
    if (override.selected_budget_program_group_id.trim().length > 0) {
      rowsByRawId.set(override.raw_allocation_id, override);
    }
  }
  for (const override of unresolvedOverrides) {
    rowsByRawId.set(override.raw_allocation_id, override);
  }
  return [...rowsByRawId.values()];
}

async function writeArtifactsAtomically(
  artifacts: OutputArtifact[],
): Promise<void> {
  const temporaryPaths = artifacts.map(
    (artifact) => `${artifact.path}.${process.pid}.tmp`,
  );
  try {
    for (let index = 0; index < artifacts.length; index += 1) {
      await fs.mkdir(path.dirname(artifacts[index].path), {
        recursive: true,
      });
      await fs.writeFile(
        temporaryPaths[index],
        artifacts[index].content,
        "utf8",
      );
    }
    for (let index = 0; index < artifacts.length; index += 1) {
      const validate = artifacts[index].validate;
      if (validate) {
        validate(await readUtf8(temporaryPaths[index]));
      }
    }
    for (let index = 0; index < artifacts.length; index += 1) {
      await fs.rename(temporaryPaths[index], artifacts[index].path);
    }
  } finally {
    await Promise.all(
      temporaryPaths.map((temporaryPath) =>
        fs.rm(temporaryPath, { force: true }),
      ),
    );
  }
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const [
    sourceMatchesCsv,
    groupsCsv,
    sourceTargetOverridesCsv,
    programsCsv,
    sectionsCsv,
    itemsCsv,
    accountsJson,
  ] = await Promise.all([
    readUtf8(options.sourceMatchesPath),
    readUtf8(options.groupsPath),
    readOptionalUtf8(options.targetOverridesPath),
    readUtf8(options.programsPath),
    readUtf8(options.sectionsPath),
    readUtf8(options.itemsPath),
    readUtf8(options.accountsPath),
  ]);

  const programs =
    parseBudgetProgramGroupSourcePrograms(programsCsv);
  const sections =
    parseBudgetProgramGroupSourceSections(sectionsCsv);
  const items = parseBudgetProgramGroupSourceItems(itemsCsv);
  const config = parseBudgetAccountsConfig(accountsJson);
  const rebuiltGroups = transformBudgetProgramGroups(programs, sections);
  const groupValidation = validateBudgetProgramGroups(
    rebuiltGroups,
    programs,
    sections,
    items,
    config,
  );
  if (
    !groupValidation.isPass ||
    groupValidation.rowCount !== EXPECTED_BUDGET_PROGRAM_GROUP_ROW_COUNT ||
    serializeBudgetProgramGroups(rebuiltGroups) !== groupsCsv
  ) {
    throw new Error(
      "budget_program_groups.csvが歳出コアからの再生成結果と一致しません。",
    );
  }

  const sourceMatches =
    parseRevenueAllocationSourceMatchRows(sourceMatchesCsv);
  const targetOverrides = parseRevenueAllocationTargetOverrides(
    sourceTargetOverridesCsv,
  );
  const targetBuild = transformRevenueAllocationTargets(
    sourceMatches,
    rebuiltGroups,
    config,
    targetOverrides,
  );
  const targetValidation = validateRevenueAllocationTargets(
    sourceMatches,
    rebuiltGroups,
    targetBuild,
  );
  if (
    !targetValidation.structuralPass ||
    targetValidation.allocationRowCount !==
      EXPECTED_BUDGET_REVENUE_ALLOCATION_ROW_COUNT ||
    targetValidation.statusCounts.unmatched !== 0 ||
    targetValidation.statusCounts.ambiguous !==
      EXPECTED_PUBLIC_IDENTITY_ALLOCATION_COUNT
  ) {
    throw new Error(
      `充当先候補照合に失敗しました: ` +
        `rows=${targetValidation.allocationRowCount}, ` +
        `ambiguous=${targetValidation.statusCounts.ambiguous}, ` +
        `unmatched=${targetValidation.statusCounts.unmatched}`,
    );
  }
  const phase29AllocationsCsv = serializeBudgetRevenueAllocations(
    targetBuild.allocations,
  );
  validateSerializedBudgetRevenueAllocations(
    phase29AllocationsCsv,
    targetBuild.allocations,
  );

  const sourceGroups =
    parseBudgetProgramIdentitySourceGroups(groupsCsv);
  const identityBuild =
    transformBudgetProgramIdentities(sourceGroups);
  const identityValidation = validateBudgetProgramIdentities(
    sourceGroups,
    identityBuild,
  );
  if (
    !identityValidation.isPass ||
    identityValidation.identityCount !==
      EXPECTED_BUDGET_PROGRAM_IDENTITY_ROW_COUNT ||
    identityValidation.multipleGroupIdentityCount !==
      EXPECTED_MULTIPLE_GROUP_IDENTITY_COUNT
  ) {
    throw new Error(
      `budget_program_identityの検証に失敗しました: ` +
        `identities=${identityValidation.identityCount}`,
    );
  }

  const phase29Allocations =
    parseBudgetRevenueAllocationsForIdentityResolution(
      phase29AllocationsCsv,
    );
  const resolutionResult = resolveRevenueAllocationIdentities(
    phase29Allocations,
    identityBuild,
    sourceGroups,
    targetBuild.overrideRows,
  );
  const resolutionValidation =
    validateRevenueAllocationIdentityResolution(
      phase29Allocations,
      identityBuild,
      sourceGroups,
      resolutionResult,
    );
  if (
    !resolutionValidation.isPass ||
    resolutionValidation.exactGroupCount !==
      EXPECTED_EXACT_GROUP_ALLOCATION_COUNT ||
    resolutionValidation.publicIdentityCount !==
      EXPECTED_PUBLIC_IDENTITY_ALLOCATION_COUNT
  ) {
    throw new Error(
      `identity解決に失敗しました: ` +
        `exact=${resolutionValidation.exactGroupCount}, ` +
        `public=${resolutionValidation.publicIdentityCount}, ` +
        `ambiguous=${resolutionValidation.ambiguousCount}, ` +
        `unmatched=${resolutionValidation.unmatchedCount}`,
    );
  }

  const identitiesCsv = serializeBudgetProgramIdentities(
    identityBuild.identities,
  );
  const identityMembersCsv =
    serializeBudgetProgramIdentityMembers(identityBuild.members);
  const allocationsCsv =
    serializeIdentityResolvedBudgetRevenueAllocations(
      resolutionResult.allocations,
    );
  const ambiguitiesCsv =
    serializeRevenueAllocationGroupAmbiguities(
      resolutionResult.groupAmbiguities,
    );
  const finalOverrides = mergeFinalOverrides(
    targetOverrides,
    resolutionResult.unresolvedOverrides,
  );
  const finalOverridesCsv =
    serializeRevenueAllocationTargetOverrides(finalOverrides);
  const targetReport = renderRevenueAllocationTargetMatchReport(
    groupValidation,
    targetValidation,
    targetBuild,
    {
      sourceMatches: displayPath(options.sourceMatchesPath, repoRoot),
      budgetPrograms: displayPath(options.programsPath, repoRoot),
      budgetSections: displayPath(options.sectionsPath, repoRoot),
      budgetItems: displayPath(options.itemsPath, repoRoot),
      accountsConfig: displayPath(options.accountsPath, repoRoot),
      programGroups: displayPath(options.groupsPath, repoRoot),
      allocations: displayPath(
        options.allocationsOutputPath,
        repoRoot,
      ),
      overrides: displayPath(
        options.targetOverridesPath,
        repoRoot,
      ),
    },
  );
  const identityReport =
    renderRevenueAllocationIdentityResolutionReport(
      identityValidation,
      resolutionValidation,
      identityBuild,
      {
        budgetProgramGroups: displayPath(options.groupsPath, repoRoot),
        sourceAllocations:
          `in-memory target matches from ` +
          displayPath(options.sourceMatchesPath, repoRoot),
        sourceOverrides: displayPath(
          options.targetOverridesPath,
          repoRoot,
        ),
        budgetPrograms: displayPath(options.programsPath, repoRoot),
        budgetSections: displayPath(options.sectionsPath, repoRoot),
        budgetItems: displayPath(options.itemsPath, repoRoot),
        identities: displayPath(
          options.identitiesOutputPath,
          repoRoot,
        ),
        identityMembers: displayPath(
          options.identityMembersOutputPath,
          repoRoot,
        ),
        allocations: displayPath(
          options.allocationsOutputPath,
          repoRoot,
        ),
        groupAmbiguities: displayPath(
          options.ambiguitiesOutputPath,
          repoRoot,
        ),
        overrides: displayPath(
          options.targetOverridesPath,
          repoRoot,
        ),
      },
      {
        budgetProgramGroups: sha256(groupsCsv),
        budgetPrograms: sha256(programsCsv),
        budgetSections: sha256(sectionsCsv),
        budgetItems: sha256(itemsCsv),
        identities: sha256(identitiesCsv),
        identityMembers: sha256(identityMembersCsv),
        allocations: sha256(allocationsCsv),
        groupAmbiguities: sha256(ambiguitiesCsv),
        overrides: sha256(finalOverridesCsv),
      },
    );

  await writeArtifactsAtomically([
    {
      path: options.identitiesOutputPath,
      content: identitiesCsv,
      validate: (content) =>
        validateSerializedBudgetProgramIdentities(
          content,
          identityBuild.identities,
        ),
    },
    {
      path: options.identityMembersOutputPath,
      content: identityMembersCsv,
      validate: (content) =>
        validateSerializedBudgetProgramIdentityMembers(
          content,
          identityBuild.members,
        ),
    },
    {
      path: options.allocationsOutputPath,
      content: allocationsCsv,
      validate: (content) =>
        validateSerializedIdentityResolvedAllocations(
          content,
          resolutionResult.allocations,
        ),
    },
    {
      path: options.ambiguitiesOutputPath,
      content: ambiguitiesCsv,
      validate: (content) =>
        validateSerializedRevenueAllocationGroupAmbiguities(
          content,
          resolutionResult.groupAmbiguities,
        ),
    },
    {
      path: options.targetOverridesPath,
      content: finalOverridesCsv,
      validate: (content) =>
        validateSerializedRevenueAllocationTargetOverrides(
          content,
          finalOverrides,
        ),
    },
    {
      path: options.targetReportPath,
      content: targetReport,
      validate: (content) => {
        if (
          !content.includes(
            "# 歳入充当事業・歳出予算事業 接続レポート",
          )
        ) {
          throw new Error("充当先接続レポートの一時検証に失敗しました。");
        }
      },
    },
    {
      path: options.identityReportPath,
      content: identityReport,
      validate: (content) => {
        if (
          !content.includes(
            "# 歳入充当事業・予算事業identity解決レポート",
          )
        ) {
          throw new Error("identityレポートの一時検証に失敗しました。");
        }
      },
    },
  ]);

  console.log(
    `Revenue allocation rows: ` +
      resolutionValidation.outputAllocationCount.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `Resolution exact_group: ` +
      resolutionValidation.exactGroupCount.toLocaleString("en-US"),
  );
  console.log(
    `Resolution public_identity: ` +
      resolutionValidation.publicIdentityCount.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `target_match_status ambiguous: ` +
      resolutionValidation.ambiguousCount.toLocaleString("en-US"),
  );
  console.log(
    `target_match_status unmatched: ` +
      resolutionValidation.unmatchedCount.toLocaleString("en-US"),
  );
  console.log(
    `Final manual/unresolved overrides: ` +
      finalOverrides.length.toLocaleString("en-US"),
  );
  console.log("Temporary UTF-8 output verification: PASS");
  console.log("Validation: PASS");
  console.log(`Allocations output: ${options.allocationsOutputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
