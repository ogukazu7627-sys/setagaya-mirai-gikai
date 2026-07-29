import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { BudgetAccountsConfig } from "./budget-accounts";
import { BUDGET_ITEM_COLUMNS } from "./budget-items";
import { BUDGET_PROGRAM_COLUMNS } from "./budget-programs";
import {
  BUDGET_PROGRAM_IDENTITY_COLUMNS,
  BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS,
} from "./budget-program-identities";
import { BUDGET_PROGRAM_GROUP_COLUMNS } from "./budget-program-groups";
import {
  BUDGET_REVENUE_DETAIL_COLUMNS,
  EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
  EXPECTED_BUDGET_REVENUE_TOTAL,
} from "./budget-revenue-details";
import {
  BUDGET_REVENUE_ITEM_COLUMNS,
  EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT,
} from "./budget-revenue-items";
import {
  BUDGET_REVENUE_SECTION_COLUMNS,
  EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
} from "./budget-revenue-sections";
import {
  EXPECTED_GENERAL_REVENUE_TOTAL,
  EXPECTED_SPECIFIC_REVENUE_TOTAL,
  REVENUE_VALIDATION_ERROR_COLUMNS,
} from "./budget-revenue-validation";
import { BUDGET_SECTION_COLUMNS } from "./budget-sections";
import { PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS } from "./public-budget-revenue";
import {
  IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS,
  REVENUE_ALLOCATION_GROUP_AMBIGUITY_COLUMNS,
} from "./revenue-allocation-identity-resolution";
import {
  RAW_PDF_REVENUE_ALLOCATION_COLUMNS,
  REVENUE_ALLOCATION_SOURCE_MATCH_COLUMNS,
} from "./revenue-allocation-source-matches";
import { REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS } from "./revenue-allocation-validation";

export const BUDGET_DATASET_SCHEMA_VERSION = "1.3.0";
export const BUDGET_DATASET_GENERATED_COMMAND = "pnpm budget:build-all";
export const BUDGET_REVENUE_DATASET_GENERATED_COMMAND =
  "pnpm budget:revenue:build-all";

export const BUDGET_DATASET_INPUT_FILES = [
  "raw/ippansaisyutu.csv",
  "raw/ippansainyu.csv",
  "raw/r8tousyoyosanallpage.pdf",
  "config/budget-accounts.json",
  "config/department_name_map.csv",
] as const;

export const BUDGET_DATASET_OUTPUT_FILES = [
  "processed/core/budget_programs.csv",
  "processed/core/budget_sections.csv",
  "processed/core/budget_items.csv",
] as const;

export const BUDGET_REVENUE_DATASET_CSV_OUTPUT_FILES = [
  "processed/core/budget_revenue_details.csv",
  "processed/core/budget_revenue_sections.csv",
  "processed/core/budget_revenue_items.csv",
  "processed/audit/raw_pdf_revenue_allocations.csv",
  "processed/audit/staging/revenue_allocation_source_matches.csv",
  "processed/core/budget_program_groups.csv",
  "processed/core/budget_program_identities.csv",
  "processed/core/budget_program_identity_members.csv",
  "processed/core/budget_revenue_allocations.csv",
  "processed/audit/staging/revenue_allocation_group_ambiguities.csv",
  "processed/validation/revenue_validation_errors.csv",
  "processed/validation/revenue_allocation_validation_errors.csv",
  "processed/public/public_budget_revenue_details.csv",
] as const;

export const BUDGET_REVENUE_DATASET_JSON_OUTPUT_FILES = [
  "processed/public/public_budget_revenue_items.json",
  "processed/public/public_budget_revenue_allocations.json",
] as const;

export const BUDGET_REVENUE_DATASET_OUTPUT_FILES = [
  ...BUDGET_REVENUE_DATASET_CSV_OUTPUT_FILES,
  ...BUDGET_REVENUE_DATASET_JSON_OUTPUT_FILES,
] as const;

type DatasetInputFile = (typeof BUDGET_DATASET_INPUT_FILES)[number];
type DatasetOutputFile = (typeof BUDGET_DATASET_OUTPUT_FILES)[number];
type RevenueDatasetCsvOutputFile =
  (typeof BUDGET_REVENUE_DATASET_CSV_OUTPUT_FILES)[number];
type RevenueDatasetJsonOutputFile =
  (typeof BUDGET_REVENUE_DATASET_JSON_OUTPUT_FILES)[number];
type RevenueDatasetOutputFile =
  (typeof BUDGET_REVENUE_DATASET_OUTPUT_FILES)[number];
type CsvRow = Record<string, string>;

export interface RevenueMatchResult {
  relation_count: number;
  matched: number;
  manually_confirmed: number;
  ambiguous: number;
  unmatched: number;
}

export interface RevenueTargetMatchResult extends RevenueMatchResult {
  exact_group: number;
  public_identity: number;
}

export interface RevenueDatasetValidationResult {
  core_validation: "PASS";
  allocation_validation: "PASS";
  core_error_count: 0;
  allocation_error_count: 0;
}

export interface RevenueDatasetManifest {
  input_file: "raw/ippansainyu.csv";
  input_file_hash: string;
  output_files: readonly RevenueDatasetOutputFile[];
  output_file_hashes: Record<RevenueDatasetOutputFile, string>;
  output_row_counts: Record<RevenueDatasetOutputFile, number>;
  account_totals: Record<string, number>;
  overall_total_amount_thousand_yen: number;
  general_account_revenue_composition: {
    general_revenue_thousand_yen: number;
    specific_revenue_thousand_yen: number;
  };
  allocation_relation_count: number;
  source_match_result: RevenueMatchResult;
  target_match_result: RevenueTargetMatchResult;
  validation_result: RevenueDatasetValidationResult;
  generated_command: string;
}

export interface BudgetDatasetManifest {
  schema_version: string;
  fiscal_year: number;
  input_files: readonly DatasetInputFile[];
  input_file_hashes: Record<DatasetInputFile, string>;
  output_files: readonly DatasetOutputFile[];
  output_row_counts: Record<DatasetOutputFile, number>;
  output_column_counts: Record<DatasetOutputFile, number>;
  account_totals: Record<string, number>;
  overall_total_amount_thousand_yen: number;
  generated_command: string;
  revenue?: RevenueDatasetManifest;
}

export interface BuildBudgetDatasetManifestOptions {
  includeRevenue?: boolean;
}

interface ParsedCsv {
  columns: string[];
  rows: CsvRow[];
}

function parseCsv(csvText: string, sourceName: string): ParsedCsv {
  const table = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (table.length === 0) {
    throw new Error(`${sourceName}が空です。`);
  }
  const [columns, ...dataRows] = table;
  const rows = dataRows.map((values) =>
    Object.fromEntries(
      columns.map((column, index) => [column, values[index] ?? ""]),
    ),
  );
  return { columns, rows };
}

function sumByAccount(
  rows: CsvRow[],
  amountColumn: string,
  config: BudgetAccountsConfig,
): Record<string, number> {
  const totals = Object.fromEntries(
    config.accounts.map((account) => [account.account_code, 0]),
  ) as Record<string, number>;
  for (const row of rows) {
    if (!(row.account_code in totals)) {
      throw new Error(
        `manifest対象CSVに設定外のaccount_codeがあります: ` +
          row.account_code,
      );
    }
    const amount = Number(row[amountColumn]);
    if (!Number.isSafeInteger(amount)) {
      throw new Error(
        `${amountColumn}が整数ではありません: ${row[amountColumn]}`,
      );
    }
    totals[row.account_code] += amount;
  }
  return totals;
}

async function sha256(filePath: string): Promise<string> {
  const bytes = await fs.readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

function parseJsonArray(
  jsonText: string,
  sourceName: string,
): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`${sourceName}が有効なJSONではありません。`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${sourceName}のルートが配列ではありません。`);
  }
  return parsed;
}

function countByColumn(
  rows: CsvRow[],
  column: string,
  initialValues: readonly string[],
): Record<string, number> {
  const counts = Object.fromEntries(
    initialValues.map((value) => [value, 0]),
  ) as Record<string, number>;
  for (const row of rows) {
    const value = row[column];
    if (!(value in counts)) {
      throw new Error(
        `${column}に未定義の値があります: ${value}`,
      );
    }
    counts[value] += 1;
  }
  return counts;
}

function assertColumns(
  parsed: ParsedCsv,
  expectedColumns: readonly string[],
  sourceName: string,
): void {
  if (parsed.columns.join(",") !== expectedColumns.join(",")) {
    throw new Error(`${sourceName}の列定義がmanifest基準と一致しません。`);
  }
}

function sumColumn(rows: CsvRow[], column: string): number {
  return rows.reduce((total, row) => {
    const value = Number(row[column]);
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${column}が整数ではありません: ${row[column]}`);
    }
    const next = total + value;
    if (!Number.isSafeInteger(next)) {
      throw new Error(`${column}の合計が安全な整数範囲外です。`);
    }
    return next;
  }, 0);
}

async function buildRevenueDatasetManifest(
  repoRoot: string,
  config: BudgetAccountsConfig,
  inputHashes: Record<DatasetInputFile, string>,
): Promise<RevenueDatasetManifest> {
  const csvTexts = await Promise.all(
    BUDGET_REVENUE_DATASET_CSV_OUTPUT_FILES.map((relativePath) =>
      fs.readFile(path.join(repoRoot, relativePath), "utf8"),
    ),
  );
  const csvOutputs = Object.fromEntries(
    BUDGET_REVENUE_DATASET_CSV_OUTPUT_FILES.map(
      (relativePath, index) => [
        relativePath,
        parseCsv(csvTexts[index], relativePath),
      ],
    ),
  ) as Record<RevenueDatasetCsvOutputFile, ParsedCsv>;
  const expectedColumns: Record<
    RevenueDatasetCsvOutputFile,
    readonly string[]
  > = {
    "processed/core/budget_revenue_details.csv":
      BUDGET_REVENUE_DETAIL_COLUMNS,
    "processed/core/budget_revenue_sections.csv":
      BUDGET_REVENUE_SECTION_COLUMNS,
    "processed/core/budget_revenue_items.csv":
      BUDGET_REVENUE_ITEM_COLUMNS,
    "processed/audit/raw_pdf_revenue_allocations.csv":
      RAW_PDF_REVENUE_ALLOCATION_COLUMNS,
    "processed/audit/staging/revenue_allocation_source_matches.csv":
      REVENUE_ALLOCATION_SOURCE_MATCH_COLUMNS,
    "processed/core/budget_program_groups.csv":
      BUDGET_PROGRAM_GROUP_COLUMNS,
    "processed/core/budget_program_identities.csv":
      BUDGET_PROGRAM_IDENTITY_COLUMNS,
    "processed/core/budget_program_identity_members.csv":
      BUDGET_PROGRAM_IDENTITY_MEMBER_COLUMNS,
    "processed/core/budget_revenue_allocations.csv":
      IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS,
    "processed/audit/staging/revenue_allocation_group_ambiguities.csv":
      REVENUE_ALLOCATION_GROUP_AMBIGUITY_COLUMNS,
    "processed/validation/revenue_validation_errors.csv":
      REVENUE_VALIDATION_ERROR_COLUMNS,
    "processed/validation/revenue_allocation_validation_errors.csv":
      REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS,
    "processed/public/public_budget_revenue_details.csv":
      PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS,
  };
  for (const relativePath of BUDGET_REVENUE_DATASET_CSV_OUTPUT_FILES) {
    assertColumns(
      csvOutputs[relativePath],
      expectedColumns[relativePath],
      relativePath,
    );
  }

  const jsonTexts = await Promise.all(
    BUDGET_REVENUE_DATASET_JSON_OUTPUT_FILES.map((relativePath) =>
      fs.readFile(path.join(repoRoot, relativePath), "utf8"),
    ),
  );
  const jsonOutputs = Object.fromEntries(
    BUDGET_REVENUE_DATASET_JSON_OUTPUT_FILES.map(
      (relativePath, index) => [
        relativePath,
        parseJsonArray(jsonTexts[index], relativePath),
      ],
    ),
  ) as Record<RevenueDatasetJsonOutputFile, unknown[]>;

  const details =
    csvOutputs["processed/core/budget_revenue_details.csv"].rows;
  const sections =
    csvOutputs["processed/core/budget_revenue_sections.csv"].rows;
  const items =
    csvOutputs["processed/core/budget_revenue_items.csv"].rows;
  const sourceMatches =
    csvOutputs[
      "processed/audit/staging/revenue_allocation_source_matches.csv"
    ].rows;
  const allocations =
    csvOutputs["processed/core/budget_revenue_allocations.csv"].rows;
  const coreErrors =
    csvOutputs["processed/validation/revenue_validation_errors.csv"].rows;
  const allocationErrors =
    csvOutputs[
      "processed/validation/revenue_allocation_validation_errors.csv"
    ].rows;
  if (
    details.length !== EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT ||
    sections.length !== EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT ||
    items.length !== EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT
  ) {
    throw new Error("歳入コアCSVの行数がmanifest期待値と一致しません。");
  }

  const accountTotals = sumByAccount(
    details,
    "current_amount_thousand_yen",
    config,
  );
  for (const account of config.accounts) {
    const expected =
      account.revenue?.expected_amount_thousand_yen ??
      account.expected_amount_thousand_yen;
    if (accountTotals[account.account_code] !== expected) {
      throw new Error(
        `revenue.${account.account_code}の合計が不一致です: ` +
          `${accountTotals[account.account_code]} != ${expected}`,
      );
    }
  }
  const overallTotal = Object.values(accountTotals).reduce(
    (total, amount) => total + amount,
    0,
  );
  if (overallTotal !== EXPECTED_BUDGET_REVENUE_TOTAL) {
    throw new Error(
      `歳入全会計合計が不一致です: ${overallTotal}`,
    );
  }

  const generalItems = items.filter(
    (row) => row.account_code === "general",
  );
  const generalRevenue = sumColumn(
    generalItems,
    "general_revenue_thousand_yen",
  );
  const specificRevenue = sumColumn(
    generalItems,
    "specific_revenue_thousand_yen",
  );
  if (
    generalRevenue !== EXPECTED_GENERAL_REVENUE_TOTAL ||
    specificRevenue !== EXPECTED_SPECIFIC_REVENUE_TOTAL
  ) {
    throw new Error("一般会計の一般財源・特定財源が不一致です。");
  }

  const sourceStatusCounts = countByColumn(
    sourceMatches,
    "source_match_status",
    ["matched", "manually_confirmed", "ambiguous", "unmatched"],
  );
  const targetStatusCounts = countByColumn(
    allocations,
    "target_match_status",
    ["matched", "manually_confirmed", "ambiguous", "unmatched"],
  );
  const targetResolutionCounts = countByColumn(
    allocations,
    "target_resolution_level",
    ["exact_group", "public_identity"],
  );
  if (
    sourceStatusCounts.ambiguous !== 0 ||
    sourceStatusCounts.unmatched !== 0 ||
    targetStatusCounts.ambiguous !== 0 ||
    targetStatusCounts.unmatched !== 0 ||
    coreErrors.length !== 0 ||
    allocationErrors.length !== 0
  ) {
    throw new Error("歳入照合または検証に未解決エラーがあります。");
  }

  const [coreReport, allocationReport] = await Promise.all([
    fs.readFile(
      path.join(repoRoot, "docs", "validation", "revenue_validation_report.md"),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "docs", "validation", "revenue_allocation_validation_report.md",
      ),
      "utf8",
    ),
  ]);
  if (
    !/\n\*\*PASS\*\*\n/u.test(coreReport) ||
    !/\n\*\*PASS\*\*\n/u.test(allocationReport)
  ) {
    throw new Error("歳入検証レポートの最終判定がPASSではありません。");
  }

  const outputHashes = Object.fromEntries(
    await Promise.all(
      BUDGET_REVENUE_DATASET_OUTPUT_FILES.map(
        async (relativePath) => [
          relativePath,
          await sha256(path.join(repoRoot, relativePath)),
        ],
      ),
    ),
  ) as Record<RevenueDatasetOutputFile, string>;
  const outputRowCounts = {
    ...Object.fromEntries(
      BUDGET_REVENUE_DATASET_CSV_OUTPUT_FILES.map(
        (relativePath) => [
          relativePath,
          csvOutputs[relativePath].rows.length,
        ],
      ),
    ),
    ...Object.fromEntries(
      BUDGET_REVENUE_DATASET_JSON_OUTPUT_FILES.map(
        (relativePath) => [
          relativePath,
          jsonOutputs[relativePath].length,
        ],
      ),
    ),
  } as Record<RevenueDatasetOutputFile, number>;

  return {
    input_file: "raw/ippansainyu.csv",
    input_file_hash: inputHashes["raw/ippansainyu.csv"],
    output_files: BUDGET_REVENUE_DATASET_OUTPUT_FILES,
    output_file_hashes: outputHashes,
    output_row_counts: outputRowCounts,
    account_totals: accountTotals,
    overall_total_amount_thousand_yen: overallTotal,
    general_account_revenue_composition: {
      general_revenue_thousand_yen: generalRevenue,
      specific_revenue_thousand_yen: specificRevenue,
    },
    allocation_relation_count: allocations.length,
    source_match_result: {
      relation_count: sourceMatches.length,
      matched: sourceStatusCounts.matched,
      manually_confirmed: sourceStatusCounts.manually_confirmed,
      ambiguous: sourceStatusCounts.ambiguous,
      unmatched: sourceStatusCounts.unmatched,
    },
    target_match_result: {
      relation_count: allocations.length,
      matched: targetStatusCounts.matched,
      manually_confirmed: targetStatusCounts.manually_confirmed,
      ambiguous: targetStatusCounts.ambiguous,
      unmatched: targetStatusCounts.unmatched,
      exact_group: targetResolutionCounts.exact_group,
      public_identity: targetResolutionCounts.public_identity,
    },
    validation_result: {
      core_validation: "PASS",
      allocation_validation: "PASS",
      core_error_count: 0,
      allocation_error_count: 0,
    },
    generated_command: BUDGET_REVENUE_DATASET_GENERATED_COMMAND,
  };
}

export async function buildBudgetDatasetManifest(
  repoRoot: string,
  config: BudgetAccountsConfig,
  options: BuildBudgetDatasetManifestOptions = {},
): Promise<BudgetDatasetManifest> {
  const inputHashes = Object.fromEntries(
    await Promise.all(
      BUDGET_DATASET_INPUT_FILES.map(async (relativePath) => [
        relativePath,
        await sha256(path.join(repoRoot, relativePath)),
      ]),
    ),
  ) as Record<DatasetInputFile, string>;
  const outputTexts = await Promise.all(
    BUDGET_DATASET_OUTPUT_FILES.map((relativePath) =>
      fs.readFile(path.join(repoRoot, relativePath), "utf8"),
    ),
  );
  const outputs = Object.fromEntries(
    BUDGET_DATASET_OUTPUT_FILES.map((relativePath, index) => [
      relativePath,
      parseCsv(outputTexts[index], relativePath),
    ]),
  ) as Record<DatasetOutputFile, ParsedCsv>;

  const expectedColumns: Record<DatasetOutputFile, readonly string[]> = {
    "processed/core/budget_programs.csv": BUDGET_PROGRAM_COLUMNS,
    "processed/core/budget_sections.csv": BUDGET_SECTION_COLUMNS,
    "processed/core/budget_items.csv": BUDGET_ITEM_COLUMNS,
  };
  for (const outputFile of BUDGET_DATASET_OUTPUT_FILES) {
    if (
      outputs[outputFile].columns.join(",") !==
      expectedColumns[outputFile].join(",")
    ) {
      throw new Error(`${outputFile}の列定義がmanifest基準と一致しません。`);
    }
  }

  const programTotals = sumByAccount(
    outputs["processed/core/budget_programs.csv"].rows,
    "amount_thousand_yen",
    config,
  );
  const sectionTotals = sumByAccount(
    outputs["processed/core/budget_sections.csv"].rows,
    "amount_thousand_yen",
    config,
  );
  const itemProgramTotals = sumByAccount(
    outputs["processed/core/budget_items.csv"].rows,
    "program_total_amount_thousand_yen",
    config,
  );
  const itemSectionTotals = sumByAccount(
    outputs["processed/core/budget_items.csv"].rows,
    "section_total_amount_thousand_yen",
    config,
  );

  for (const account of config.accounts) {
    const expected = account.expected_amount_thousand_yen;
    for (const [sourceName, totals] of [
      ["budget_programs", programTotals],
      ["budget_sections", sectionTotals],
      ["budget_items.program_total", itemProgramTotals],
      ["budget_items.section_total", itemSectionTotals],
    ] as const) {
      if (totals[account.account_code] !== expected) {
        throw new Error(
          `${sourceName}.${account.account_code}の合計が不一致です: ` +
            `${totals[account.account_code]} != ${expected}`,
        );
      }
    }
  }

  const overallTotal = Object.values(programTotals).reduce(
    (total, amount) => total + amount,
    0,
  );
  const manifest: BudgetDatasetManifest = {
    schema_version: BUDGET_DATASET_SCHEMA_VERSION,
    fiscal_year: config.fiscal_year,
    input_files: BUDGET_DATASET_INPUT_FILES,
    input_file_hashes: inputHashes,
    output_files: BUDGET_DATASET_OUTPUT_FILES,
    output_row_counts: Object.fromEntries(
      BUDGET_DATASET_OUTPUT_FILES.map((outputFile) => [
        outputFile,
        outputs[outputFile].rows.length,
      ]),
    ) as Record<DatasetOutputFile, number>,
    output_column_counts: Object.fromEntries(
      BUDGET_DATASET_OUTPUT_FILES.map((outputFile) => [
        outputFile,
        outputs[outputFile].columns.length,
      ]),
    ) as Record<DatasetOutputFile, number>,
    account_totals: programTotals,
    overall_total_amount_thousand_yen: overallTotal,
    generated_command: BUDGET_DATASET_GENERATED_COMMAND,
  };
  if (options.includeRevenue !== false) {
    manifest.revenue = await buildRevenueDatasetManifest(
      repoRoot,
      config,
      inputHashes,
    );
  }
  return manifest;
}

export function serializeBudgetDatasetManifest(
  manifest: BudgetDatasetManifest,
): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
