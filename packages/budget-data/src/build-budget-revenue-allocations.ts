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
  parseRevenueAllocationTargetOverrides,
  serializeRevenueAllocationTargetOverrides,
  validateSerializedRevenueAllocationTargetOverrides,
} from "./revenue-allocation-target-matches";

interface CliOptions {
  groupsPath: string;
  allocationsInputPath: string;
  allocationsOutputPath: string;
  overridesInputPath: string;
  overridesOutputPath: string;
  programsPath: string;
  sectionsPath: string;
  itemsPath: string;
  accountsPath: string;
  identitiesOutputPath: string;
  identityMembersOutputPath: string;
  ambiguitiesOutputPath: string;
  reportPath: string;
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
  let groupsPath = path.join(
    repoRoot,
    "processed",
    "budget_program_groups.csv",
  );
  let allocationsInputPath = path.join(
    repoRoot,
    "processed",
    "budget_revenue_allocations.csv",
  );
  let allocationsOutputPath = allocationsInputPath;
  let overridesInputPath = path.join(
    repoRoot,
    "config",
    "revenue_allocation_target_overrides.csv",
  );
  let overridesOutputPath = overridesInputPath;
  let programsPath = path.join(
    repoRoot,
    "processed",
    "budget_programs.csv",
  );
  let sectionsPath = path.join(
    repoRoot,
    "processed",
    "budget_sections.csv",
  );
  let itemsPath = path.join(
    repoRoot,
    "processed",
    "budget_items.csv",
  );
  let accountsPath = path.join(
    repoRoot,
    "config",
    "budget-accounts.json",
  );
  let identitiesOutputPath = path.join(
    repoRoot,
    "processed",
    "budget_program_identities.csv",
  );
  let identityMembersOutputPath = path.join(
    repoRoot,
    "processed",
    "budget_program_identity_members.csv",
  );
  let ambiguitiesOutputPath = path.join(
    repoRoot,
    "processed",
    "staging",
    "revenue_allocation_group_ambiguities.csv",
  );
  let reportPath = path.join(
    repoRoot,
    "docs",
    "revenue_allocation_identity_resolution_report.md",
  );

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    const value = args[index + 1];
    if (
      (argument === "--groups" ||
        argument === "--groups-output") &&
      value
    ) {
      groupsPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--allocations" && value) {
      allocationsInputPath = resolveCliPath(value, repoRoot);
      allocationsOutputPath = allocationsInputPath;
      index += 1;
      continue;
    }
    if (argument === "--allocations-input" && value) {
      allocationsInputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--allocations-output" && value) {
      allocationsOutputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--overrides" && value) {
      overridesInputPath = resolveCliPath(value, repoRoot);
      overridesOutputPath = overridesInputPath;
      index += 1;
      continue;
    }
    if (argument === "--overrides-input" && value) {
      overridesInputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--overrides-output" && value) {
      overridesOutputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--programs" && value) {
      programsPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--sections" && value) {
      sectionsPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--items" && value) {
      itemsPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--accounts" && value) {
      accountsPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--identities-output" && value) {
      identitiesOutputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--identity-members-output" && value) {
      identityMembersOutputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--ambiguities-output" && value) {
      ambiguitiesOutputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--report" && value) {
      reportPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    throw new Error(`不明な引数です: ${argument}`);
  }

  return {
    groupsPath,
    allocationsInputPath,
    allocationsOutputPath,
    overridesInputPath,
    overridesOutputPath,
    programsPath,
    sectionsPath,
    itemsPath,
    accountsPath,
    identitiesOutputPath,
    identityMembersOutputPath,
    ambiguitiesOutputPath,
    reportPath,
  };
}

async function readUtf8(pathname: string): Promise<string> {
  const bytes = await fs.readFile(pathname);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function displayPath(pathname: string, repoRoot: string): string {
  const relative = path.relative(repoRoot, pathname);
  return relative.startsWith("..") ? pathname : relative;
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
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
    groupsCsv,
    sourceAllocationsCsv,
    sourceOverridesCsv,
    programsCsv,
    sectionsCsv,
    itemsCsv,
    accountsJson,
  ] = await Promise.all([
    readUtf8(options.groupsPath),
    readUtf8(options.allocationsInputPath),
    readUtf8(options.overridesInputPath),
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
  const rebuiltGroups = transformBudgetProgramGroups(
    programs,
    sections,
  );
  const groupValidation = validateBudgetProgramGroups(
    rebuiltGroups,
    programs,
    sections,
    items,
    config,
  );
  if (
    !groupValidation.isPass ||
    groupValidation.rowCount !==
      EXPECTED_BUDGET_PROGRAM_GROUP_ROW_COUNT
  ) {
    throw new Error(
      `budget_program_groupsのコア突合に失敗しました: ` +
        `rows=${groupValidation.rowCount}`,
    );
  }
  if (serializeBudgetProgramGroups(rebuiltGroups) !== groupsCsv) {
    throw new Error(
      "budget_program_groups.csvがコアCSVからの再生成結果と一致しません。",
    );
  }

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
        `identities=${identityValidation.identityCount}, ` +
        `multiple=${identityValidation.multipleGroupIdentityCount}`,
    );
  }

  const inputAllocations =
    parseBudgetRevenueAllocationsForIdentityResolution(
      sourceAllocationsCsv,
    );
  const sourceOverrides =
    parseRevenueAllocationTargetOverrides(sourceOverridesCsv);
  const resolutionResult = resolveRevenueAllocationIdentities(
    inputAllocations,
    identityBuild,
    sourceGroups,
    sourceOverrides,
  );
  const resolutionValidation =
    validateRevenueAllocationIdentityResolution(
      inputAllocations,
      identityBuild,
      sourceGroups,
      resolutionResult,
    );
  if (
    inputAllocations.length !==
      EXPECTED_BUDGET_REVENUE_ALLOCATION_ROW_COUNT ||
    !resolutionValidation.structuralPass
  ) {
    throw new Error(
      `identity allocationの構造検証に失敗しました: ` +
        `rows=${resolutionValidation.outputAllocationCount}`,
    );
  }
  if (
    resolutionValidation.exactGroupCount !==
      EXPECTED_EXACT_GROUP_ALLOCATION_COUNT ||
    resolutionValidation.publicIdentityCount !==
      EXPECTED_PUBLIC_IDENTITY_ALLOCATION_COUNT
  ) {
    throw new Error(
      `identity解決レベルの件数が期待値と一致しません: ` +
        `exact=${resolutionValidation.exactGroupCount}, ` +
        `public=${resolutionValidation.publicIdentityCount}`,
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
  const overridesCsv =
    serializeRevenueAllocationTargetOverrides(
      resolutionResult.unresolvedOverrides,
    );
  const report = renderRevenueAllocationIdentityResolutionReport(
    identityValidation,
    resolutionValidation,
    identityBuild,
    {
      budgetProgramGroups: displayPath(
        options.groupsPath,
        repoRoot,
      ),
      sourceAllocations: displayPath(
        options.allocationsInputPath,
        repoRoot,
      ),
      sourceOverrides: displayPath(
        options.overridesInputPath,
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
      overrides: displayPath(options.overridesOutputPath, repoRoot),
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
      overrides: sha256(overridesCsv),
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
      path: options.overridesOutputPath,
      content: overridesCsv,
      validate: (content) =>
        validateSerializedRevenueAllocationTargetOverrides(
          content,
          resolutionResult.unresolvedOverrides,
        ),
    },
    {
      path: options.reportPath,
      content: report,
      validate: (content) => {
        if (
          !content.includes(
            "# 歳入充当事業・予算事業identity解決レポート",
          )
        ) {
          throw new Error("一時出力したidentityレポートが不正です。");
        }
      },
    },
  ]);

  console.log(
    `Budget program identities: ` +
      identityValidation.identityCount.toLocaleString("en-US"),
  );
  console.log(
    `Multiple-group identities: ` +
      identityValidation.multipleGroupIdentityCount.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `Identity amount total: ` +
      identityValidation.identityAmountTotalThousandYen.toLocaleString(
        "en-US",
      ) +
      " thousand yen",
  );
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
    `Non-blank allocation amounts: ` +
      resolutionValidation.nonBlankAllocationAmountCount.toLocaleString(
        "en-US",
      ),
  );
  console.log("Temporary UTF-8 output verification: PASS");
  console.log(
    `Validation: ` +
      (resolutionValidation.isPass ? "PASS" : "NEEDS_REVIEW"),
  );
  console.log(`Identities output: ${options.identitiesOutputPath}`);
  console.log(
    `Identity members output: ${options.identityMembersOutputPath}`,
  );
  console.log(`Allocations output: ${options.allocationsOutputPath}`);
  console.log(
    `Group ambiguities output: ${options.ambiguitiesOutputPath}`,
  );
  console.log(`Overrides: ${options.overridesOutputPath}`);
  console.log(`Report: ${options.reportPath}`);

  if (!resolutionValidation.isPass) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
