import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { BUDGET_ITEM_COLUMNS } from "./budget-items";
import {
  EXPECTED_PUBLIC_BUDGET_PROGRAM_IDENTITY_ROW_COUNT,
  PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS,
} from "./public-budget-program-identities";
import { BUDGET_PROGRAM_COLUMNS } from "./budget-programs";
import { BUDGET_REVENUE_DETAIL_COLUMNS } from "./budget-revenue-details";
import { BUDGET_REVENUE_ITEM_COLUMNS } from "./budget-revenue-items";
import {
  EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN,
  EXPECTED_PUBLIC_BUDGET_ITEM_ROW_COUNT,
  EXPECTED_PUBLIC_BUDGET_PROGRAM_ROW_COUNT,
  EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
  PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
} from "./public-budget";
import {
  EXPECTED_PUBLIC_BUDGET_REVENUE_ALLOCATION_ROW_COUNT,
  EXPECTED_PUBLIC_BUDGET_REVENUE_DETAIL_ROW_COUNT,
  EXPECTED_PUBLIC_BUDGET_REVENUE_ITEM_ROW_COUNT,
  EXPECTED_PUBLIC_EXACT_GROUP_ALLOCATION_COUNT,
  EXPECTED_PUBLIC_IDENTITY_ALLOCATION_COUNT,
  PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS,
} from "./public-budget-revenue";
import { IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS } from "./revenue-allocation-identity-resolution";

export const PUBLIC_DATASET_SCHEMA_VERSION = "public-budget-v1";
export const PUBLIC_DATASET_FISCAL_YEAR = 2026;
export const PUBLIC_DATASET_KIND = "public_budget";
export const PUBLIC_DATASET_BUDGET_TYPE = "initial_budget";
export const PUBLIC_DATASET_CURRENCY_UNIT = "thousand_yen";
export const PUBLIC_DATASET_GENERATED_COMMAND =
  "pnpm budget:public:manifest";

export const PUBLIC_DATASET_FILE_DEFINITIONS = [
  {
    key: "publicBudgetProgramIdentitiesCsv",
    path: "processed/public/public_budget_program_identities.csv",
    format: "csv",
    role: "public_expenditure_program_identity_master",
  },
  {
    key: "publicBudgetProgramsCsv",
    path: "processed/public/public_budget_programs.csv",
    format: "csv",
    role: "public_expenditure_program_detail_records",
  },
  {
    key: "publicBudgetItemsJson",
    path: "processed/public/public_budget_items.json",
    format: "json",
    role: "public_expenditure_budget_item_read_model",
  },
  {
    key: "publicBudgetRevenueDetailsCsv",
    path: "processed/public/public_budget_revenue_details.csv",
    format: "csv",
    role: "public_revenue_detail_records",
  },
  {
    key: "publicBudgetRevenueItemsJson",
    path: "processed/public/public_budget_revenue_items.json",
    format: "json",
    role: "public_revenue_budget_item_read_model",
  },
  {
    key: "publicBudgetRevenueAllocationsJson",
    path: "processed/public/public_budget_revenue_allocations.json",
    format: "json",
    role: "public_revenue_expenditure_relation_read_model",
  },
] as const;

export const PUBLIC_DATASET_ACCOUNT_DEFINITIONS = [
  {
    accountCode: "general",
    accountName: "一般会計",
  },
  {
    accountCode: "national_health_insurance",
    accountName: "国民健康保険事業会計",
  },
  {
    accountCode: "latter_stage_elderly_healthcare",
    accountName: "後期高齢者医療会計",
  },
  {
    accountCode: "long_term_care_insurance",
    accountName: "介護保険事業会計",
  },
  {
    accountCode: "school_lunch_fee",
    accountName: "学校給食費会計",
  },
] as const;

export type PublicDatasetFileKey =
  (typeof PUBLIC_DATASET_FILE_DEFINITIONS)[number]["key"];
export type PublicDatasetFilePath =
  (typeof PUBLIC_DATASET_FILE_DEFINITIONS)[number]["path"];
export type PublicDatasetFileRole =
  (typeof PUBLIC_DATASET_FILE_DEFINITIONS)[number]["role"];
export type PublicDatasetAccountCode =
  (typeof PUBLIC_DATASET_ACCOUNT_DEFINITIONS)[number]["accountCode"];

export interface PublicDatasetCsvFileMetadata {
  path: PublicDatasetFilePath;
  format: "csv";
  sha256: string;
  rowCount: number;
  columnCount: number;
  role: PublicDatasetFileRole;
  requiredForProduction: true;
}

export interface PublicDatasetJsonFileMetadata {
  path: PublicDatasetFilePath;
  format: "json";
  sha256: string;
  itemCount: number;
  role: PublicDatasetFileRole;
  requiredForProduction: true;
}

export type PublicDatasetFileMetadata =
  | PublicDatasetCsvFileMetadata
  | PublicDatasetJsonFileMetadata;

export interface PublicDatasetAccountTotal {
  account_code: PublicDatasetAccountCode;
  account_name: string;
  expenditure_amount_thousand_yen: number;
  revenue_amount_thousand_yen: number;
}

export interface PublicDatasetCounts {
  publicBudgetProgramIdentityCount: number;
  publicBudgetProgramCount: number;
  publicBudgetItemCount: number;
  publicBudgetRevenueDetailCount: number;
  publicBudgetRevenueItemCount: number;
  publicBudgetRevenueAllocationCount: number;
  exactGroupAllocationCount: number;
  publicIdentityAllocationCount: number;
  allocationAmountNonNullCount: number;
  zeroAmountRevenueDetailCount: number;
  zeroAmountRevenueItemCount: number;
  zeroAmountProgramIdentityCount: number;
}

export type PublicDatasetValidationValue =
  | string
  | number
  | boolean
  | null;

export interface PublicDatasetValidationError {
  errorCode: string;
  message: string;
  expected: PublicDatasetValidationValue;
  actual: PublicDatasetValidationValue;
}

export interface PublicDatasetManifest {
  schemaVersion: typeof PUBLIC_DATASET_SCHEMA_VERSION;
  fiscalYear: typeof PUBLIC_DATASET_FISCAL_YEAR;
  datasetKind: typeof PUBLIC_DATASET_KIND;
  budgetType: typeof PUBLIC_DATASET_BUDGET_TYPE;
  currencyUnit: typeof PUBLIC_DATASET_CURRENCY_UNIT;
  generatedCommand: typeof PUBLIC_DATASET_GENERATED_COMMAND;
  publicFiles: PublicDatasetFileMetadata[];
  totals: {
    expenditureTotalAmountThousandYen: number;
    revenueTotalAmountThousandYen: number;
  };
  accountTotals: PublicDatasetAccountTotal[];
  counts: PublicDatasetCounts;
  validation: {
    status: "PASS" | "FAIL";
    errors: PublicDatasetValidationError[];
  };
}

export interface PublicDatasetValidationSources {
  datasetManifestJson: Uint8Array;
  budgetItemsCsv: Uint8Array;
  budgetProgramsCsv: Uint8Array;
  budgetRevenueItemsCsv: Uint8Array;
  budgetRevenueDetailsCsv: Uint8Array;
  budgetRevenueAllocationsCsv: Uint8Array;
}

export interface BuildPublicDatasetManifestInput {
  publicFiles: Record<PublicDatasetFileKey, Uint8Array | null>;
  validationSources: PublicDatasetValidationSources;
}

type CsvRow = Record<string, string>;
type JsonRecord = Record<string, unknown>;

interface ParsedCsv {
  columns: string[];
  rows: CsvRow[];
}

interface PublicDatasetWorkingData {
  identityRows: CsvRow[];
  programRows: CsvRow[];
  budgetItems: JsonRecord[];
  revenueDetailRows: CsvRow[];
  revenueItems: JsonRecord[];
  allocations: JsonRecord[];
}

const textDecoder = new TextDecoder("utf-8", { fatal: true });

function addError(
  errors: PublicDatasetValidationError[],
  errorCode: string,
  message: string,
  expected: PublicDatasetValidationValue,
  actual: PublicDatasetValidationValue,
): void {
  errors.push({
    errorCode,
    message,
    expected,
    actual,
  });
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function decodeUtf8(
  bytes: Uint8Array,
  sourceName: string,
  errors: PublicDatasetValidationError[],
): string {
  try {
    return textDecoder.decode(bytes);
  } catch {
    addError(
      errors,
      "PUBLIC_FILE_UTF8_DECODE_FAILED",
      `${sourceName}をUTF-8として読み込めません。`,
      "valid_utf8",
      "decode_failed",
    );
    return "";
  }
}

function parseCsvBytes(
  bytes: Uint8Array | null,
  expectedColumns: readonly string[],
  sourceName: string,
  errors: PublicDatasetValidationError[],
  publicFile: boolean,
): ParsedCsv {
  if (bytes === null) {
    if (publicFile) {
      addError(
        errors,
        "PUBLIC_FILE_MISSING",
        `${sourceName}が存在しません。`,
        true,
        false,
      );
    }
    return { columns: [], rows: [] };
  }
  const text = decodeUtf8(bytes, sourceName, errors);
  if (text.length === 0) {
    return { columns: [], rows: [] };
  }
  let table: string[][];
  try {
    table = parse(text, {
      bom: true,
      relax_column_count: false,
      skip_empty_lines: true,
    }) as string[][];
  } catch {
    addError(
      errors,
      publicFile
        ? "PUBLIC_CSV_PARSE_FAILED"
        : "VALIDATION_SOURCE_CSV_PARSE_FAILED",
      `${sourceName}をCSVとして解析できません。`,
      "valid_csv",
      "parse_failed",
    );
    return { columns: [], rows: [] };
  }
  if (table.length === 0) {
    addError(
      errors,
      publicFile ? "PUBLIC_CSV_EMPTY" : "VALIDATION_SOURCE_CSV_EMPTY",
      `${sourceName}が空です。`,
      "header_and_rows",
      "empty",
    );
    return { columns: [], rows: [] };
  }
  const [columns, ...dataRows] = table;
  if (columns.join(",") !== expectedColumns.join(",")) {
    addError(
      errors,
      publicFile
        ? "PUBLIC_CSV_COLUMNS_MISMATCH"
        : "VALIDATION_SOURCE_COLUMNS_MISMATCH",
      `${sourceName}の列定義が一致しません。`,
      expectedColumns.join(","),
      columns.join(","),
    );
  }
  return {
    columns,
    rows: dataRows.map((values) =>
      Object.fromEntries(
        columns.map((column, index) => [
          column,
          values[index] ?? "",
        ]),
      ),
    ),
  };
}

function parseJsonArrayBytes(
  bytes: Uint8Array | null,
  sourceName: string,
  errors: PublicDatasetValidationError[],
): JsonRecord[] {
  if (bytes === null) {
    addError(
      errors,
      "PUBLIC_FILE_MISSING",
      `${sourceName}が存在しません。`,
      true,
      false,
    );
    return [];
  }
  const text = decodeUtf8(bytes, sourceName, errors);
  if (text.length === 0) {
    return [];
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    addError(
      errors,
      "PUBLIC_JSON_PARSE_FAILED",
      `${sourceName}をJSONとして解析できません。`,
      "valid_json_array",
      "parse_failed",
    );
    return [];
  }
  if (!Array.isArray(value)) {
    addError(
      errors,
      "PUBLIC_JSON_ROOT_NOT_ARRAY",
      `${sourceName}のルートが配列ではありません。`,
      "array",
      typeof value,
    );
    return [];
  }
  const records: JsonRecord[] = [];
  let invalidCount = 0;
  for (const item of value) {
    if (isJsonRecord(item)) {
      records.push(item);
    } else {
      invalidCount += 1;
    }
  }
  if (invalidCount > 0) {
    addError(
      errors,
      "PUBLIC_JSON_ITEM_NOT_OBJECT",
      `${sourceName}にオブジェクトではない要素があります。`,
      0,
      invalidCount,
    );
  }
  return records;
}

function parseJsonRecordBytes(
  bytes: Uint8Array,
  sourceName: string,
  errors: PublicDatasetValidationError[],
): JsonRecord {
  const text = decodeUtf8(bytes, sourceName, errors);
  if (text.length === 0) {
    return {};
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    addError(
      errors,
      "VALIDATION_SOURCE_JSON_PARSE_FAILED",
      `${sourceName}をJSONとして解析できません。`,
      "valid_json_object",
      "parse_failed",
    );
    return {};
  }
  if (!isJsonRecord(value)) {
    addError(
      errors,
      "VALIDATION_SOURCE_JSON_ROOT_NOT_OBJECT",
      `${sourceName}のルートがオブジェクトではありません。`,
      "object",
      typeof value,
    );
    return {};
  }
  return value;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function csvInteger(
  row: CsvRow,
  field: string,
  sourceName: string,
  rowNumber: number,
  errors: PublicDatasetValidationError[],
): number {
  const value = Number(row[field]);
  if (!Number.isSafeInteger(value)) {
    addError(
      errors,
      "PUBLIC_INTEGER_INVALID",
      `${sourceName}の${rowNumber}行目に整数でない${field}があります。`,
      "safe_integer",
      row[field] ?? "",
    );
    return 0;
  }
  return value;
}

function jsonInteger(
  row: JsonRecord,
  field: string,
  sourceName: string,
  index: number,
  errors: PublicDatasetValidationError[],
): number {
  const value = row[field];
  if (!Number.isSafeInteger(value)) {
    addError(
      errors,
      "PUBLIC_INTEGER_INVALID",
      `${sourceName}の${index + 1}件目に整数でない${field}があります。`,
      "safe_integer",
      typeof value === "number" ? value : String(value),
    );
    return 0;
  }
  return value as number;
}

function jsonString(
  row: JsonRecord,
  field: string,
  sourceName: string,
  index: number,
  errors: PublicDatasetValidationError[],
): string {
  const value = row[field];
  if (typeof value !== "string" || value.length === 0) {
    addError(
      errors,
      "PUBLIC_STRING_INVALID",
      `${sourceName}の${index + 1}件目に不正な${field}があります。`,
      "non_empty_string",
      typeof value === "string" ? value : String(value),
    );
    return "";
  }
  return value;
}

function csvBoolean(
  row: CsvRow,
  field: string,
  sourceName: string,
  rowNumber: number,
  errors: PublicDatasetValidationError[],
): boolean {
  const value = row[field];
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  addError(
    errors,
    "PUBLIC_BOOLEAN_INVALID",
    `${sourceName}の${rowNumber}行目に不正な${field}があります。`,
    "true_or_false",
    value ?? "",
  );
  return false;
}

function createAccountTotals(): Record<PublicDatasetAccountCode, number> {
  return Object.fromEntries(
    PUBLIC_DATASET_ACCOUNT_DEFINITIONS.map(({ accountCode }) => [
      accountCode,
      0,
    ]),
  ) as Record<PublicDatasetAccountCode, number>;
}

function accountDefinition(
  accountCode: string,
): (typeof PUBLIC_DATASET_ACCOUNT_DEFINITIONS)[number] | undefined {
  return PUBLIC_DATASET_ACCOUNT_DEFINITIONS.find(
    (account) => account.accountCode === accountCode,
  );
}

function addAccountAmount(
  totals: Record<PublicDatasetAccountCode, number>,
  accountCode: string,
  accountName: string,
  amount: number,
  sourceName: string,
  errors: PublicDatasetValidationError[],
): void {
  const definition = accountDefinition(accountCode);
  if (!definition) {
    addError(
      errors,
      "PUBLIC_ACCOUNT_CODE_UNKNOWN",
      `${sourceName}に未定義のaccount_codeがあります。`,
      "configured_account_code",
      accountCode,
    );
    return;
  }
  if (accountName !== definition.accountName) {
    addError(
      errors,
      "PUBLIC_ACCOUNT_NAME_MISMATCH",
      `${sourceName}の会計名が一致しません。`,
      definition.accountName,
      accountName,
    );
  }
  totals[definition.accountCode] += amount;
}

function assertNumberEqual(
  errors: PublicDatasetValidationError[],
  errorCode: string,
  message: string,
  expected: number,
  actual: number,
): void {
  if (expected !== actual) {
    addError(errors, errorCode, message, expected, actual);
  }
}

function assertUnique(
  values: readonly string[],
  errorCode: string,
  label: string,
  errors: PublicDatasetValidationError[],
): void {
  const uniqueCount = new Set(values).size;
  if (uniqueCount !== values.length) {
    addError(
      errors,
      errorCode,
      `${label}が一意ではありません。`,
      values.length,
      uniqueCount,
    );
  }
}

function assertReferenceSet(
  references: readonly string[],
  targets: ReadonlySet<string>,
  errorCode: string,
  message: string,
  errors: PublicDatasetValidationError[],
): void {
  const missing = references.filter(
    (reference) => !targets.has(reference),
  );
  if (missing.length > 0) {
    addError(
      errors,
      errorCode,
      `${message} 先頭: ${missing.slice(0, 3).join(", ")}`,
      0,
      missing.length,
    );
  }
}

function buildCsvAmountMap(
  rows: CsvRow[],
  idField: string,
  amountField: string,
  sourceName: string,
  errors: PublicDatasetValidationError[],
): Map<string, number> {
  return new Map(
    rows.map((row, index) => [
      row[idField] ?? "",
      csvInteger(
        row,
        amountField,
        sourceName,
        index + 1,
        errors,
      ),
    ]),
  );
}

function assertAmountMapsEqual(
  publicAmounts: ReadonlyMap<string, number>,
  coreAmounts: ReadonlyMap<string, number>,
  errorPrefix: string,
  label: string,
  errors: PublicDatasetValidationError[],
): void {
  assertNumberEqual(
    errors,
    `${errorPrefix}_COUNT_MISMATCH`,
    `${label}の公開件数とコア件数が一致しません。`,
    coreAmounts.size,
    publicAmounts.size,
  );
  const missingIds = [...coreAmounts.keys()].filter(
    (id) => !publicAmounts.has(id),
  );
  if (missingIds.length > 0) {
    addError(
      errors,
      `${errorPrefix}_ID_MISSING`,
      `${label}にコアIDがありません。先頭: ${missingIds
        .slice(0, 3)
        .join(", ")}`,
      0,
      missingIds.length,
    );
  }
  const amountMismatches = [...coreAmounts.entries()].filter(
    ([id, amount]) =>
      publicAmounts.has(id) && publicAmounts.get(id) !== amount,
  );
  if (amountMismatches.length > 0) {
    addError(
      errors,
      `${errorPrefix}_AMOUNT_MISMATCH`,
      `${label}の金額がコアと一致しません。先頭: ${
        amountMismatches[0]?.[0] ?? ""
      }`,
      0,
      amountMismatches.length,
    );
  }
}

function nestedValue(
  record: JsonRecord,
  keys: readonly string[],
): unknown {
  let value: unknown = record;
  for (const key of keys) {
    if (!isJsonRecord(value)) {
      return undefined;
    }
    value = value[key];
  }
  return value;
}

function validateDatasetManifest(
  datasetManifest: JsonRecord,
  counts: PublicDatasetCounts,
  publicFiles: readonly PublicDatasetFileMetadata[],
  errors: PublicDatasetValidationError[],
): void {
  const fiscalYear = nestedValue(datasetManifest, ["fiscal_year"]);
  if (fiscalYear !== PUBLIC_DATASET_FISCAL_YEAR) {
    addError(
      errors,
      "CORE_MANIFEST_FISCAL_YEAR_MISMATCH",
      "dataset_manifest.jsonの年度が一致しません。",
      PUBLIC_DATASET_FISCAL_YEAR,
      typeof fiscalYear === "number" ? fiscalYear : String(fiscalYear),
    );
  }
  const expenditureTotal = nestedValue(datasetManifest, [
    "overall_total_amount_thousand_yen",
  ]);
  if (
    expenditureTotal !== EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN
  ) {
    addError(
      errors,
      "CORE_MANIFEST_EXPENDITURE_TOTAL_MISMATCH",
      "dataset_manifest.jsonの歳出合計が一致しません。",
      EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
      typeof expenditureTotal === "number"
        ? expenditureTotal
        : String(expenditureTotal),
    );
  }
  const revenueTotal = nestedValue(datasetManifest, [
    "revenue",
    "overall_total_amount_thousand_yen",
  ]);
  if (revenueTotal !== EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN) {
    addError(
      errors,
      "CORE_MANIFEST_REVENUE_TOTAL_MISMATCH",
      "dataset_manifest.jsonの歳入合計が一致しません。",
      EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
      typeof revenueTotal === "number"
        ? revenueTotal
        : String(revenueTotal),
    );
  }
  const privateIdentityCount = nestedValue(datasetManifest, [
    "revenue",
    "output_row_counts",
    "processed/core/budget_program_identities.csv",
  ]);
  if (privateIdentityCount !== counts.publicBudgetProgramIdentityCount) {
    addError(
      errors,
      "PUBLIC_IDENTITY_COUNT_CORE_MANIFEST_MISMATCH",
      "公開identity件数が非公開identity件数と一致しません。",
      typeof privateIdentityCount === "number"
        ? privateIdentityCount
        : String(privateIdentityCount),
      counts.publicBudgetProgramIdentityCount,
    );
  }
  const coreValidation = nestedValue(datasetManifest, [
    "revenue",
    "validation_result",
    "core_validation",
  ]);
  const allocationValidation = nestedValue(datasetManifest, [
    "revenue",
    "validation_result",
    "allocation_validation",
  ]);
  if (coreValidation !== "PASS" || allocationValidation !== "PASS") {
    addError(
      errors,
      "CORE_MANIFEST_VALIDATION_NOT_PASS",
      "dataset_manifest.jsonのコア検証またはallocation検証がPASSではありません。",
      "PASS/PASS",
      `${String(coreValidation)}/${String(allocationValidation)}`,
    );
  }
  for (const relativePath of [
    "processed/public/public_budget_revenue_details.csv",
    "processed/public/public_budget_revenue_items.json",
    "processed/public/public_budget_revenue_allocations.json",
  ] as const) {
    const publicFile = publicFiles.find(
      (file) => file.path === relativePath,
    );
    const trackedHash = nestedValue(datasetManifest, [
      "revenue",
      "output_file_hashes",
      relativePath,
    ]);
    if (trackedHash !== publicFile?.sha256) {
      addError(
        errors,
        "PUBLIC_FILE_CORE_MANIFEST_HASH_MISMATCH",
        `${relativePath}のhashがdataset_manifest.jsonと一致しません。`,
        typeof trackedHash === "string"
          ? trackedHash
          : String(trackedHash),
        publicFile?.sha256 ?? "",
      );
    }
  }
}

function buildWorkingData(
  input: BuildPublicDatasetManifestInput,
  errors: PublicDatasetValidationError[],
): {
  publicData: PublicDatasetWorkingData;
  publicTables: {
    identities: ParsedCsv;
    programs: ParsedCsv;
    revenueDetails: ParsedCsv;
  };
  coreTables: {
    budgetItems: ParsedCsv;
    budgetPrograms: ParsedCsv;
    revenueItems: ParsedCsv;
    revenueDetails: ParsedCsv;
    revenueAllocations: ParsedCsv;
  };
  datasetManifest: JsonRecord;
} {
  const identityTable = parseCsvBytes(
    input.publicFiles.publicBudgetProgramIdentitiesCsv,
    PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS,
    "public_budget_program_identities.csv",
    errors,
    true,
  );
  const programTable = parseCsvBytes(
    input.publicFiles.publicBudgetProgramsCsv,
    PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
    "public_budget_programs.csv",
    errors,
    true,
  );
  const budgetItems = parseJsonArrayBytes(
    input.publicFiles.publicBudgetItemsJson,
    "public_budget_items.json",
    errors,
  );
  const revenueDetailTable = parseCsvBytes(
    input.publicFiles.publicBudgetRevenueDetailsCsv,
    PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS,
    "public_budget_revenue_details.csv",
    errors,
    true,
  );
  const revenueItems = parseJsonArrayBytes(
    input.publicFiles.publicBudgetRevenueItemsJson,
    "public_budget_revenue_items.json",
    errors,
  );
  const allocations = parseJsonArrayBytes(
    input.publicFiles.publicBudgetRevenueAllocationsJson,
    "public_budget_revenue_allocations.json",
    errors,
  );

  return {
    publicData: {
      identityRows: identityTable.rows,
      programRows: programTable.rows,
      budgetItems,
      revenueDetailRows: revenueDetailTable.rows,
      revenueItems,
      allocations,
    },
    publicTables: {
      identities: identityTable,
      programs: programTable,
      revenueDetails: revenueDetailTable,
    },
    coreTables: {
      budgetItems: parseCsvBytes(
        input.validationSources.budgetItemsCsv,
        BUDGET_ITEM_COLUMNS,
        "budget_items.csv",
        errors,
        false,
      ),
      budgetPrograms: parseCsvBytes(
        input.validationSources.budgetProgramsCsv,
        BUDGET_PROGRAM_COLUMNS,
        "budget_programs.csv",
        errors,
        false,
      ),
      revenueItems: parseCsvBytes(
        input.validationSources.budgetRevenueItemsCsv,
        BUDGET_REVENUE_ITEM_COLUMNS,
        "budget_revenue_items.csv",
        errors,
        false,
      ),
      revenueDetails: parseCsvBytes(
        input.validationSources.budgetRevenueDetailsCsv,
        BUDGET_REVENUE_DETAIL_COLUMNS,
        "budget_revenue_details.csv",
        errors,
        false,
      ),
      revenueAllocations: parseCsvBytes(
        input.validationSources.budgetRevenueAllocationsCsv,
        IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS,
        "budget_revenue_allocations.csv",
        errors,
        false,
      ),
    },
    datasetManifest: parseJsonRecordBytes(
      input.validationSources.datasetManifestJson,
      "dataset_manifest.json",
      errors,
    ),
  };
}

function publicFileMetadata(
  input: BuildPublicDatasetManifestInput,
  publicTables: {
    identities: ParsedCsv;
    programs: ParsedCsv;
    revenueDetails: ParsedCsv;
  },
  publicData: PublicDatasetWorkingData,
): PublicDatasetFileMetadata[] {
  const countsByKey: Record<
    PublicDatasetFileKey,
    { rowCount?: number; columnCount?: number; itemCount?: number }
  > = {
    publicBudgetProgramIdentitiesCsv: {
      rowCount: publicTables.identities.rows.length,
      columnCount: publicTables.identities.columns.length,
    },
    publicBudgetProgramsCsv: {
      rowCount: publicTables.programs.rows.length,
      columnCount: publicTables.programs.columns.length,
    },
    publicBudgetItemsJson: {
      itemCount: publicData.budgetItems.length,
    },
    publicBudgetRevenueDetailsCsv: {
      rowCount: publicTables.revenueDetails.rows.length,
      columnCount: publicTables.revenueDetails.columns.length,
    },
    publicBudgetRevenueItemsJson: {
      itemCount: publicData.revenueItems.length,
    },
    publicBudgetRevenueAllocationsJson: {
      itemCount: publicData.allocations.length,
    },
  };

  return PUBLIC_DATASET_FILE_DEFINITIONS.map((definition) => {
    const bytes = input.publicFiles[definition.key];
    const hash = bytes === null ? "" : sha256(bytes);
    const counts = countsByKey[definition.key];
    if (definition.format === "csv") {
      return {
        path: definition.path,
        format: "csv",
        sha256: hash,
        rowCount: counts.rowCount ?? 0,
        columnCount: counts.columnCount ?? 0,
        role: definition.role,
        requiredForProduction: true,
      };
    }
    return {
      path: definition.path,
      format: "json",
      sha256: hash,
      itemCount: counts.itemCount ?? 0,
      role: definition.role,
      requiredForProduction: true,
    };
  });
}

export function buildPublicDatasetManifest(
  input: BuildPublicDatasetManifestInput,
): PublicDatasetManifest {
  const errors: PublicDatasetValidationError[] = [];
  const {
    publicData,
    publicTables,
    coreTables,
    datasetManifest,
  } = buildWorkingData(input, errors);

  const identityIds = publicData.identityRows.map(
    (row) => row.budget_program_identity_id ?? "",
  );
  const revenueDetailIds = publicData.revenueDetailRows.map(
    (row) => row.revenue_detail_id ?? "",
  );
  const allocationIds = publicData.allocations.map((row, index) =>
    jsonString(
      row,
      "allocationLinkId",
      "public_budget_revenue_allocations.json",
      index,
      errors,
    ),
  );
  assertUnique(
    identityIds,
    "PUBLIC_IDENTITY_ID_DUPLICATE",
    "公開budget_program_identity_id",
    errors,
  );
  assertUnique(
    revenueDetailIds,
    "PUBLIC_REVENUE_DETAIL_ID_DUPLICATE",
    "公開revenue_detail_id",
    errors,
  );
  assertUnique(
    allocationIds,
    "PUBLIC_ALLOCATION_ID_DUPLICATE",
    "公開allocationLinkId",
    errors,
  );

  const expenditureIdentityTotals = createAccountTotals();
  const expenditureProgramTotals = createAccountTotals();
  const expenditureItemTotals = createAccountTotals();
  const revenueDetailTotals = createAccountTotals();
  const revenueItemTotals = createAccountTotals();
  const publicIdentityAmounts = new Map<string, number>();
  const publicIdentityMemberProgramCounts = new Map<string, number>();
  const publicProgramAmounts = new Map<string, number>();
  const programAmountsByIdentity = new Map<string, number>();
  const programCountsByIdentity = new Map<string, number>();
  const publicItemAmounts = new Map<string, number>();
  const publicRevenueDetailAmounts = new Map<string, number>();
  const publicRevenueItemAmounts = new Map<string, number>();
  let zeroAmountProgramIdentityCount = 0;
  let zeroAmountRevenueDetailCount = 0;
  let zeroAmountRevenueItemCount = 0;

  for (const [index, row] of publicData.identityRows.entries()) {
    const amount = csvInteger(
      row,
      "amount_thousand_yen",
      "public_budget_program_identities.csv",
      index + 1,
      errors,
    );
    const isZero = csvBoolean(
      row,
      "is_zero_amount",
      "public_budget_program_identities.csv",
      index + 1,
      errors,
    );
    if (isZero) {
      zeroAmountProgramIdentityCount += 1;
    }
    if (isZero !== (amount === 0)) {
      addError(
        errors,
        "PUBLIC_IDENTITY_ZERO_FLAG_MISMATCH",
        `${row.budget_program_identity_id}の0円フラグが金額と一致しません。`,
        amount === 0,
        isZero,
      );
    }
    const identityId = row.budget_program_identity_id ?? "";
    publicIdentityAmounts.set(identityId, amount);
    publicIdentityMemberProgramCounts.set(
      identityId,
      csvInteger(
        row,
        "member_program_count",
        "public_budget_program_identities.csv",
        index + 1,
        errors,
      ),
    );
    addAccountAmount(
      expenditureIdentityTotals,
      row.account_code ?? "",
      row.account_name ?? "",
      amount,
      "public_budget_program_identities.csv",
      errors,
    );
  }

  for (const [index, row] of publicData.programRows.entries()) {
    const amount = csvInteger(
      row,
      "amount_thousand_yen",
      "public_budget_programs.csv",
      index + 1,
      errors,
    );
    publicProgramAmounts.set(row.program_id ?? "", amount);
    const identityId = row.budget_program_identity_id ?? "";
    programAmountsByIdentity.set(
      identityId,
      (programAmountsByIdentity.get(identityId) ?? 0) + amount,
    );
    programCountsByIdentity.set(
      identityId,
      (programCountsByIdentity.get(identityId) ?? 0) + 1,
    );
    addAccountAmount(
      expenditureProgramTotals,
      row.account_code ?? "",
      row.account_name ?? "",
      amount,
      "public_budget_programs.csv",
      errors,
    );
  }

  for (const [index, row] of publicData.budgetItems.entries()) {
    const amount = jsonInteger(
      row,
      "amountThousandYen",
      "public_budget_items.json",
      index,
      errors,
    );
    const key = jsonString(
      row,
      "budgetItemKey",
      "public_budget_items.json",
      index,
      errors,
    );
    const accountCode = jsonString(
      row,
      "accountCode",
      "public_budget_items.json",
      index,
      errors,
    );
    const accountName = jsonString(
      row,
      "accountName",
      "public_budget_items.json",
      index,
      errors,
    );
    publicItemAmounts.set(key, amount);
    addAccountAmount(
      expenditureItemTotals,
      accountCode,
      accountName,
      amount,
      "public_budget_items.json",
      errors,
    );
  }

  for (const [index, row] of publicData.revenueDetailRows.entries()) {
    const amount = csvInteger(
      row,
      "current_amount_thousand_yen",
      "public_budget_revenue_details.csv",
      index + 1,
      errors,
    );
    const isZero = csvBoolean(
      row,
      "is_zero_amount",
      "public_budget_revenue_details.csv",
      index + 1,
      errors,
    );
    if (isZero) {
      zeroAmountRevenueDetailCount += 1;
    }
    if (isZero !== (amount === 0)) {
      addError(
        errors,
        "PUBLIC_REVENUE_DETAIL_ZERO_FLAG_MISMATCH",
        `${row.revenue_detail_id}の0円フラグが金額と一致しません。`,
        amount === 0,
        isZero,
      );
    }
    publicRevenueDetailAmounts.set(
      row.revenue_detail_id ?? "",
      amount,
    );
    addAccountAmount(
      revenueDetailTotals,
      row.account_code ?? "",
      row.account_name ?? "",
      amount,
      "public_budget_revenue_details.csv",
      errors,
    );
  }

  for (const [index, row] of publicData.revenueItems.entries()) {
    const amount = jsonInteger(
      row,
      "currentAmountThousandYen",
      "public_budget_revenue_items.json",
      index,
      errors,
    );
    const key = jsonString(
      row,
      "revenueItemKey",
      "public_budget_revenue_items.json",
      index,
      errors,
    );
    const accountCode = jsonString(
      row,
      "accountCode",
      "public_budget_revenue_items.json",
      index,
      errors,
    );
    const accountName = jsonString(
      row,
      "accountName",
      "public_budget_revenue_items.json",
      index,
      errors,
    );
    if (amount === 0) {
      zeroAmountRevenueItemCount += 1;
    }
    publicRevenueItemAmounts.set(key, amount);
    addAccountAmount(
      revenueItemTotals,
      accountCode,
      accountName,
      amount,
      "public_budget_revenue_items.json",
      errors,
    );
  }

  let exactGroupAllocationCount = 0;
  let publicIdentityAllocationCount = 0;
  let allocationAmountNonNullCount = 0;
  let exactGroupMissingTargetCount = 0;
  let publicIdentityGroupPresentCount = 0;
  let invalidAttributionStatusCount = 0;
  const allocationRevenueReferences: string[] = [];
  const allocationIdentityReferences: string[] = [];
  for (const [index, row] of publicData.allocations.entries()) {
    allocationRevenueReferences.push(
      jsonString(
        row,
        "revenueDetailId",
        "public_budget_revenue_allocations.json",
        index,
        errors,
      ),
    );
    allocationIdentityReferences.push(
      jsonString(
        row,
        "targetBudgetProgramIdentityId",
        "public_budget_revenue_allocations.json",
        index,
        errors,
      ),
    );
    const resolutionLevel = row.targetResolutionLevel;
    if (resolutionLevel === "exact_group") {
      exactGroupAllocationCount += 1;
      if (
        typeof row.targetBudgetProgramGroupId !== "string" ||
        row.targetBudgetProgramGroupId.length === 0
      ) {
        exactGroupMissingTargetCount += 1;
      }
    } else if (resolutionLevel === "public_identity") {
      publicIdentityAllocationCount += 1;
      if (row.targetBudgetProgramGroupId !== null) {
        publicIdentityGroupPresentCount += 1;
      }
    } else {
      addError(
        errors,
        "PUBLIC_ALLOCATION_RESOLUTION_LEVEL_INVALID",
        `${String(row.allocationLinkId)}のtargetResolutionLevelが不正です。`,
        "exact_group_or_public_identity",
        String(resolutionLevel),
      );
    }
    if (row.allocationAmountThousandYen !== null) {
      allocationAmountNonNullCount += 1;
    }
    if (row.amountAttributionStatus !== "not_available") {
      invalidAttributionStatusCount += 1;
    }
  }

  const identityIdSet = new Set(identityIds);
  const revenueDetailIdSet = new Set(revenueDetailIds);
  assertReferenceSet(
    allocationRevenueReferences,
    revenueDetailIdSet,
    "PUBLIC_ALLOCATION_REVENUE_DETAIL_REFERENCE_MISSING",
    "allocationのrevenueDetailIdが公開歳入detailに存在しません。",
    errors,
  );
  assertAmountMapsEqual(
    programAmountsByIdentity,
    publicIdentityAmounts,
    "PUBLIC_IDENTITY_PROGRAM",
    "公開identity別program集計",
    errors,
  );
  const identityMemberCountMismatches = [
    ...publicIdentityMemberProgramCounts.entries(),
  ].filter(
    ([identityId, expectedCount]) =>
      programCountsByIdentity.get(identityId) !== expectedCount,
  );
  if (identityMemberCountMismatches.length > 0) {
    addError(
      errors,
      "PUBLIC_IDENTITY_MEMBER_PROGRAM_COUNT_MISMATCH",
      `公開identityのmember_program_countがprogram実件数と一致しません。先頭: ${
        identityMemberCountMismatches[0]?.[0] ?? ""
      }`,
      0,
      identityMemberCountMismatches.length,
    );
  }
  assertReferenceSet(
    allocationIdentityReferences,
    identityIdSet,
    "PUBLIC_ALLOCATION_IDENTITY_REFERENCE_MISSING",
    "allocationのtargetBudgetProgramIdentityIdが公開identityに存在しません。",
    errors,
  );
  assertReferenceSet(
    publicData.programRows.map(
      (row) => row.budget_program_identity_id ?? "",
    ),
    identityIdSet,
    "PUBLIC_PROGRAM_IDENTITY_REFERENCE_MISSING",
    "公開programのbudget_program_identity_idが公開identityに存在しません。",
    errors,
  );

  assertNumberEqual(
    errors,
    "EXACT_GROUP_TARGET_GROUP_MISSING",
    "exact_group関係にtargetBudgetProgramGroupIdがない行があります。",
    0,
    exactGroupMissingTargetCount,
  );
  assertNumberEqual(
    errors,
    "PUBLIC_IDENTITY_TARGET_GROUP_NOT_NULL",
    "public_identity関係にtargetBudgetProgramGroupIdがあります。",
    0,
    publicIdentityGroupPresentCount,
  );
  assertNumberEqual(
    errors,
    "ALLOCATION_AMOUNT_NOT_NULL",
    "allocationAmountThousandYenがnullではない関係があります。",
    0,
    allocationAmountNonNullCount,
  );
  assertNumberEqual(
    errors,
    "ALLOCATION_ATTRIBUTION_STATUS_INVALID",
    "amountAttributionStatusがnot_availableではない関係があります。",
    0,
    invalidAttributionStatusCount,
  );

  const expenditureIdentityTotal = Object.values(
    expenditureIdentityTotals,
  ).reduce((total, amount) => total + amount, 0);
  const expenditureProgramTotal = Object.values(
    expenditureProgramTotals,
  ).reduce((total, amount) => total + amount, 0);
  const expenditureItemTotal = Object.values(
    expenditureItemTotals,
  ).reduce((total, amount) => total + amount, 0);
  const revenueDetailTotal = Object.values(revenueDetailTotals).reduce(
    (total, amount) => total + amount,
    0,
  );
  const revenueItemTotal = Object.values(revenueItemTotals).reduce(
    (total, amount) => total + amount,
    0,
  );

  assertNumberEqual(
    errors,
    "EXPENDITURE_IDENTITY_TOTAL_MISMATCH",
    "公開identityの歳出合計が期待値と一致しません。",
    EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
    expenditureIdentityTotal,
  );
  assertNumberEqual(
    errors,
    "EXPENDITURE_ITEM_TOTAL_MISMATCH",
    "公開budget itemの歳出合計が期待値と一致しません。",
    EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
    expenditureItemTotal,
  );
  assertNumberEqual(
    errors,
    "REVENUE_DETAIL_TOTAL_MISMATCH",
    "公開歳入detailの合計が期待値と一致しません。",
    EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
    revenueDetailTotal,
  );
  assertNumberEqual(
    errors,
    "REVENUE_ITEM_TOTAL_MISMATCH",
    "公開歳入itemの合計が期待値と一致しません。",
    EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
    revenueItemTotal,
  );
  assertNumberEqual(
    errors,
    "EXPENDITURE_REVENUE_TOTAL_MISMATCH",
    "公開歳出合計と公開歳入合計が一致しません。",
    expenditureIdentityTotal,
    revenueDetailTotal,
  );
  assertNumberEqual(
    errors,
    "PUBLIC_PROGRAM_TOTAL_MISMATCH",
    "公開programの歳出合計が公開identityと一致しません。",
    expenditureIdentityTotal,
    expenditureProgramTotal,
  );

  const counts: PublicDatasetCounts = {
    publicBudgetProgramIdentityCount: publicData.identityRows.length,
    publicBudgetProgramCount: publicData.programRows.length,
    publicBudgetItemCount: publicData.budgetItems.length,
    publicBudgetRevenueDetailCount:
      publicData.revenueDetailRows.length,
    publicBudgetRevenueItemCount: publicData.revenueItems.length,
    publicBudgetRevenueAllocationCount: publicData.allocations.length,
    exactGroupAllocationCount,
    publicIdentityAllocationCount,
    allocationAmountNonNullCount,
    zeroAmountRevenueDetailCount,
    zeroAmountRevenueItemCount,
    zeroAmountProgramIdentityCount,
  };

  const expectedCounts: Array<{
    errorCode: string;
    label: string;
    expected: number;
    actual: number;
  }> = [
    {
      errorCode: "PUBLIC_IDENTITY_COUNT_MISMATCH",
      label: "公開identity件数",
      expected: EXPECTED_PUBLIC_BUDGET_PROGRAM_IDENTITY_ROW_COUNT,
      actual: counts.publicBudgetProgramIdentityCount,
    },
    {
      errorCode: "PUBLIC_PROGRAM_COUNT_MISMATCH",
      label: "公開program件数",
      expected: EXPECTED_PUBLIC_BUDGET_PROGRAM_ROW_COUNT,
      actual: counts.publicBudgetProgramCount,
    },
    {
      errorCode: "PUBLIC_BUDGET_ITEM_COUNT_MISMATCH",
      label: "公開budget item件数",
      expected: EXPECTED_PUBLIC_BUDGET_ITEM_ROW_COUNT,
      actual: counts.publicBudgetItemCount,
    },
    {
      errorCode: "PUBLIC_REVENUE_DETAIL_COUNT_MISMATCH",
      label: "公開歳入detail件数",
      expected: EXPECTED_PUBLIC_BUDGET_REVENUE_DETAIL_ROW_COUNT,
      actual: counts.publicBudgetRevenueDetailCount,
    },
    {
      errorCode: "PUBLIC_REVENUE_ITEM_COUNT_MISMATCH",
      label: "公開歳入item件数",
      expected: EXPECTED_PUBLIC_BUDGET_REVENUE_ITEM_ROW_COUNT,
      actual: counts.publicBudgetRevenueItemCount,
    },
    {
      errorCode: "PUBLIC_ALLOCATION_COUNT_MISMATCH",
      label: "公開allocation件数",
      expected: EXPECTED_PUBLIC_BUDGET_REVENUE_ALLOCATION_ROW_COUNT,
      actual: counts.publicBudgetRevenueAllocationCount,
    },
    {
      errorCode: "EXACT_GROUP_COUNT_MISMATCH",
      label: "exact_group関係件数",
      expected: EXPECTED_PUBLIC_EXACT_GROUP_ALLOCATION_COUNT,
      actual: counts.exactGroupAllocationCount,
    },
    {
      errorCode: "PUBLIC_IDENTITY_ALLOCATION_COUNT_MISMATCH",
      label: "public_identity関係件数",
      expected: EXPECTED_PUBLIC_IDENTITY_ALLOCATION_COUNT,
      actual: counts.publicIdentityAllocationCount,
    },
  ];
  for (const count of expectedCounts) {
    assertNumberEqual(
      errors,
      count.errorCode,
      `${count.label}が期待値と一致しません。`,
      count.expected,
      count.actual,
    );
  }

  for (const definition of PUBLIC_DATASET_ACCOUNT_DEFINITIONS) {
    const expected =
      EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN[
        definition.accountCode
      ];
    const accountChecks = [
      {
        label: "公開identity歳出",
        actual: expenditureIdentityTotals[definition.accountCode],
      },
      {
        label: "公開program歳出",
        actual: expenditureProgramTotals[definition.accountCode],
      },
      {
        label: "公開budget item歳出",
        actual: expenditureItemTotals[definition.accountCode],
      },
      {
        label: "公開歳入detail",
        actual: revenueDetailTotals[definition.accountCode],
      },
      {
        label: "公開歳入item",
        actual: revenueItemTotals[definition.accountCode],
      },
    ];
    for (const check of accountChecks) {
      assertNumberEqual(
        errors,
        "PUBLIC_ACCOUNT_TOTAL_MISMATCH",
        `${definition.accountCode}の${check.label}合計が期待値と一致しません。`,
        expected,
        check.actual,
      );
    }
  }

  const coreProgramAmounts = buildCsvAmountMap(
    coreTables.budgetPrograms.rows,
    "program_id",
    "amount_thousand_yen",
    "budget_programs.csv",
    errors,
  );
  const coreItemAmounts = buildCsvAmountMap(
    coreTables.budgetItems.rows,
    "budget_item_key",
    "program_total_amount_thousand_yen",
    "budget_items.csv",
    errors,
  );
  const coreRevenueDetailAmounts = buildCsvAmountMap(
    coreTables.revenueDetails.rows,
    "revenue_detail_id",
    "current_amount_thousand_yen",
    "budget_revenue_details.csv",
    errors,
  );
  const coreRevenueItemAmounts = buildCsvAmountMap(
    coreTables.revenueItems.rows,
    "revenue_item_key",
    "current_amount_thousand_yen",
    "budget_revenue_items.csv",
    errors,
  );
  assertAmountMapsEqual(
    publicProgramAmounts,
    coreProgramAmounts,
    "PUBLIC_PROGRAM_CORE",
    "公開program",
    errors,
  );
  assertAmountMapsEqual(
    publicItemAmounts,
    coreItemAmounts,
    "PUBLIC_BUDGET_ITEM_CORE",
    "公開budget item",
    errors,
  );
  assertAmountMapsEqual(
    publicRevenueDetailAmounts,
    coreRevenueDetailAmounts,
    "PUBLIC_REVENUE_DETAIL_CORE",
    "公開歳入detail",
    errors,
  );
  assertAmountMapsEqual(
    publicRevenueItemAmounts,
    coreRevenueItemAmounts,
    "PUBLIC_REVENUE_ITEM_CORE",
    "公開歳入item",
    errors,
  );

  const coreAllocationIds = new Set(
    coreTables.revenueAllocations.rows.map(
      (row) => row.allocation_link_id ?? "",
    ),
  );
  assertNumberEqual(
    errors,
    "PUBLIC_ALLOCATION_CORE_COUNT_MISMATCH",
    "公開allocation件数がコアallocation件数と一致しません。",
    coreAllocationIds.size,
    allocationIds.length,
  );
  assertReferenceSet(
    allocationIds,
    coreAllocationIds,
    "PUBLIC_ALLOCATION_CORE_ID_MISSING",
    "公開allocationLinkIdがコアallocationに存在しません。",
    errors,
  );

  const coreAllocationsById = new Map(
    coreTables.revenueAllocations.rows.map((row) => [
      row.allocation_link_id ?? "",
      row,
    ]),
  );
  const allocationCoreMismatches: string[] = [];
  for (const allocation of publicData.allocations) {
    const allocationId =
      typeof allocation.allocationLinkId === "string"
        ? allocation.allocationLinkId
        : "";
    const core = coreAllocationsById.get(allocationId);
    if (!core) {
      continue;
    }
    const expectedGroupId =
      core.target_budget_program_group_id.length > 0
        ? core.target_budget_program_group_id
        : null;
    if (
      allocation.revenueDetailId !== core.revenue_detail_id ||
      allocation.targetBudgetProgramGroupId !== expectedGroupId ||
      allocation.targetBudgetProgramIdentityId !==
        core.target_budget_program_identity_id ||
      allocation.targetBudgetItemKey !== core.target_budget_item_key ||
      allocation.targetAccountCode !== core.target_account_code ||
      allocation.targetResolutionLevel !==
        core.target_resolution_level ||
      allocation.amountAttributionStatus !==
        core.amount_attribution_status
    ) {
      allocationCoreMismatches.push(allocationId);
    }
  }
  if (allocationCoreMismatches.length > 0) {
    addError(
      errors,
      "PUBLIC_ALLOCATION_CORE_VALUE_MISMATCH",
      `公開allocationの参照値がコアと一致しません。先頭: ${
        allocationCoreMismatches[0] ?? ""
      }`,
      0,
      allocationCoreMismatches.length,
    );
  }

  const accountTotals = PUBLIC_DATASET_ACCOUNT_DEFINITIONS.map(
    (definition) => ({
      account_code: definition.accountCode,
      account_name: definition.accountName,
      expenditure_amount_thousand_yen:
        expenditureIdentityTotals[definition.accountCode],
      revenue_amount_thousand_yen:
        revenueDetailTotals[definition.accountCode],
    }),
  );
  const publicFiles = publicFileMetadata(
    input,
    publicTables,
    publicData,
  );
  validateDatasetManifest(
    datasetManifest,
    counts,
    publicFiles,
    errors,
  );

  return {
    schemaVersion: PUBLIC_DATASET_SCHEMA_VERSION,
    fiscalYear: PUBLIC_DATASET_FISCAL_YEAR,
    datasetKind: PUBLIC_DATASET_KIND,
    budgetType: PUBLIC_DATASET_BUDGET_TYPE,
    currencyUnit: PUBLIC_DATASET_CURRENCY_UNIT,
    generatedCommand: PUBLIC_DATASET_GENERATED_COMMAND,
    publicFiles,
    totals: {
      expenditureTotalAmountThousandYen: expenditureIdentityTotal,
      revenueTotalAmountThousandYen: revenueDetailTotal,
    },
    accountTotals,
    counts,
    validation: {
      status: errors.length === 0 ? "PASS" : "FAIL",
      errors,
    },
  };
}

export function serializePublicDatasetManifest(
  manifest: PublicDatasetManifest,
): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function validatePublicDatasetManifestJson(
  jsonText: string,
  expected: PublicDatasetManifest,
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(
      "public_dataset_manifest.jsonが有効なJSONではありません。",
    );
  }
  if (!isJsonRecord(parsed)) {
    throw new Error(
      "public_dataset_manifest.jsonのルートがオブジェクトではありません。",
    );
  }
  if ("generated_at" in parsed || "generatedAt" in parsed) {
    throw new Error(
      "public_dataset_manifest.jsonに実行時刻を含められません。",
    );
  }
  const publicFiles = parsed.publicFiles;
  if (
    Array.isArray(publicFiles) &&
    publicFiles.some(
      (file) =>
        isJsonRecord(file) &&
        file.path ===
          "processed/public/public_dataset_manifest.json",
    )
  ) {
    throw new Error(
      "public_dataset_manifest.jsonは自身を追跡できません。",
    );
  }
  const expectedText = serializePublicDatasetManifest(expected);
  if (jsonText !== expectedText) {
    throw new Error(
      "public_dataset_manifest.jsonの値またはキー順が生成結果と一致しません。",
    );
  }
}
