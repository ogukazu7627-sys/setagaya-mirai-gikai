import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import {
  decodeBudgetCsv,
} from "./budget-programs";
import {
  EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
  EXPECTED_BUDGET_REVENUE_TOTAL,
  EXPECTED_REVENUE_ITEM_KEY_COUNT,
  EXPECTED_REVENUE_SECTION_ID_COUNT,
  parseSourceBudgetRevenueRows,
  serializeBudgetRevenueDetails,
  transformBudgetRevenueDetails,
  validateBudgetRevenueDetails,
  validateBudgetRevenueSourceTraceability,
  validateSerializedBudgetRevenueDetails,
} from "./budget-revenue-details";

interface CliOptions {
  configPath: string;
  inputPath: string;
  outputPath: string;
}

function resolveCliPath(value: string, repoRoot: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(repoRoot, value);
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  let inputPath = path.join(repoRoot, "raw", "ippansainyu.csv");
  let configPath = path.join(repoRoot, "config", "budget-accounts.json");
  let outputPath = path.join(
    repoRoot,
    "processed", "core", "budget_revenue_details.csv",
  );

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }

    const value = args[index + 1];
    if (argument === "--input" && value) {
      inputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--config" && value) {
      configPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--output" && value) {
      outputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    throw new Error(`不明な引数です: ${argument}`);
  }

  return {
    configPath,
    inputPath,
    outputPath,
  };
}

async function writeValidatedOutput(
  outputPath: string,
  outputCsv: string,
  expectedRows: ReturnType<typeof transformBudgetRevenueDetails>,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryOutputPath = `${outputPath}.${process.pid}.tmp`;

  try {
    await fs.writeFile(temporaryOutputPath, outputCsv, "utf8");
    const temporaryBytes = await fs.readFile(temporaryOutputPath);
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
      temporaryBytes,
    );
    validateSerializedBudgetRevenueDetails(decoded, expectedRows);
    await fs.rename(temporaryOutputPath, outputPath);
  } finally {
    await fs.rm(temporaryOutputPath, { force: true });
  }
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const [inputBytes, configText] = await Promise.all([
    fs.readFile(options.inputPath),
    fs.readFile(options.configPath, "utf8"),
  ]);
  const decoded = decodeBudgetCsv(inputBytes);
  const sourceRows = parseSourceBudgetRevenueRows(decoded.text);
  const config = parseBudgetAccountsConfig(configText);
  const sourceFile = path.basename(options.inputPath);
  const details = transformBudgetRevenueDetails(
    sourceRows,
    config,
    sourceFile,
  );
  const validation = validateBudgetRevenueDetails(details, config);
  const traceability = validateBudgetRevenueSourceTraceability(
    details,
    sourceRows,
    config,
    sourceFile,
  );

  if (
    validation.rowCount !== EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT
  ) {
    throw new Error(
      `budget_revenue_details行数が一致しません: ` +
        `${validation.rowCount} != ` +
        EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
    );
  }
  if (
    validation.uniqueRevenueDetailIdCount !== validation.rowCount
  ) {
    throw new Error("revenue_detail_idが全件一意ではありません。");
  }
  if (
    validation.uniqueRevenueItemKeyCount !==
    EXPECTED_REVENUE_ITEM_KEY_COUNT
  ) {
    throw new Error(
      `revenue_item_key種類数が一致しません: ` +
        `${validation.uniqueRevenueItemKeyCount} != ` +
        EXPECTED_REVENUE_ITEM_KEY_COUNT,
    );
  }
  if (
    validation.uniqueRevenueSectionIdCount !==
    EXPECTED_REVENUE_SECTION_ID_COUNT
  ) {
    throw new Error(
      `revenue_section_id種類数が一致しません: ` +
        `${validation.uniqueRevenueSectionIdCount} != ` +
        EXPECTED_REVENUE_SECTION_ID_COUNT,
    );
  }
  if (
    validation.balancedRowCount !== validation.rowCount ||
    validation.zeroFlagConsistentCount !== validation.rowCount
  ) {
    throw new Error("金額または0円フラグの全行検証に失敗しました。");
  }
  if (
    validation.currentAmountTotalThousandYen !==
    EXPECTED_BUDGET_REVENUE_TOTAL
  ) {
    throw new Error(
      `全会計の現計予算額合計が一致しません: ` +
        `${validation.currentAmountTotalThousandYen} != ` +
        EXPECTED_BUDGET_REVENUE_TOTAL,
    );
  }
  if (traceability.recoveredSourceRowCount !== details.length) {
    throw new Error("source_row_numberによる全件復元に失敗しました。");
  }

  const outputCsv = serializeBudgetRevenueDetails(details);
  await writeValidatedOutput(options.outputPath, outputCsv, details);

  console.log(`Input: ${options.inputPath}`);
  console.log(`Config: ${options.configPath}`);
  console.log(`Detected encoding: ${decoded.encoding}`);
  console.log(
    `Source records: ${sourceRows.length.toLocaleString("en-US")}`,
  );
  for (const account of config.accounts) {
    console.log(
      `${account.account_code}: ` +
        `${validation.accountRowCounts[
          account.account_code
        ].toLocaleString("en-US")} rows, ` +
        `${validation.accountCurrentAmountTotalsThousandYen[
          account.account_code
        ].toLocaleString("en-US")} thousand yen`,
    );
  }
  console.log(
    `Filtered records: ${validation.rowCount.toLocaleString("en-US")}`,
  );
  console.log(
    `Unique revenue_detail_id: ` +
      validation.uniqueRevenueDetailIdCount.toLocaleString("en-US"),
  );
  console.log(
    `Unique revenue_item_key: ` +
      validation.uniqueRevenueItemKeyCount.toLocaleString("en-US"),
  );
  console.log(
    `Unique revenue_section_id: ` +
      validation.uniqueRevenueSectionIdCount.toLocaleString("en-US"),
  );
  console.log(
    `Balanced rows: ` +
      `${validation.balancedRowCount.toLocaleString("en-US")}/` +
      validation.rowCount.toLocaleString("en-US"),
  );
  console.log(
    `Zero-amount rows: ` +
      validation.zeroAmountCount.toLocaleString("en-US"),
  );
  console.log(
    `Source rows recovered: ` +
      `${traceability.recoveredSourceRowCount.toLocaleString("en-US")}/` +
      traceability.rowCount.toLocaleString("en-US"),
  );
  console.log(
    `current_amount_thousand_yen total: ` +
      validation.currentAmountTotalThousandYen.toLocaleString("en-US"),
  );
  console.log("Temporary UTF-8 output verification: PASS");
  console.log("Validation: PASS");
  console.log(`Output: ${options.outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
