import fs from "node:fs/promises";
import path from "node:path";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import {
  EXPECTED_BUDGET_SECTION_ROW_COUNT,
  parseBudgetProgramKeySet,
  parseRawGeneralSectionRows,
  parseRawSpecialSectionRows,
  serializeBudgetSections,
  transformBudgetSectionsFromRaw,
  validateBudgetSectionLegacyRegression,
  validateBudgetSections,
  validateGeneralRawSectionRegression,
} from "./budget-sections";

interface CliOptions {
  baselinePath: string;
  configPath: string;
  generalInputPath: string;
  outputPath: string;
  programsPath: string;
  specialInputPath: string;
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  let outputPath = path.join(repoRoot, "processed", "budget_sections.csv");
  let baselinePath = outputPath;
  let generalInputPath = path.join(
    repoRoot,
    "processed",
    "raw_pdf_sections.csv",
  );
  let specialInputPath = path.join(
    repoRoot,
    "processed",
    "raw_pdf_sections_special.csv",
  );
  let configPath = path.join(repoRoot, "config", "budget-accounts.json");
  let programsPath = path.join(
    repoRoot,
    "processed",
    "budget_programs.csv",
  );

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }

    const value = args[index + 1];
    if (argument === "--general-input" && value) {
      generalInputPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--special-input" && value) {
      specialInputPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--config" && value) {
      configPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--programs" && value) {
      programsPath = path.resolve(value);
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
    generalInputPath,
    outputPath,
    programsPath,
    specialInputPath,
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
  const [generalCsv, specialCsv, configText, programsCsv, baselineCsv] =
    await Promise.all([
      fs.readFile(options.generalInputPath, "utf8"),
      fs.readFile(options.specialInputPath, "utf8"),
      fs.readFile(options.configPath, "utf8"),
      fs.readFile(options.programsPath, "utf8"),
      readExistingOutput(options.baselinePath),
    ]);
  const generalRows = parseRawGeneralSectionRows(generalCsv);
  const specialRows = parseRawSpecialSectionRows(specialCsv);
  const config = parseBudgetAccountsConfig(configText);
  const programBudgetItemKeys = parseBudgetProgramKeySet(programsCsv);
  const sections = transformBudgetSectionsFromRaw(
    generalRows,
    specialRows,
    config,
  );
  const validation = validateBudgetSections(
    sections,
    config,
    programBudgetItemKeys,
  );
  const regression = validateGeneralRawSectionRegression(
    generalRows,
    sections,
  );
  const legacyRegression = baselineCsv
    ? validateBudgetSectionLegacyRegression(baselineCsv, sections)
    : null;
  if (validation.rowCount !== EXPECTED_BUDGET_SECTION_ROW_COUNT) {
    throw new Error(
      `budget_sections行数がPhase 16基準と一致しません: ` +
        `${validation.rowCount} != ${EXPECTED_BUDGET_SECTION_ROW_COUNT}`,
    );
  }
  const outputCsv = serializeBudgetSections(sections);

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  const temporaryOutputPath = `${options.outputPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryOutputPath, outputCsv, "utf8");
  await fs.rename(temporaryOutputPath, options.outputPath);

  console.log(`General raw input: ${options.generalInputPath}`);
  console.log(`Special input: ${options.specialInputPath}`);
  console.log(`Config: ${options.configPath}`);
  console.log(`Programs: ${options.programsPath}`);
  console.log(`Baseline: ${options.baselinePath}`);
  for (const account of config.accounts) {
    console.log(
      `${account.account_code}: ` +
        `${validation.accountRowCounts[account.account_code].toLocaleString("en-US")} rows, ` +
        `${validation.accountAmountTotalsThousandYen[
          account.account_code
        ].toLocaleString("en-US")} thousand yen`,
    );
  }
  console.log(
    `Output rows: ${validation.rowCount.toLocaleString("en-US")}`,
  );
  console.log(
    `Unique section IDs: ` +
      validation.uniqueSectionIdCount.toLocaleString("en-US"),
  );
  console.log(
    `Unique budget item keys: ` +
      validation.uniqueBudgetItemKeyCount.toLocaleString("en-US"),
  );
  console.log(
    `Keys present in budget_programs.csv: ` +
      `${validation.programBudgetItemKeyConsistencyCount.toLocaleString("en-US")}/` +
      validation.rowCount.toLocaleString("en-US"),
  );
  console.log(
    `General-account Phase 6 regression: PASS ` +
      `(${regression.rowCount.toLocaleString("en-US")} rows, ` +
      `${regression.comparedColumnCount} columns)`,
  );
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
  console.log(
    `amount_thousand_yen total: ` +
      validation.amountTotalThousandYen.toLocaleString("en-US"),
  );
  console.log(
    `Expected total: ` +
      validation.expectedAmountTotalThousandYen.toLocaleString("en-US"),
  );
  console.log("Validation: PASS");
  console.log(`Output: ${options.outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
