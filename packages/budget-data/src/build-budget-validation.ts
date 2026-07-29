import fs from "node:fs/promises";
import path from "node:path";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import {
  parseValidationGeneralRawSectionRows,
  parseValidationItemRows,
  parseValidationProgramRows,
  parseValidationSectionRows,
  parseValidationSpecialRawSectionRows,
  renderValidationReport,
  serializeValidationErrors,
  validateBudgetData,
} from "./budget-validation";

interface CliOptions {
  configPath: string;
  errorsOutputPath: string;
  itemsPath: string;
  programsPath: string;
  rawSectionsPath: string;
  rawSpecialSectionsPath: string;
  reportOutputPath: string;
  sectionsPath: string;
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const options: CliOptions = {
    programsPath: path.join(
      repoRoot,
      "processed", "core", "budget_programs.csv",
    ),
    sectionsPath: path.join(
      repoRoot,
      "processed", "core", "budget_sections.csv",
    ),
    itemsPath: path.join(repoRoot, "processed", "core", "budget_items.csv"),
    rawSectionsPath: path.join(
      repoRoot,
      "processed", "audit", "raw_pdf_sections.csv",
    ),
    rawSpecialSectionsPath: path.join(
      repoRoot,
      "processed", "audit", "raw_pdf_sections_special.csv",
    ),
    configPath: path.join(repoRoot, "config", "budget-accounts.json"),
    errorsOutputPath: path.join(
      repoRoot,
      "processed", "validation", "validation_errors.csv",
    ),
    reportOutputPath: path.join(
      repoRoot,
      "docs", "validation", "validation_report.md",
    ),
  };
  const optionNames: Record<string, keyof CliOptions> = {
    "--programs": "programsPath",
    "--sections": "sectionsPath",
    "--items": "itemsPath",
    "--raw-sections": "rawSectionsPath",
    "--raw-special-sections": "rawSpecialSectionsPath",
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
    options[optionName] = path.resolve(value);
    index += 1;
  }

  return options;
}

function currentDateInJapan(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const [
    programsCsv,
    sectionsCsv,
    itemsCsv,
    rawSectionsCsv,
    rawSpecialSectionsCsv,
    configText,
  ] = await Promise.all([
    fs.readFile(options.programsPath, "utf8"),
    fs.readFile(options.sectionsPath, "utf8"),
    fs.readFile(options.itemsPath, "utf8"),
    fs.readFile(options.rawSectionsPath, "utf8"),
    fs.readFile(options.rawSpecialSectionsPath, "utf8"),
    fs.readFile(options.configPath, "utf8"),
  ]);
  const config = parseBudgetAccountsConfig(configText);
  const inputs = {
    programRows: parseValidationProgramRows(programsCsv),
    sectionRows: parseValidationSectionRows(sectionsCsv),
    itemRows: parseValidationItemRows(itemsCsv),
    generalRawSectionRows:
      parseValidationGeneralRawSectionRows(rawSectionsCsv),
    specialRawSectionRows:
      parseValidationSpecialRawSectionRows(rawSpecialSectionsCsv),
  };
  const result = validateBudgetData(inputs, config);
  const errorsCsv = serializeValidationErrors(result.errors);
  const report = renderValidationReport(result, currentDateInJapan());

  await Promise.all([
    fs.mkdir(path.dirname(options.errorsOutputPath), { recursive: true }),
    fs.mkdir(path.dirname(options.reportOutputPath), { recursive: true }),
  ]);
  const errorsTemporaryPath =
    `${options.errorsOutputPath}.${process.pid}.tmp`;
  const reportTemporaryPath =
    `${options.reportOutputPath}.${process.pid}.tmp`;
  await Promise.all([
    fs.writeFile(errorsTemporaryPath, errorsCsv, "utf8"),
    fs.writeFile(reportTemporaryPath, report, "utf8"),
  ]);
  await Promise.all([
    fs.rename(errorsTemporaryPath, options.errorsOutputPath),
    fs.rename(reportTemporaryPath, options.reportOutputPath),
  ]);

  console.log(
    `budget_programs rows: ` +
      result.rowCounts.budgetPrograms.toLocaleString("en-US"),
  );
  console.log(
    `budget_sections rows: ` +
      result.rowCounts.budgetSections.toLocaleString("en-US"),
  );
  console.log(
    `budget_items rows: ` +
      result.rowCounts.budgetItems.toLocaleString("en-US"),
  );
  console.log(
    `raw_pdf_sections rows: ` +
      result.rowCounts.rawPdfSectionsGeneral.toLocaleString("en-US"),
  );
  console.log(
    `raw_pdf_sections_special rows: ` +
      result.rowCounts.rawPdfSectionsSpecial.toLocaleString("en-US"),
  );
  for (const account of result.accountSummaries) {
    console.log(
      `${account.accountCode}: ` +
        `program=${account.programAmountThousandYen.toLocaleString("en-US")}, ` +
        `section=${account.sectionAmountThousandYen.toLocaleString("en-US")}, ` +
        `items_program=${account.itemProgramAmountThousandYen.toLocaleString("en-US")}, ` +
        `items_section=${account.itemSectionAmountThousandYen.toLocaleString("en-US")}`,
    );
  }
  console.log(
    `budget_programs total: ` +
      result.totals.budgetPrograms.toLocaleString("en-US"),
  );
  console.log(
    `budget_sections total: ` +
      result.totals.budgetSections.toLocaleString("en-US"),
  );
  console.log(
    `budget_items program_total: ` +
      result.totals.budgetItemsProgramTotal.toLocaleString("en-US"),
  );
  console.log(
    `budget_items section_total: ` +
      result.totals.budgetItemsSectionTotal.toLocaleString("en-US"),
  );
  for (const [status, count] of Object.entries(
    result.validationStatusCounts,
  )) {
    console.log(`${status}: ${count.toLocaleString("en-US")}`);
  }
  console.log(
    `ok_zero_amount items: ` +
      result.zeroAmountItems.length.toLocaleString("en-US"),
  );
  console.log(
    `needs_review rows: ` +
      result.needsReviewCounts.total.toLocaleString("en-US"),
  );
  console.log(
    `General-account Phase 6 compatibility: ` +
      `${result.generalCompatibility.isPass ? "PASS" : "FAIL"}`,
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
