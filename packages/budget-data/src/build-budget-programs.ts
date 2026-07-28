import fs from "node:fs/promises";
import path from "node:path";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import {
  decodeBudgetCsv,
  EXPECTED_BUDGET_PROGRAM_GROUP_COUNT,
  EXPECTED_BUDGET_PROGRAM_ROW_COUNT,
  EXPECTED_NEGATIVE_GENERAL_REVENUE_COUNT,
  EXPECTED_ZERO_AMOUNT_PROGRAM_COUNT,
  parseSourceBudgetRows,
  serializeBudgetPrograms,
  transformBudgetPrograms,
  validateBudgetProgramPhase16Regression,
  validateBudgetPrograms,
  validateBudgetProgramSourceTraceability,
  validateGeneralProgramRegression,
} from "./budget-programs";
import {
  EXPECTED_DEPARTMENT_NAME_COUNT,
  parseDepartmentNameMap,
  renderDepartmentMappingReport,
} from "./department-name-map";

interface CliOptions {
  baselinePath: string;
  configPath: string;
  inputPath: string;
  mappingPath: string;
  outputPath: string;
  reportPath: string;
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  let inputPath = path.join(repoRoot, "raw", "ippansaisyutu.csv");
  let configPath = path.join(repoRoot, "config", "budget-accounts.json");
  let mappingPath = path.join(
    repoRoot,
    "config",
    "department_name_map.csv",
  );
  let outputPath = path.join(repoRoot, "processed", "budget_programs.csv");
  let reportPath = path.join(
    repoRoot,
    "docs",
    "department_mapping_report.md",
  );
  let baselinePath = outputPath;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }

    const value = args[index + 1];
    if (argument === "--input" && value) {
      inputPath = path.resolve(value);
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
    if (argument === "--mapping" && value) {
      mappingPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--report" && value) {
      reportPath = path.resolve(value);
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
    inputPath,
    mappingPath,
    outputPath,
    reportPath,
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
  const [inputBytes, configText, mappingText, baselineCsv] =
    await Promise.all([
    fs.readFile(options.inputPath),
    fs.readFile(options.configPath, "utf8"),
    fs.readFile(options.mappingPath, "utf8"),
    readExistingOutput(options.baselinePath),
  ]);
  const decoded = decodeBudgetCsv(inputBytes);
  const sourceRows = parseSourceBudgetRows(decoded.text);
  const config = parseBudgetAccountsConfig(configText);
  const departmentMappings = parseDepartmentNameMap(mappingText);
  const sourceFile = path.basename(options.inputPath);
  const programs = transformBudgetPrograms(
    sourceRows,
    config,
    departmentMappings,
    sourceFile,
  );
  const validation = validateBudgetPrograms(programs, config);
  const phase16Regression = baselineCsv
    ? validateBudgetProgramPhase16Regression(baselineCsv, programs)
    : null;
  const generalRegression = baselineCsv
    ? validateGeneralProgramRegression(baselineCsv, programs)
    : null;
  const traceability = validateBudgetProgramSourceTraceability(
    programs,
    sourceRows,
    config,
    sourceFile,
  );
  if (validation.rowCount !== EXPECTED_BUDGET_PROGRAM_ROW_COUNT) {
    throw new Error(
      `budget_programs行数がPhase 16基準と一致しません: ` +
        `${validation.rowCount} != ${EXPECTED_BUDGET_PROGRAM_ROW_COUNT}`,
    );
  }
  if (
    validation.uniqueBudgetProgramGroupIdCount !==
    EXPECTED_BUDGET_PROGRAM_GROUP_COUNT
  ) {
    throw new Error(
      `budget_program_group_id種類数が一致しません: ` +
        `${validation.uniqueBudgetProgramGroupIdCount} != ` +
        EXPECTED_BUDGET_PROGRAM_GROUP_COUNT,
    );
  }
  if (validation.zeroAmountCount !== EXPECTED_ZERO_AMOUNT_PROGRAM_COUNT) {
    throw new Error(
      `0円事業行数が一致しません: ${validation.zeroAmountCount} != ` +
        EXPECTED_ZERO_AMOUNT_PROGRAM_COUNT,
    );
  }
  if (
    validation.negativeGeneralRevenueCount !==
    EXPECTED_NEGATIVE_GENERAL_REVENUE_COUNT
  ) {
    throw new Error(
      `一般財源額が負数の行数が一致しません: ` +
        `${validation.negativeGeneralRevenueCount} != ` +
      EXPECTED_NEGATIVE_GENERAL_REVENUE_COUNT,
    );
  }
  if (
    validation.uniqueDepartmentNameCount !==
    EXPECTED_DEPARTMENT_NAME_COUNT
  ) {
    throw new Error(
      `department_name種類数が一致しません: ` +
        `${validation.uniqueDepartmentNameCount} != ` +
        EXPECTED_DEPARTMENT_NAME_COUNT,
    );
  }
  if (departmentMappings.length !== EXPECTED_DEPARTMENT_NAME_COUNT) {
    throw new Error(
      `部署名マッピング件数が一致しません: ` +
        `${departmentMappings.length} != ` +
        EXPECTED_DEPARTMENT_NAME_COUNT,
    );
  }
  if (validation.departmentNeedsReviewCount !== 0) {
    throw new Error(
      `needs_reviewの部署名マッピングが残っています: ` +
        validation.departmentNeedsReviewCount,
    );
  }
  const outputCsv = serializeBudgetPrograms(programs);
  const reportMarkdown = renderDepartmentMappingReport({
    mappings: departmentMappings,
    programRowCount: programs.length,
    rawDepartmentNameCount: validation.uniqueDepartmentNameCount,
    programStatusCounts: validation.departmentMappingStatusCounts,
    phase16RegressionRowCount:
      phase16Regression?.rowCount ?? programs.length,
    phase16RegressionColumnCount:
      phase16Regression?.comparedColumnCount ?? 0,
  });

  await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.mkdir(path.dirname(options.reportPath), { recursive: true });
  const temporaryOutputPath = `${options.outputPath}.${process.pid}.tmp`;
  const temporaryReportPath = `${options.reportPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryOutputPath, outputCsv, "utf8");
  await fs.writeFile(temporaryReportPath, reportMarkdown, "utf8");
  await fs.rename(temporaryOutputPath, options.outputPath);
  await fs.rename(temporaryReportPath, options.reportPath);

  console.log(`Input: ${options.inputPath}`);
  console.log(`Config: ${options.configPath}`);
  console.log(`Department mapping: ${options.mappingPath}`);
  console.log(`Baseline: ${options.baselinePath}`);
  console.log(`Detected encoding: ${decoded.encoding}`);
  console.log(`Source records: ${sourceRows.length.toLocaleString("en-US")}`);
  for (const account of config.accounts) {
    console.log(
      `${account.account_code}: ` +
        `${validation.accountRowCounts[account.account_code].toLocaleString("en-US")} rows, ` +
        `${validation.accountAmountTotalsThousandYen[
          account.account_code
        ].toLocaleString("en-US")} thousand yen`,
    );
  }
  console.log(`Filtered records: ${validation.rowCount.toLocaleString("en-US")}`);
  console.log(
    `Unique program IDs: ` +
      validation.uniqueProgramIdCount.toLocaleString("en-US"),
  );
  console.log(
    `Consistent budget item keys: ` +
      validation.budgetItemKeyConsistencyCount.toLocaleString("en-US"),
  );
  console.log(
    `Balanced revenue rows: ` +
      validation.revenueBalanceCount.toLocaleString("en-US"),
  );
  console.log(
    `Unique budget program groups: ` +
      validation.uniqueBudgetProgramGroupIdCount.toLocaleString("en-US"),
  );
  console.log(
    `Zero-amount rows: ` +
      validation.zeroAmountCount.toLocaleString("en-US"),
  );
  console.log(
    `Negative general-revenue rows preserved: ` +
      validation.negativeGeneralRevenueCount.toLocaleString("en-US"),
  );
  console.log(
    `Unique department_name values: ` +
      validation.uniqueDepartmentNameCount.toLocaleString("en-US"),
  );
  for (const [status, count] of Object.entries(
    validation.departmentMappingStatusCounts,
  )) {
    console.log(
      `Department mapping ${status}: ` +
        count.toLocaleString("en-US") +
        " rows",
    );
  }
  console.log(
    `Source rows recovered: ` +
      `${traceability.recoveredSourceRowCount.toLocaleString("en-US")}/` +
      traceability.rowCount.toLocaleString("en-US"),
  );
  console.log(
    `amount_thousand_yen total: ` +
      validation.amountTotalThousandYen.toLocaleString("en-US"),
  );
  console.log(
    `Expected total: ` +
      validation.expectedAmountTotalThousandYen.toLocaleString("en-US"),
  );
  if (phase16Regression) {
    console.log(
      `Phase 16 column regression: PASS ` +
        `(${phase16Regression.rowCount.toLocaleString("en-US")} rows, ` +
        `${phase16Regression.comparedColumnCount} columns)`,
    );
  } else {
    console.log(
      "Phase 16 column regression: SKIPPED " +
        "(baseline was not found)",
    );
  }
  if (generalRegression) {
    console.log(
      `General-account regression: PASS ` +
        `(${generalRegression.rowCount.toLocaleString("en-US")} rows)`,
    );
  } else {
    console.log(
      "General-account regression: SKIPPED (existing output was not found)",
    );
  }
  console.log("Validation: PASS");
  console.log(`Output: ${options.outputPath}`);
  console.log(`Report: ${options.reportPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
