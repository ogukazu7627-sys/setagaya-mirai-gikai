import fs from "node:fs/promises";
import path from "node:path";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import {
  BUDGET_ITEM_VALIDATION_STATUSES,
  EXPECTED_BUDGET_ITEM_ROW_COUNT,
  EXPECTED_ZERO_AMOUNT_ITEM_COUNT,
  parseBudgetProgramRows,
  parseBudgetSectionRows,
  parseExistingBudgetItemRows,
  serializeBudgetItems,
  transformBudgetItems,
  validateBudgetItemLegacyRegression,
  validateBudgetItems,
  validateGeneralBudgetItemRegression,
} from "./budget-items";

interface CliOptions {
  baselinePath: string;
  configPath: string;
  outputPath: string;
  programsPath: string;
  sectionsPath: string;
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
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
  let configPath = path.join(repoRoot, "config", "budget-accounts.json");
  let outputPath = path.join(repoRoot, "processed", "budget_items.csv");
  let baselinePath = outputPath;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }

    const value = args[index + 1];
    if (argument === "--programs" && value) {
      programsPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--sections" && value) {
      sectionsPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--config" && value) {
      configPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--output" && value) {
      outputPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--baseline" && value) {
      baselinePath = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`不明な引数です: ${argument}`);
  }

  return {
    baselinePath,
    configPath,
    outputPath,
    programsPath,
    sectionsPath,
  };
}

async function readExistingOutput(outputPath: string): Promise<string | null> {
  try {
    return await fs.readFile(outputPath, "utf8");
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

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const [programsCsv, sectionsCsv, configText, baselineCsv] =
    await Promise.all([
      fs.readFile(options.programsPath, "utf8"),
      fs.readFile(options.sectionsPath, "utf8"),
      fs.readFile(options.configPath, "utf8"),
      readExistingOutput(options.baselinePath),
    ]);
  const programRows = parseBudgetProgramRows(programsCsv);
  const sectionRows = parseBudgetSectionRows(sectionsCsv);
  const config = parseBudgetAccountsConfig(configText);
  const budgetItems = transformBudgetItems(
    programRows,
    sectionRows,
    config,
  );
  const validation = validateBudgetItems(budgetItems, config);
  const baselineRows = baselineCsv
    ? parseExistingBudgetItemRows(baselineCsv)
    : null;
  const legacyRegression = baselineRows
    ? validateBudgetItemLegacyRegression(baselineRows, budgetItems)
    : null;
  const generalRegression = baselineRows
    ? validateGeneralBudgetItemRegression(
        baselineRows,
        budgetItems,
      )
    : null;
  if (validation.rowCount !== EXPECTED_BUDGET_ITEM_ROW_COUNT) {
    throw new Error(
      `budget_items行数がPhase 16基準と一致しません: ` +
        `${validation.rowCount} != ${EXPECTED_BUDGET_ITEM_ROW_COUNT}`,
    );
  }
  if (validation.zeroAmountCount !== EXPECTED_ZERO_AMOUNT_ITEM_COUNT) {
    throw new Error(
      `budget_itemsの0円項目数が一致しません: ` +
        `${validation.zeroAmountCount} != ${EXPECTED_ZERO_AMOUNT_ITEM_COUNT}`,
    );
  }
  const outputCsv = serializeBudgetItems(budgetItems);

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  const temporaryOutputPath = `${options.outputPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryOutputPath, outputCsv, "utf8");
  await fs.rename(temporaryOutputPath, options.outputPath);

  console.log(`Programs input: ${options.programsPath}`);
  console.log(`Sections input: ${options.sectionsPath}`);
  console.log(`Config: ${options.configPath}`);
  console.log(`Baseline: ${options.baselinePath}`);
  console.log(
    `Program source records: ${programRows.length.toLocaleString("en-US")}`,
  );
  console.log(
    `Section source records: ${sectionRows.length.toLocaleString("en-US")}`,
  );
  console.log(
    `Union budget item keys: ${validation.rowCount.toLocaleString("en-US")}`,
  );
  for (const account of config.accounts) {
    const accountCode = account.account_code;
    console.log(
      `${accountCode}: ` +
        `${validation.accountItemCounts[accountCode].toLocaleString("en-US")} items, ` +
        `program=${validation.accountProgramTotalsThousandYen[
          accountCode
        ].toLocaleString("en-US")}, ` +
        `section=${validation.accountSectionTotalsThousandYen[
          accountCode
        ].toLocaleString("en-US")} thousand yen`,
    );
  }
  for (const status of BUDGET_ITEM_VALIDATION_STATUSES) {
    console.log(
      `${status}: ${validation.statusCounts[status].toLocaleString("en-US")}`,
    );
  }
  if (legacyRegression) {
    console.log(
      `All-account legacy-column regression: PASS ` +
        `(${legacyRegression.rowCount.toLocaleString("en-US")} rows, ` +
        `${legacyRegression.comparedColumnCount} columns)`,
    );
  } else {
    console.log(
      "All-account legacy-column regression: SKIPPED " +
        "(baseline was not found)",
    );
  }
  if (generalRegression) {
    console.log(
      `General-account Phase 6 regression: PASS ` +
        `(${generalRegression.rowCount.toLocaleString("en-US")} rows, ` +
        `${generalRegression.comparedColumnCount} columns)`,
    );
  } else {
    console.log(
      "General-account Phase 6 regression: SKIPPED " +
        "(existing output was not found)",
    );
  }
  console.log(
    `program_total_amount_thousand_yen total: ` +
      validation.programTotalAmountThousandYen.toLocaleString("en-US"),
  );
  console.log(
    `section_total_amount_thousand_yen total: ` +
      validation.sectionTotalAmountThousandYen.toLocaleString("en-US"),
  );
  console.log(
    `Expected total: ` +
      validation.expectedAmountTotalThousandYen.toLocaleString("en-US"),
  );
  console.log(`Validation: ${validation.isPass ? "PASS" : "FAIL"}`);
  console.log(`Output: ${options.outputPath}`);

  if (!validation.isPass) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
