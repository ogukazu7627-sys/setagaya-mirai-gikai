import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { parse } from "csv-parse/sync";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import { decodeBudgetCsv } from "./budget-programs";
import {
  parseSourceBudgetRevenueRows,
} from "./budget-revenue-details";
import {
  parseBudgetRevenueSectionRows,
} from "./budget-revenue-items";
import {
  parseRevenueValidationDetails,
  parseRevenueValidationItems,
  renderRevenueValidationReport,
  REVENUE_VALIDATION_ERROR_COLUMNS,
  serializeRevenueValidationErrors,
  validateBudgetRevenueData,
} from "./budget-revenue-validation";

interface CliOptions {
  configPath: string;
  detailsPath: string;
  errorsOutputPath: string;
  itemsPath: string;
  rawPath: string;
  reportOutputPath: string;
  sectionsPath: string;
}

function resolveCliPath(value: string, repoRoot: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(repoRoot, value);
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const options: CliOptions = {
    rawPath: path.join(repoRoot, "raw", "ippansainyu.csv"),
    detailsPath: path.join(
      repoRoot,
      "processed",
      "budget_revenue_details.csv",
    ),
    sectionsPath: path.join(
      repoRoot,
      "processed",
      "budget_revenue_sections.csv",
    ),
    itemsPath: path.join(
      repoRoot,
      "processed",
      "budget_revenue_items.csv",
    ),
    configPath: path.join(repoRoot, "config", "budget-accounts.json"),
    errorsOutputPath: path.join(
      repoRoot,
      "processed",
      "revenue_validation_errors.csv",
    ),
    reportOutputPath: path.join(
      repoRoot,
      "docs",
      "revenue_validation_report.md",
    ),
  };
  const optionNames: Record<string, keyof CliOptions> = {
    "--raw": "rawPath",
    "--details": "detailsPath",
    "--sections": "sectionsPath",
    "--items": "itemsPath",
    "--config": "configPath",
    "--errors-output": "errorsOutputPath",
    "--report-output": "reportOutputPath",
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    const optionName = optionNames[argument];
    const value = args[index + 1];
    if (!optionName || !value) {
      throw new Error(`不明または値のない引数です: ${argument}`);
    }
    options[optionName] = resolveCliPath(value, repoRoot);
    index += 1;
  }
  return options;
}

async function readUtf8(pathname: string): Promise<string> {
  const bytes = await fs.readFile(pathname);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function validateErrorsCsv(csvText: string, expectedRows: number): void {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: false,
  }) as string[][];
  if (
    records.length !== expectedRows + 1 ||
    records[0].join(",") !== REVENUE_VALIDATION_ERROR_COLUMNS.join(",")
  ) {
    throw new Error("一時出力したrevenue_validation_errors.csvが不正です。");
  }
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const [
    rawBytes,
    detailsCsv,
    sectionsCsv,
    itemsCsv,
    configText,
  ] = await Promise.all([
    fs.readFile(options.rawPath),
    readUtf8(options.detailsPath),
    readUtf8(options.sectionsPath),
    readUtf8(options.itemsPath),
    readUtf8(options.configPath),
  ]);
  const decodedRaw = decodeBudgetCsv(rawBytes);
  const config = parseBudgetAccountsConfig(configText);
  const inputs = {
    rawSourceRows: parseSourceBudgetRevenueRows(decodedRaw.text),
    rawSourceFile: path.basename(options.rawPath),
    details: parseRevenueValidationDetails(detailsCsv),
    sections: parseBudgetRevenueSectionRows(sectionsCsv),
    items: parseRevenueValidationItems(itemsCsv),
  };
  const result = validateBudgetRevenueData(inputs, config);
  const errorsCsv = serializeRevenueValidationErrors(result.errors);
  const report = renderRevenueValidationReport(result, {
    raw: path.relative(
      path.resolve(import.meta.dirname, "../../.."),
      options.rawPath,
    ),
    details: path.relative(
      path.resolve(import.meta.dirname, "../../.."),
      options.detailsPath,
    ),
    sections: path.relative(
      path.resolve(import.meta.dirname, "../../.."),
      options.sectionsPath,
    ),
    items: path.relative(
      path.resolve(import.meta.dirname, "../../.."),
      options.itemsPath,
    ),
    config: path.relative(
      path.resolve(import.meta.dirname, "../../.."),
      options.configPath,
    ),
    errors: path.relative(
      path.resolve(import.meta.dirname, "../../.."),
      options.errorsOutputPath,
    ),
  });

  await Promise.all([
    fs.mkdir(path.dirname(options.errorsOutputPath), { recursive: true }),
    fs.mkdir(path.dirname(options.reportOutputPath), { recursive: true }),
  ]);
  const errorsTemporaryPath =
    `${options.errorsOutputPath}.${process.pid}.tmp`;
  const reportTemporaryPath =
    `${options.reportOutputPath}.${process.pid}.tmp`;
  try {
    await Promise.all([
      fs.writeFile(errorsTemporaryPath, errorsCsv, "utf8"),
      fs.writeFile(reportTemporaryPath, report, "utf8"),
    ]);
    const [verifiedErrors, verifiedReport] = await Promise.all([
      readUtf8(errorsTemporaryPath),
      readUtf8(reportTemporaryPath),
    ]);
    validateErrorsCsv(verifiedErrors, result.errors.length);
    if (
      !verifiedReport.includes(
        `**${result.isPass ? "PASS" : "FAIL"}**`,
      )
    ) {
      throw new Error("一時出力した歳入検証レポートの判定が不正です。");
    }
    await Promise.all([
      fs.rename(errorsTemporaryPath, options.errorsOutputPath),
      fs.rename(reportTemporaryPath, options.reportOutputPath),
    ]);
  } finally {
    await Promise.all([
      fs.rm(errorsTemporaryPath, { force: true }),
      fs.rm(reportTemporaryPath, { force: true }),
    ]);
  }

  console.log(`Raw input encoding: ${decodedRaw.encoding}`);
  console.log(
    `Rows: details=${result.rowCounts.details.toLocaleString("en-US")}, ` +
      `sections=${result.rowCounts.sections.toLocaleString("en-US")}, ` +
      `items=${result.rowCounts.items.toLocaleString("en-US")}`,
  );
  for (const account of result.accountSummaries) {
    console.log(
      `${account.accountCode}: ` +
        `expected=${account.expectedAmountThousandYen.toLocaleString("en-US")}, ` +
        `details=${account.detailAmountThousandYen.toLocaleString("en-US")}, ` +
        `sections=${account.sectionAmountThousandYen.toLocaleString("en-US")}, ` +
        `items=${account.itemAmountThousandYen.toLocaleString("en-US")}`,
    );
  }
  console.log(
    `Totals: details=${result.totals.details.toLocaleString("en-US")}, ` +
      `sections=${result.totals.sections.toLocaleString("en-US")}, ` +
      `items=${result.totals.items.toLocaleString("en-US")}`,
  );
  console.log(
    `General funding: general=` +
      result.generalFundingTotals.detailsGeneral.toLocaleString("en-US") +
      ", specific=" +
      result.generalFundingTotals.detailsSpecific.toLocaleString("en-US"),
  );
  console.log(
    `Source rows matched: ` +
      `${result.sourceTraceability.fullyMatchedSourceRows.toLocaleString("en-US")}/` +
      result.sourceTraceability.expectedSourceRows.toLocaleString("en-US"),
  );
  console.log(
    `Aggregation mismatches: details->sections=` +
      result.aggregationChecks.detailsToSectionsMismatchCount +
      ", details->items=" +
      result.aggregationChecks.detailsToItemsMismatchCount +
      ", sections->items=" +
      result.aggregationChecks.sectionsToItemsMismatchCount,
  );
  console.log(
    `Validation errors: ${result.errors.length.toLocaleString("en-US")}`,
  );
  console.log(`Validation: ${result.isPass ? "PASS" : "FAIL"}`);
  console.log(`Errors output: ${options.errorsOutputPath}`);
  console.log(`Report output: ${options.reportOutputPath}`);

  if (!result.isPass) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
