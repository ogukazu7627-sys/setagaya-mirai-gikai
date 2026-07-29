import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildPublicBudgetProgramIdentities,
  serializePublicBudgetProgramIdentities,
  serializePublicRevenueAllocationReferencesFromCoreCsv,
  validatePublicBudgetProgramIdentityCsv,
} from "./public-budget-program-identities";

interface CliOptions {
  identitiesPath: string;
  identityMembersPath: string;
  programGroupsPath: string;
  programsPath: string;
  itemsPath: string;
  publicProgramsPath: string;
  publicProgramsOutputPath: string;
  revenueAllocationsPath: string;
  revenueAllocationFormat: "core_csv" | "public_json";
  departmentMapPath: string;
  outputPath: string;
}

interface InputFile {
  path: string;
  bytes: Buffer;
  hash: string;
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const processedPath = path.join(repoRoot, "processed");
  const corePath = path.join(processedPath, "core");
  const publicPath = path.join(processedPath, "public");
  let identitiesPath = path.join(
    corePath,
    "budget_program_identities.csv",
  );
  let identityMembersPath = path.join(
    corePath,
    "budget_program_identity_members.csv",
  );
  let programGroupsPath = path.join(
    corePath,
    "budget_program_groups.csv",
  );
  let programsPath = path.join(corePath, "budget_programs.csv");
  let itemsPath = path.join(corePath, "budget_items.csv");
  let publicProgramsPath = path.join(
    publicPath,
    "public_budget_programs.csv",
  );
  let publicProgramsOutputPath: string | null = null;
  let revenueAllocationsPath = path.join(
    corePath,
    "budget_revenue_allocations.csv",
  );
  let revenueAllocationFormat: CliOptions["revenueAllocationFormat"] =
    "core_csv";
  let departmentMapPath = path.join(
    repoRoot,
    "config",
    "department_name_map.csv",
  );
  let outputPath = path.join(
    publicPath,
    "public_budget_program_identities.csv",
  );

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    const value = args[index + 1];
    if (!value) {
      throw new Error(`${argument}の値がありません。`);
    }
    if (argument === "--identities") {
      identitiesPath = path.resolve(value);
    } else if (argument === "--identity-members") {
      identityMembersPath = path.resolve(value);
    } else if (argument === "--program-groups") {
      programGroupsPath = path.resolve(value);
    } else if (argument === "--programs") {
      programsPath = path.resolve(value);
    } else if (argument === "--items") {
      itemsPath = path.resolve(value);
    } else if (argument === "--public-programs") {
      publicProgramsPath = path.resolve(value);
    } else if (argument === "--public-programs-output") {
      publicProgramsOutputPath = path.resolve(value);
    } else if (argument === "--revenue-allocations") {
      revenueAllocationsPath = path.resolve(value);
      revenueAllocationFormat = "core_csv";
    } else if (argument === "--public-revenue-allocations") {
      revenueAllocationsPath = path.resolve(value);
      revenueAllocationFormat = "public_json";
    } else if (argument === "--department-map") {
      departmentMapPath = path.resolve(value);
    } else if (argument === "--output") {
      outputPath = path.resolve(value);
    } else {
      throw new Error(`不明な引数です: ${argument}`);
    }
    index += 1;
  }

  return {
    identitiesPath,
    identityMembersPath,
    programGroupsPath,
    programsPath,
    itemsPath,
    publicProgramsPath,
    publicProgramsOutputPath:
      publicProgramsOutputPath ?? publicProgramsPath,
    revenueAllocationsPath,
    revenueAllocationFormat,
    departmentMapPath,
    outputPath,
  };
}

function assertOutputPathsSafe(options: CliOptions): void {
  const immutableInputPaths = new Set([
    options.identitiesPath,
    options.identityMembersPath,
    options.programGroupsPath,
    options.programsPath,
    options.itemsPath,
    options.revenueAllocationsPath,
    options.departmentMapPath,
  ]);
  if (immutableInputPaths.has(options.outputPath)) {
    throw new Error("公開identity出力先を入力ファイルと同じにできません。");
  }
  if (immutableInputPaths.has(options.publicProgramsOutputPath)) {
    throw new Error(
      "公開program出力先をコア・設定入力と同じにできません。",
    );
  }
  if (options.outputPath === options.publicProgramsOutputPath) {
    throw new Error("2つの公開出力先を同じにできません。");
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readInput(inputPath: string): Promise<InputFile> {
  const bytes = await fs.readFile(inputPath);
  return {
    path: inputPath,
    bytes,
    hash: sha256(bytes),
  };
}

async function assertInputsUnchanged(
  inputs: readonly InputFile[],
): Promise<void> {
  for (const input of inputs) {
    const currentHash = sha256(await fs.readFile(input.path));
    if (currentHash !== input.hash) {
      throw new Error(`入力ファイルが生成中に変更されました: ${input.path}`);
    }
  }
}

async function writeTemporaryFile(
  outputPath: string,
  content: string,
): Promise<string> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, content, "utf8");
  return temporaryPath;
}

async function removeIfPresent(filePath: string | null): Promise<void> {
  if (!filePath) {
    return;
  }
  try {
    await fs.unlink(filePath);
  } catch (error: unknown) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

async function backupIfPresent(outputPath: string): Promise<string | null> {
  const backupPath = `${outputPath}.${process.pid}.backup`;
  try {
    await fs.copyFile(outputPath, backupPath);
    return backupPath;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

async function restoreOutput(
  outputPath: string,
  backupPath: string | null,
): Promise<void> {
  await removeIfPresent(outputPath);
  if (backupPath) {
    await fs.rename(backupPath, outputPath);
  }
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  assertOutputPathsSafe(options);
  const inputs = await Promise.all([
    readInput(options.identitiesPath),
    readInput(options.identityMembersPath),
    readInput(options.programGroupsPath),
    readInput(options.programsPath),
    readInput(options.itemsPath),
    readInput(options.publicProgramsPath),
    readInput(options.revenueAllocationsPath),
    readInput(options.departmentMapPath),
  ]);
  const [
    identities,
    identityMembers,
    programGroups,
    programs,
    items,
    publicPrograms,
    revenueAllocations,
    departmentMap,
  ] = inputs;
  const result = buildPublicBudgetProgramIdentities({
    identitiesCsv: identities.bytes.toString("utf8"),
    identityMembersCsv: identityMembers.bytes.toString("utf8"),
    programGroupsCsv: programGroups.bytes.toString("utf8"),
    programsCsv: programs.bytes.toString("utf8"),
    itemsCsv: items.bytes.toString("utf8"),
    publicProgramsCsv: publicPrograms.bytes.toString("utf8"),
    publicRevenueAllocationsJson:
      options.revenueAllocationFormat === "core_csv"
        ? serializePublicRevenueAllocationReferencesFromCoreCsv(
            revenueAllocations.bytes.toString("utf8"),
          )
        : revenueAllocations.bytes.toString("utf8"),
    departmentMapCsv: departmentMap.bytes.toString("utf8"),
  });
  const publicIdentitiesCsv = serializePublicBudgetProgramIdentities(
    result.identities,
  );
  validatePublicBudgetProgramIdentityCsv(
    publicIdentitiesCsv,
    result.identities,
  );

  const temporaryIdentityPath = await writeTemporaryFile(
    options.outputPath,
    publicIdentitiesCsv,
  );
  let temporaryProgramsPath: string | null = null;
  let identityBackupPath: string | null = null;
  let programsBackupPath: string | null = null;
  let identityReplaced = false;
  let programsReplaced = false;
  try {
    temporaryProgramsPath = await writeTemporaryFile(
      options.publicProgramsOutputPath,
      result.publicProgramsCsv,
    );
    await assertInputsUnchanged(inputs);
    identityBackupPath = await backupIfPresent(options.outputPath);
    programsBackupPath = await backupIfPresent(
      options.publicProgramsOutputPath,
    );
    await fs.rename(temporaryIdentityPath, options.outputPath);
    identityReplaced = true;
    await fs.rename(
      temporaryProgramsPath,
      options.publicProgramsOutputPath,
    );
    programsReplaced = true;
    temporaryProgramsPath = null;
  } catch (error: unknown) {
    await Promise.all([
      identityReplaced
        ? restoreOutput(options.outputPath, identityBackupPath)
        : Promise.resolve(),
      programsReplaced
        ? restoreOutput(
            options.publicProgramsOutputPath,
            programsBackupPath,
          )
        : Promise.resolve(),
    ]);
    identityBackupPath = null;
    programsBackupPath = null;
    throw error;
  } finally {
    await removeIfPresent(temporaryIdentityPath);
    await removeIfPresent(temporaryProgramsPath);
    await removeIfPresent(identityBackupPath);
    await removeIfPresent(programsBackupPath);
  }

  const validation = result.validation;
  console.log(
    `Public identities: ${validation.identityRowCount.toLocaleString(
      "en-US",
    )} rows`,
  );
  console.log(
    `Amount total: ${validation.totalAmountThousandYen.toLocaleString(
      "en-US",
    )} thousand yen`,
  );
  for (const [accountCode, amount] of Object.entries(
    validation.accountTotalsThousandYen,
  )) {
    console.log(
      `${accountCode}: ${amount.toLocaleString("en-US")} thousand yen`,
    );
  }
  console.log(
    `Multiple-group identities: ` +
      validation.multipleGroupIdentityCount.toLocaleString("en-US"),
  );
  console.log(
    `Identities with related revenue: ` +
      validation.relatedRevenueIdentityCount.toLocaleString("en-US"),
  );
  console.log(
    `Identities with public_identity resolution: ` +
      validation.publicIdentityResolutionIdentityCount.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `public_identity allocation rows: ` +
      validation.publicIdentityResolutionAllocationCount.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `Public program identity links: ` +
      validation.publicProgramRowCount.toLocaleString("en-US"),
  );
  console.log(`Identity hash: ${sha256(Buffer.from(publicIdentitiesCsv))}`);
  console.log(
    `Public programs hash: ` +
      sha256(Buffer.from(result.publicProgramsCsv)),
  );
  console.log("Validation: PASS");
  console.log(`Output: ${options.outputPath}`);
  console.log(`Output: ${options.publicProgramsOutputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
