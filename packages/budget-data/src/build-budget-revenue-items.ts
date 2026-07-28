import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
  EXPECTED_BUDGET_REVENUE_TOTAL,
} from "./budget-revenue-details";
import {
  EXPECTED_BUDGET_REVENUE_ITEM_ACCOUNT_COUNTS,
  EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT,
  parseBudgetRevenueSectionRows,
  serializeBudgetRevenueItems,
  transformBudgetRevenueItems,
  validateBudgetRevenueItems,
  validateSerializedBudgetRevenueItems,
} from "./budget-revenue-items";
import {
  EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
  parseBudgetRevenueDetailRows,
} from "./budget-revenue-sections";

interface CliOptions {
  detailsPath: string;
  outputPath: string;
  sectionsPath: string;
}

function resolveCliPath(value: string, repoRoot: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(repoRoot, value);
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  let detailsPath = path.join(
    repoRoot,
    "processed",
    "budget_revenue_details.csv",
  );
  let sectionsPath = path.join(
    repoRoot,
    "processed",
    "budget_revenue_sections.csv",
  );
  let outputPath = path.join(
    repoRoot,
    "processed",
    "budget_revenue_items.csv",
  );

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }

    const value = args[index + 1];
    if (argument === "--details" && value) {
      detailsPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--sections" && value) {
      sectionsPath = resolveCliPath(value, repoRoot);
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
    detailsPath,
    outputPath,
    sectionsPath,
  };
}

async function readUtf8(pathname: string): Promise<string> {
  const bytes = await fs.readFile(pathname);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function writeValidatedOutput(
  outputPath: string,
  outputCsv: string,
  expectedRows: ReturnType<typeof transformBudgetRevenueItems>,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryOutputPath = `${outputPath}.${process.pid}.tmp`;

  try {
    await fs.writeFile(temporaryOutputPath, outputCsv, "utf8");
    const decoded = await readUtf8(temporaryOutputPath);
    validateSerializedBudgetRevenueItems(decoded, expectedRows);
    await fs.rename(temporaryOutputPath, outputPath);
  } finally {
    await fs.rm(temporaryOutputPath, { force: true });
  }
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const [detailsCsv, sectionsCsv] = await Promise.all([
    readUtf8(options.detailsPath),
    readUtf8(options.sectionsPath),
  ]);
  const details = parseBudgetRevenueDetailRows(detailsCsv);
  const sections = parseBudgetRevenueSectionRows(sectionsCsv);
  const items = transformBudgetRevenueItems(details, sections);
  const validation = validateBudgetRevenueItems(
    items,
    details,
    sections,
  );

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
    validation.sourceSectionRowCount !==
    EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT
  ) {
    throw new Error(
      `入力歳入節行数が一致しません: ` +
        `${validation.sourceSectionRowCount} != ` +
        EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
    );
  }
  if (
    validation.rowCount !== EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT ||
    validation.uniqueRevenueItemKeyCount !==
      EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT
  ) {
    throw new Error(
      `budget_revenue_itemsの行数または一意キー数が一致しません: ` +
        `${validation.rowCount} / ` +
        `${validation.uniqueRevenueItemKeyCount} != ` +
        EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT,
    );
  }
  for (const [accountCode, expectedCount] of Object.entries(
    EXPECTED_BUDGET_REVENUE_ITEM_ACCOUNT_COUNTS,
  )) {
    const actualCount = validation.accountItemCounts[accountCode] ?? 0;
    if (actualCount !== expectedCount) {
      throw new Error(
        `${accountCode}の歳入目件数が一致しません: ` +
          `${actualCount} != ${expectedCount}`,
      );
    }
  }
  if (
    validation.detailsCurrentAmountTotalThousandYen !==
      EXPECTED_BUDGET_REVENUE_TOTAL ||
    validation.sectionsCurrentAmountTotalThousandYen !==
      EXPECTED_BUDGET_REVENUE_TOTAL ||
    validation.itemsCurrentAmountTotalThousandYen !==
      EXPECTED_BUDGET_REVENUE_TOTAL
  ) {
    throw new Error(
      `歳入details・sections・itemsの全会計合計が一致しません: ` +
        `${validation.detailsCurrentAmountTotalThousandYen} / ` +
        `${validation.sectionsCurrentAmountTotalThousandYen} / ` +
        `${validation.itemsCurrentAmountTotalThousandYen} != ` +
        EXPECTED_BUDGET_REVENUE_TOTAL,
    );
  }
  if (
    validation.accountCurrentAmountTotalsThousandYen.general !==
      431_353_010 ||
    validation.accountGeneralRevenueTotalsThousandYen.general !==
      279_402_113 ||
    validation.accountSpecificRevenueTotalsThousandYen.general !==
      151_950_897
  ) {
    throw new Error(
      `一般会計の現計額または財源集計が一致しません: ` +
        `${validation.accountCurrentAmountTotalsThousandYen.general} / ` +
        `${validation.accountGeneralRevenueTotalsThousandYen.general} / ` +
        validation.accountSpecificRevenueTotalsThousandYen.general,
    );
  }
  if (!validation.isPass) {
    throw new Error(
      `歳入目の検証に失敗しました: ` +
        `error=${validation.errorStatusCount}, ` +
        `reconciled=${validation.reconciledItemCount}/` +
        validation.rowCount,
    );
  }

  const outputCsv = serializeBudgetRevenueItems(items);
  await writeValidatedOutput(options.outputPath, outputCsv, items);

  console.log(`Details: ${options.detailsPath}`);
  console.log(`Sections: ${options.sectionsPath}`);
  console.log("Detected encoding: utf-8");
  console.log(
    `Source details: ` +
      validation.sourceDetailRowCount.toLocaleString("en-US"),
  );
  console.log(
    `Source sections: ` +
      validation.sourceSectionRowCount.toLocaleString("en-US"),
  );
  for (const accountCode of Object.keys(
    EXPECTED_BUDGET_REVENUE_ITEM_ACCOUNT_COUNTS,
  )) {
    console.log(
      `${accountCode}: ` +
        `${validation.accountItemCounts[
          accountCode
        ].toLocaleString("en-US")} items, ` +
        `${validation.accountCurrentAmountTotalsThousandYen[
          accountCode
        ].toLocaleString("en-US")} thousand yen`,
    );
  }
  console.log(
    `Revenue items: ${validation.rowCount.toLocaleString("en-US")}`,
  );
  console.log(
    `Unique revenue_item_key: ` +
      validation.uniqueRevenueItemKeyCount.toLocaleString("en-US"),
  );
  console.log(
    `Matched detail_count: ` +
      `${validation.detailCountTotal.toLocaleString("en-US")}/` +
      validation.sourceDetailRowCount.toLocaleString("en-US"),
  );
  console.log(
    `Matched section_count: ` +
      `${validation.sectionCountTotal.toLocaleString("en-US")}/` +
      validation.sourceSectionRowCount.toLocaleString("en-US"),
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
    `details current total: ` +
      validation.detailsCurrentAmountTotalThousandYen.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `sections current total: ` +
      validation.sectionsCurrentAmountTotalThousandYen.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `items current total: ` +
      validation.itemsCurrentAmountTotalThousandYen.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `general account funding: general=` +
      validation.accountGeneralRevenueTotalsThousandYen.general.toLocaleString(
        "en-US",
      ) +
      ", specific=" +
      validation.accountSpecificRevenueTotalsThousandYen.general.toLocaleString(
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
