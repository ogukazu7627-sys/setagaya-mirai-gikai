import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import {
  parseBudgetProgramIdentitySourceGroups,
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

interface CliOptions {
  programsPath: string;
  sectionsPath: string;
  itemsPath: string;
  accountsPath: string;
  outputPath: string;
}

function resolveCliPath(value: string, repoRoot: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(repoRoot, value);
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const options: CliOptions = {
    programsPath: path.join(repoRoot, "processed", "budget_programs.csv"),
    sectionsPath: path.join(repoRoot, "processed", "budget_sections.csv"),
    itemsPath: path.join(repoRoot, "processed", "budget_items.csv"),
    accountsPath: path.join(repoRoot, "config", "budget-accounts.json"),
    outputPath: path.join(
      repoRoot,
      "processed",
      "budget_program_groups.csv",
    ),
  };
  const argumentMap: Record<keyof CliOptions, string> = {
    programsPath: "--programs",
    sectionsPath: "--sections",
    itemsPath: "--items",
    accountsPath: "--accounts",
    outputPath: "--output",
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

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const [programsCsv, sectionsCsv, itemsCsv, accountsJson] =
    await Promise.all([
      readUtf8(options.programsPath),
      readUtf8(options.sectionsPath),
      readUtf8(options.itemsPath),
      readUtf8(options.accountsPath),
    ]);
  const inputHashes = [
    programsCsv,
    sectionsCsv,
    itemsCsv,
    accountsJson,
  ].map(sha256);

  const programs =
    parseBudgetProgramGroupSourcePrograms(programsCsv);
  const sections =
    parseBudgetProgramGroupSourceSections(sectionsCsv);
  const items = parseBudgetProgramGroupSourceItems(itemsCsv);
  const config = parseBudgetAccountsConfig(accountsJson);
  const groups = transformBudgetProgramGroups(programs, sections);
  const validation = validateBudgetProgramGroups(
    groups,
    programs,
    sections,
    items,
    config,
  );
  if (
    !validation.isPass ||
    validation.rowCount !== EXPECTED_BUDGET_PROGRAM_GROUP_ROW_COUNT
  ) {
    throw new Error(
      `budget_program_groupsの検証に失敗しました: ` +
        `rows=${validation.rowCount}`,
    );
  }

  const output = serializeBudgetProgramGroups(groups);
  const temporaryPath = `${options.outputPath}.${process.pid}.tmp`;
  try {
    await fs.mkdir(path.dirname(options.outputPath), {
      recursive: true,
    });
    await fs.writeFile(temporaryPath, output, "utf8");
    const reloaded = await readUtf8(temporaryPath);
    const parsed = parseBudgetProgramIdentitySourceGroups(reloaded);
    if (
      parsed.length !== groups.length ||
      reloaded !== output
    ) {
      throw new Error(
        "budget_program_groups.csvの一時出力検証に失敗しました。",
      );
    }
    await fs.rename(temporaryPath, options.outputPath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }

  const inputHashesAfter = [
    await readUtf8(options.programsPath),
    await readUtf8(options.sectionsPath),
    await readUtf8(options.itemsPath),
    await readUtf8(options.accountsPath),
  ].map(sha256);
  if (
    inputHashes.some(
      (hash, index) => hash !== inputHashesAfter[index],
    )
  ) {
    throw new Error("budget_program_groups生成中に入力が変更されました。");
  }

  console.log(
    `Budget program groups: ${validation.rowCount.toLocaleString("en-US")}`,
  );
  console.log(
    `Amount total: ` +
      validation.groupAmountTotalThousandYen.toLocaleString("en-US") +
      " thousand yen",
  );
  console.log("Expenditure core hash regression: PASS");
  console.log("Validation: PASS");
  console.log(`Output: ${options.outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
