import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { parse } from "csv-parse/sync";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import { parseBudgetProgramIdentitySourceGroups } from "./budget-program-identities";
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
  validateBudgetRevenueData,
} from "./budget-revenue-validation";
import {
  parseBudgetRevenueAllocationsForIdentityResolution,
} from "./revenue-allocation-identity-resolution";
import {
  REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS,
  renderBudgetRevenueDataDictionary,
  renderRevenueAllocationValidationReport,
  serializeRevenueAllocationValidationErrors,
  validateRevenueAllocationData,
} from "./revenue-allocation-validation";
import { parseRawPdfRevenueAllocations } from "./revenue-allocation-source-matches";

interface CliOptions {
  rawRevenuePath: string;
  accountsPath: string;
  revenueDetailsPath: string;
  revenueSectionsPath: string;
  revenueItemsPath: string;
  rawPdfAllocationsPath: string;
  budgetProgramGroupsPath: string;
  revenueAllocationsPath: string;
  budgetProgramsPath: string;
  budgetSectionsPath: string;
  budgetItemsPath: string;
  errorsOutputPath: string;
  reportOutputPath: string;
  dictionaryOutputPath: string;
}

function resolveCliPath(value: string, repoRoot: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(repoRoot, value);
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const options: CliOptions = {
    rawRevenuePath: path.join(repoRoot, "raw", "ippansainyu.csv"),
    accountsPath: path.join(
      repoRoot,
      "config",
      "budget-accounts.json",
    ),
    revenueDetailsPath: path.join(
      repoRoot,
      "processed", "core", "budget_revenue_details.csv",
    ),
    revenueSectionsPath: path.join(
      repoRoot,
      "processed", "core", "budget_revenue_sections.csv",
    ),
    revenueItemsPath: path.join(
      repoRoot,
      "processed", "core", "budget_revenue_items.csv",
    ),
    rawPdfAllocationsPath: path.join(
      repoRoot,
      "processed", "audit", "raw_pdf_revenue_allocations.csv",
    ),
    budgetProgramGroupsPath: path.join(
      repoRoot,
      "processed", "core", "budget_program_groups.csv",
    ),
    revenueAllocationsPath: path.join(
      repoRoot,
      "processed", "core", "budget_revenue_allocations.csv",
    ),
    budgetProgramsPath: path.join(
      repoRoot,
      "processed", "core", "budget_programs.csv",
    ),
    budgetSectionsPath: path.join(
      repoRoot,
      "processed", "core", "budget_sections.csv",
    ),
    budgetItemsPath: path.join(
      repoRoot,
      "processed", "core", "budget_items.csv",
    ),
    errorsOutputPath: path.join(
      repoRoot,
      "processed", "validation", "revenue_allocation_validation_errors.csv",
    ),
    reportOutputPath: path.join(
      repoRoot,
      "docs", "validation", "revenue_allocation_validation_report.md",
    ),
    dictionaryOutputPath: path.join(
      repoRoot,
      "docs",
      "budget_revenue_data_dictionary.md",
    ),
  };
  const optionNames: Record<string, keyof CliOptions> = {
    "--raw-revenue": "rawRevenuePath",
    "--accounts": "accountsPath",
    "--revenue-details": "revenueDetailsPath",
    "--revenue-sections": "revenueSectionsPath",
    "--revenue-items": "revenueItemsPath",
    "--raw-pdf-allocations": "rawPdfAllocationsPath",
    "--budget-program-groups": "budgetProgramGroupsPath",
    "--revenue-allocations": "revenueAllocationsPath",
    "--budget-programs": "budgetProgramsPath",
    "--budget-sections": "budgetSectionsPath",
    "--budget-items": "budgetItemsPath",
    "--errors-output": "errorsOutputPath",
    "--report-output": "reportOutputPath",
    "--dictionary-output": "dictionaryOutputPath",
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

function displayPath(pathname: string, repoRoot: string): string {
  const relative = path.relative(repoRoot, pathname);
  return relative.startsWith("..") ? pathname : relative;
}

function validateErrorsCsv(
  csvText: string,
  expectedRows: number,
): void {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: false,
  }) as string[][];
  if (
    records.length !== expectedRows + 1 ||
    records[0].join(",") !==
      REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS.join(",")
  ) {
    throw new Error(
      "一時出力したrevenue_allocation_validation_errors.csvが不正です。",
    );
  }
}

async function writeArtifactsAtomically(
  artifacts: Array<{
    path: string;
    content: string;
    validate: (content: string) => void;
  }>,
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
      artifacts[index].validate(
        await readUtf8(temporaryPaths[index]),
      );
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
    rawRevenueBytes,
    accountsJson,
    revenueDetailsCsv,
    revenueSectionsCsv,
    revenueItemsCsv,
    rawPdfAllocationsCsv,
    budgetProgramGroupsCsv,
    revenueAllocationsCsv,
    budgetProgramsCsv,
    budgetSectionsCsv,
    budgetItemsCsv,
  ] = await Promise.all([
    fs.readFile(options.rawRevenuePath),
    readUtf8(options.accountsPath),
    readUtf8(options.revenueDetailsPath),
    readUtf8(options.revenueSectionsPath),
    readUtf8(options.revenueItemsPath),
    readUtf8(options.rawPdfAllocationsPath),
    readUtf8(options.budgetProgramGroupsPath),
    readUtf8(options.revenueAllocationsPath),
    readUtf8(options.budgetProgramsPath),
    readUtf8(options.budgetSectionsPath),
    readUtf8(options.budgetItemsPath),
  ]);

  const decodedRawRevenue = decodeBudgetCsv(rawRevenueBytes);
  const config = parseBudgetAccountsConfig(accountsJson);
  const details = parseRevenueValidationDetails(revenueDetailsCsv);
  const sections = parseBudgetRevenueSectionRows(
    revenueSectionsCsv,
  );
  const items = parseRevenueValidationItems(revenueItemsCsv);
  const phase24 = validateBudgetRevenueData(
    {
      rawSourceRows: parseSourceBudgetRevenueRows(
        decodedRawRevenue.text,
      ),
      rawSourceFile: path.basename(options.rawRevenuePath),
      details,
      sections,
      items,
    },
    config,
  );
  const result = validateRevenueAllocationData({
    phase24,
    details,
    rawAllocations: parseRawPdfRevenueAllocations(
      rawPdfAllocationsCsv,
    ),
    programGroups: parseBudgetProgramIdentitySourceGroups(
      budgetProgramGroupsCsv,
    ),
    allocations:
      parseBudgetRevenueAllocationsForIdentityResolution(
        revenueAllocationsCsv,
      ),
    config,
    coreCsvTexts: {
      budgetPrograms: budgetProgramsCsv,
      budgetSections: budgetSectionsCsv,
      budgetItems: budgetItemsCsv,
      budgetProgramGroups: budgetProgramGroupsCsv,
    },
  });
  const errorsCsv = serializeRevenueAllocationValidationErrors(
    result.errors,
  );
  const report = renderRevenueAllocationValidationReport(result, {
    rawRevenueCsv: displayPath(
      options.rawRevenuePath,
      repoRoot,
    ),
    accountsConfig: displayPath(options.accountsPath, repoRoot),
    revenueDetails: displayPath(
      options.revenueDetailsPath,
      repoRoot,
    ),
    revenueSections: displayPath(
      options.revenueSectionsPath,
      repoRoot,
    ),
    revenueItems: displayPath(
      options.revenueItemsPath,
      repoRoot,
    ),
    rawPdfAllocations: displayPath(
      options.rawPdfAllocationsPath,
      repoRoot,
    ),
    budgetProgramGroups: displayPath(
      options.budgetProgramGroupsPath,
      repoRoot,
    ),
    revenueAllocations: displayPath(
      options.revenueAllocationsPath,
      repoRoot,
    ),
    budgetPrograms: displayPath(
      options.budgetProgramsPath,
      repoRoot,
    ),
    budgetSections: displayPath(
      options.budgetSectionsPath,
      repoRoot,
    ),
    budgetItems: displayPath(options.budgetItemsPath, repoRoot),
    errors: displayPath(options.errorsOutputPath, repoRoot),
    dictionary: displayPath(
      options.dictionaryOutputPath,
      repoRoot,
    ),
  });
  const dictionary = renderBudgetRevenueDataDictionary();

  await writeArtifactsAtomically([
    {
      path: options.errorsOutputPath,
      content: errorsCsv,
      validate: (content) =>
        validateErrorsCsv(content, result.errors.length),
    },
    {
      path: options.reportOutputPath,
      content: report,
      validate: (content) => {
        if (
          !content.includes(
            `**${result.isPass ? "PASS" : "FAIL"}**`,
          )
        ) {
          throw new Error(
            "一時出力した歳入・歳出接続検証レポートの判定が不正です。",
          );
        }
      },
    },
    {
      path: options.dictionaryOutputPath,
      content: dictionary,
      validate: (content) => {
        if (
          !content.includes(
            "# 令和8年度当初予算 歳入・充当関係データ辞書",
          ) ||
          !content.includes(
            "allocation行を合計してはいけない",
          )
        ) {
          throw new Error(
            "一時出力した歳入・充当関係データ辞書が不正です。",
          );
        }
      },
    },
  ]);

  console.log(`Raw revenue encoding: ${decodedRawRevenue.encoding}`);
  console.log(
    `Phase 24: ${phase24.isPass ? "PASS" : "FAIL"}, ` +
      `errors=${phase24.errors.length.toLocaleString("en-US")}`,
  );
  console.log(
    `Rows: raw=${result.rowCounts.rawAllocations.toLocaleString("en-US")}, ` +
      `allocations=${result.rowCounts.finalAllocations.toLocaleString("en-US")}`,
  );
  console.log(
    `Resolution: exact_group=` +
      result.resolutionCounts.exactGroup.toLocaleString("en-US") +
      ", public_identity=" +
      result.resolutionCounts.publicIdentity.toLocaleString("en-US") +
      ", ambiguous=" +
      result.resolutionCounts.ambiguous.toLocaleString("en-US") +
      ", unmatched=" +
      result.resolutionCounts.unmatched.toLocaleString("en-US"),
  );
  console.log(
    `Multiple-target revenue details: ` +
      result.multipleTargetRevenueDetails.length.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `Non-blank allocation amounts: ` +
      result.amountSafety.nonBlankAllocationAmountCount.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `Expenditure core hashes: ` +
      `${result.coreIntegrity.hashMatchCount}/3 matched`,
  );
  console.log(
    `Validation errors: ${result.errors.length.toLocaleString("en-US")}`,
  );
  console.log(`Validation: ${result.isPass ? "PASS" : "FAIL"}`);
  console.log(`Errors output: ${options.errorsOutputPath}`);
  console.log(`Report output: ${options.reportOutputPath}`);
  console.log(`Dictionary output: ${options.dictionaryOutputPath}`);

  if (!result.isPass) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
