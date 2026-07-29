import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
  EXPECTED_BUDGET_REVENUE_TOTAL,
} from "./budget-revenue-details";
import {
  EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
  parseBudgetRevenueDetailRows,
  serializeBudgetRevenueSections,
  transformBudgetRevenueSections,
  validateBudgetRevenueSections,
  validateSerializedBudgetRevenueSections,
} from "./budget-revenue-sections";

interface CliOptions {
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
  let inputPath = path.join(
    repoRoot,
    "processed", "core", "budget_revenue_details.csv",
  );
  let outputPath = path.join(
    repoRoot,
    "processed", "core", "budget_revenue_sections.csv",
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
    if (argument === "--output" && value) {
      outputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    throw new Error(`不明な引数です: ${argument}`);
  }

  return {
    inputPath,
    outputPath,
  };
}

async function writeValidatedOutput(
  outputPath: string,
  outputCsv: string,
  expectedRows: ReturnType<typeof transformBudgetRevenueSections>,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryOutputPath = `${outputPath}.${process.pid}.tmp`;

  try {
    await fs.writeFile(temporaryOutputPath, outputCsv, "utf8");
    const temporaryBytes = await fs.readFile(temporaryOutputPath);
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
      temporaryBytes,
    );
    validateSerializedBudgetRevenueSections(decoded, expectedRows);
    await fs.rename(temporaryOutputPath, outputPath);
  } finally {
    await fs.rm(temporaryOutputPath, { force: true });
  }
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const inputBytes = await fs.readFile(options.inputPath);
  const inputCsv = new TextDecoder("utf-8", { fatal: true }).decode(
    inputBytes,
  );
  const details = parseBudgetRevenueDetailRows(inputCsv);
  const sections = transformBudgetRevenueSections(details);
  const validation = validateBudgetRevenueSections(sections, details);

  if (
    validation.sourceDetailRowCount !==
    EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT
  ) {
    throw new Error(
      `入力歳入明細行数が一致しません: ` +
        `${validation.sourceDetailRowCount} != ` +
        EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
    );
  }
  if (
    validation.rowCount !== EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT
  ) {
    throw new Error(
      `budget_revenue_sections行数が一致しません: ` +
        `${validation.rowCount} != ` +
        EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
    );
  }
  if (
    validation.uniqueRevenueSectionIdCount !== validation.rowCount
  ) {
    throw new Error("revenue_section_idが全件一意ではありません。");
  }
  if (
    validation.detailsCurrentAmountTotalThousandYen !==
      EXPECTED_BUDGET_REVENUE_TOTAL ||
    validation.sectionsCurrentAmountTotalThousandYen !==
      EXPECTED_BUDGET_REVENUE_TOTAL
  ) {
    throw new Error(
      `歳入明細または歳入節の全会計合計が一致しません: ` +
        `${validation.detailsCurrentAmountTotalThousandYen} / ` +
        `${validation.sectionsCurrentAmountTotalThousandYen} != ` +
        EXPECTED_BUDGET_REVENUE_TOTAL,
    );
  }
  if (!validation.isPass) {
    throw new Error(
      `歳入節の検証に失敗しました: ` +
        `error=${validation.errorStatusCount}, ` +
        `detail_count=${validation.detailCountTotal}/` +
        validation.sourceDetailRowCount,
    );
  }

  const outputCsv = serializeBudgetRevenueSections(sections);
  await writeValidatedOutput(options.outputPath, outputCsv, sections);

  console.log(`Input: ${options.inputPath}`);
  console.log("Detected encoding: utf-8");
  console.log(
    `Source details: ` +
      validation.sourceDetailRowCount.toLocaleString("en-US"),
  );
  for (const [accountCode, amount] of Object.entries(
    validation.accountCurrentAmountTotalsThousandYen,
  )) {
    console.log(
      `${accountCode}: ` +
        `${validation.accountSectionCounts[
          accountCode
        ].toLocaleString("en-US")} sections, ` +
        `${amount.toLocaleString("en-US")} thousand yen`,
    );
  }
  console.log(
    `Revenue sections: ${validation.rowCount.toLocaleString("en-US")}`,
  );
  console.log(
    `Unique revenue_section_id: ` +
      validation.uniqueRevenueSectionIdCount.toLocaleString("en-US"),
  );
  console.log(
    `Matched detail_count: ` +
      `${validation.detailCountTotal.toLocaleString("en-US")}/` +
      validation.sourceDetailRowCount.toLocaleString("en-US"),
  );
  for (const [status, count] of Object.entries(
    validation.statusCounts,
  )) {
    console.log(
      `validation_status ${status}: ` +
        count.toLocaleString("en-US"),
    );
  }
  console.log(
    `general_revenue_thousand_yen total: ` +
      validation.generalRevenueTotalThousandYen.toLocaleString("en-US"),
  );
  console.log(
    `specific_revenue_thousand_yen total: ` +
      validation.specificRevenueTotalThousandYen.toLocaleString("en-US"),
  );
  console.log(
    `special_account_revenue_thousand_yen total: ` +
      validation.specialAccountRevenueTotalThousandYen.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `current_amount_thousand_yen total: ` +
      validation.sectionsCurrentAmountTotalThousandYen.toLocaleString(
        "en-US",
      ),
  );
  console.log("Temporary UTF-8 output verification: PASS");
  console.log("Validation: PASS");
  console.log(`Output: ${options.outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
