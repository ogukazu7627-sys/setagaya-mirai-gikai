import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type {
  BudgetAccountDefinition,
  BudgetAccountsConfig,
} from "./budget-accounts";
import {
  BUDGET_ITEM_VALIDATION_STATUSES,
  type BudgetItemValidationStatus,
} from "./budget-items";
import {
  buildBudgetItemKey,
  EXPECTED_ALL_ACCOUNT_EXPENDITURE_TOTAL,
  EXPECTED_GENERAL_EXPENDITURE_TOTAL,
  normalizeHierarchyCode,
  normalizeText,
  parseThousandYenAmount,
  TARGET_ACCOUNT_CODE,
  TARGET_ACCOUNT_NAME,
} from "./budget-programs";

export const VALIDATION_ERROR_COLUMNS = [
  "error_id",
  "error_type",
  "severity",
  "account_code",
  "account_name",
  "budget_item_key",
  "source_file",
  "pdf_page",
  "budget_book_page",
  "message",
  "expected_amount_thousand_yen",
  "actual_amount_thousand_yen",
  "diff_amount_thousand_yen",
  "raw_text",
] as const;

const PROGRAM_REQUIRED_COLUMNS = [
  "program_id",
  "budget_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
  "budget_side",
  "kan_code",
  "kan_name",
  "kou_code",
  "kou_name",
  "moku_code",
  "moku_name",
  "amount_thousand_yen",
] as const;

const SECTION_REQUIRED_COLUMNS = [
  "section_id",
  "budget_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
  "budget_side",
  "kan_code",
  "kan_name",
  "kou_code",
  "kou_name",
  "moku_code",
  "moku_name",
  "amount_thousand_yen",
  "budget_book_page",
  "pdf_page",
] as const;

const ITEM_REQUIRED_COLUMNS = [
  "budget_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
  "budget_side",
  "kan_code",
  "kan_name",
  "kou_code",
  "kou_name",
  "moku_code",
  "moku_name",
  "program_total_amount_thousand_yen",
  "section_total_amount_thousand_yen",
  "diff_amount_thousand_yen",
  "validation_status",
  "program_row_count",
  "section_row_count",
] as const;

const GENERAL_RAW_SECTION_REQUIRED_COLUMNS = [
  "source_file",
  "pdf_page",
  "budget_book_page",
  "fiscal_year",
  "account_name",
  "budget_side",
  "kan_code",
  "kou_code",
  "moku_code",
  "parse_status",
  "parse_note",
  "raw_text",
] as const;

const SPECIAL_RAW_SECTION_REQUIRED_COLUMNS = [
  "raw_section_id",
  "fiscal_year",
  "account_code",
  "account_name",
  "budget_side",
  "kan_code",
  "kou_code",
  "moku_code",
  "pdf_page",
  "budget_book_page",
  "parse_status",
  "review_reason",
  "raw_text",
] as const;

const ITEM_ERROR_STATUSES = new Set<BudgetItemValidationStatus>([
  "error_missing_sections",
  "error_missing_programs",
  "error_amount_mismatch",
]);

export type ValidationSourceRow = Record<string, string>;

export interface BudgetValidationInputs {
  programRows: ValidationSourceRow[];
  sectionRows: ValidationSourceRow[];
  itemRows: ValidationSourceRow[];
  generalRawSectionRows: ValidationSourceRow[];
  specialRawSectionRows: ValidationSourceRow[];
}

export interface ValidationError {
  error_id: string;
  error_type: string;
  severity: "error";
  account_code: string;
  account_name: string;
  budget_item_key: string;
  source_file: string;
  pdf_page: string;
  budget_book_page: string;
  message: string;
  expected_amount_thousand_yen: number | "";
  actual_amount_thousand_yen: number | "";
  diff_amount_thousand_yen: number | "";
  raw_text: string;
}

export interface AccountValidationSummary {
  accountCode: string;
  accountName: string;
  status: BudgetAccountDefinition["status"];
  expectedAmountThousandYen: number;
  programRowCount: number;
  programAmountThousandYen: number;
  sectionRowCount: number;
  sectionAmountThousandYen: number;
  itemRowCount: number;
  itemProgramAmountThousandYen: number;
  itemSectionAmountThousandYen: number;
  rawSectionRowCount: number;
  isPass: boolean;
}

export interface ZeroAmountBudgetItem {
  accountCode: string;
  accountName: string;
  budgetItemKey: string;
  kanName: string;
  kouName: string;
  mokuName: string;
  programTotalAmountThousandYen: number;
  sectionTotalAmountThousandYen: number;
  programRowCount: number;
  sectionRowCount: number;
}

export interface GeneralPhase6Baseline {
  programRows: number;
  sectionRows: number;
  itemRows: number;
  rawSectionRows: number;
  programTotal: number;
  sectionTotal: number;
  itemProgramTotal: number;
  itemSectionTotal: number;
  programKeyCount: number;
  sectionKeyCount: number;
  itemKeyCount: number;
  unionKeyCount: number;
  okCount: number;
  zeroAmountCount: number;
  errorStatusCount: number;
  needsReviewCount: number;
  uniqueProgramIdCount: number;
  uniqueSectionIdCount: number;
  invalidProgramKeyRowCount: number;
  invalidSectionKeyRowCount: number;
  invalidItemKeyRowCount: number;
}

export const DEFAULT_GENERAL_PHASE6_BASELINE: GeneralPhase6Baseline = {
  programRows: 1_077,
  sectionRows: 872,
  itemRows: 128,
  rawSectionRows: 872,
  programTotal: EXPECTED_GENERAL_EXPENDITURE_TOTAL,
  sectionTotal: EXPECTED_GENERAL_EXPENDITURE_TOTAL,
  itemProgramTotal: EXPECTED_GENERAL_EXPENDITURE_TOTAL,
  itemSectionTotal: EXPECTED_GENERAL_EXPENDITURE_TOTAL,
  programKeyCount: 128,
  sectionKeyCount: 122,
  itemKeyCount: 128,
  unionKeyCount: 128,
  okCount: 122,
  zeroAmountCount: 6,
  errorStatusCount: 0,
  needsReviewCount: 0,
  uniqueProgramIdCount: 1_077,
  uniqueSectionIdCount: 872,
  invalidProgramKeyRowCount: 0,
  invalidSectionKeyRowCount: 0,
  invalidItemKeyRowCount: 0,
};

export interface GeneralCompatibilityCheck {
  label: string;
  expected: number;
  actual: number;
  isPass: boolean;
}

export interface GeneralCompatibilityResult {
  checks: GeneralCompatibilityCheck[];
  isPass: boolean;
}

export interface BudgetValidationOptions {
  expectedAllAccountTotalThousandYen?: number;
  generalPhase6Baseline?: GeneralPhase6Baseline;
}

export interface BudgetValidationResult {
  rowCounts: {
    budgetPrograms: number;
    budgetSections: number;
    budgetItems: number;
    rawPdfSectionsGeneral: number;
    rawPdfSectionsSpecial: number;
    rawPdfSectionsTotal: number;
  };
  totals: {
    budgetPrograms: number;
    budgetSections: number;
    budgetItemsProgramTotal: number;
    budgetItemsSectionTotal: number;
    configuredExpected: number;
    expected: number;
  };
  accountSummaries: AccountValidationSummary[];
  budgetItemKeyCounts: {
    budgetPrograms: number;
    budgetSections: number;
    budgetItems: number;
    union: number;
  };
  validationStatusCounts: Record<string, number>;
  zeroAmountItems: ZeroAmountBudgetItem[];
  needsReviewCounts: {
    general: number;
    special: number;
    total: number;
  };
  uniqueSectionIdCount: number;
  uniqueProgramIdCount: number;
  invalidProgramKeyRowCount: number;
  invalidSectionKeyRowCount: number;
  invalidItemKeyRowCount: number;
  invalidAccountCodeRowCount: number;
  accountMetadataMismatchRowCount: number;
  generalCompatibility: GeneralCompatibilityResult;
  errors: ValidationError[];
  isPass: boolean;
}

type ValidationErrorDraft = Omit<ValidationError, "error_id">;

function parseRows(
  csvText: string,
  sourceName: string,
  requiredColumns: readonly string[],
): ValidationSourceRow[] {
  const rows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as ValidationSourceRow[];

  if (rows.length === 0) {
    throw new Error(`${sourceName}にデータ行がありません。`);
  }

  const sourceColumns = new Set(Object.keys(rows[0]));
  const missingColumns = requiredColumns.filter(
    (column) => !sourceColumns.has(column),
  );
  if (missingColumns.length > 0) {
    throw new Error(
      `${sourceName}に必要な列がありません: ${missingColumns.join(", ")}`,
    );
  }
  return rows;
}

export function parseValidationProgramRows(
  csvText: string,
): ValidationSourceRow[] {
  return parseRows(
    csvText,
    "budget_programs.csv",
    PROGRAM_REQUIRED_COLUMNS,
  );
}

export function parseValidationSectionRows(
  csvText: string,
): ValidationSourceRow[] {
  return parseRows(
    csvText,
    "budget_sections.csv",
    SECTION_REQUIRED_COLUMNS,
  );
}

export function parseValidationItemRows(
  csvText: string,
): ValidationSourceRow[] {
  return parseRows(csvText, "budget_items.csv", ITEM_REQUIRED_COLUMNS);
}

export function parseValidationGeneralRawSectionRows(
  csvText: string,
): ValidationSourceRow[] {
  return parseRows(
    csvText,
    "raw_pdf_sections.csv",
    GENERAL_RAW_SECTION_REQUIRED_COLUMNS,
  );
}

export function parseValidationSpecialRawSectionRows(
  csvText: string,
): ValidationSourceRow[] {
  return parseRows(
    csvText,
    "raw_pdf_sections_special.csv",
    SPECIAL_RAW_SECTION_REQUIRED_COLUMNS,
  );
}

function sumAmounts(
  rows: ValidationSourceRow[],
  fieldName: string,
  sourceName: string,
): number {
  return rows.reduce((total, row) => {
    const amount = parseThousandYenAmount(
      row[fieldName],
      `${sourceName}.${fieldName}`,
    );
    const nextTotal = total + amount;
    if (!Number.isSafeInteger(nextTotal)) {
      throw new Error(`${sourceName}.${fieldName}の合計が整数範囲外です。`);
    }
    return nextTotal;
  }, 0);
}

function parseCount(
  value: string,
  fieldName: string,
  sourceName: string,
): number {
  const count = parseThousandYenAmount(
    value,
    `${sourceName}.${fieldName}`,
  );
  if (count < 0) {
    throw new Error(`${sourceName}.${fieldName}が負数です: ${value}`);
  }
  return count;
}

function countValues(
  rows: ValidationSourceRow[],
  fieldName: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[fieldName]?.trim() ?? "";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function createAccountNumberMap(
  config: BudgetAccountsConfig,
): Record<string, number> {
  return Object.fromEntries(
    config.accounts.map((account) => [account.account_code, 0]),
  ) as Record<string, number>;
}

function sumAmountsByAccount(
  rows: ValidationSourceRow[],
  fieldName: string,
  sourceName: string,
  config: BudgetAccountsConfig,
): Record<string, number> {
  const totals = createAccountNumberMap(config);
  for (const row of rows) {
    const accountCode = row.account_code?.trim() ?? "";
    if (!(accountCode in totals)) {
      continue;
    }
    totals[accountCode] += parseThousandYenAmount(
      row[fieldName],
      `${sourceName}.${fieldName}`,
    );
  }
  return totals;
}

function countRowsByAccount(
  rows: ValidationSourceRow[],
  config: BudgetAccountsConfig,
): Record<string, number> {
  const counts = createAccountNumberMap(config);
  for (const row of rows) {
    const accountCode = row.account_code?.trim() ?? "";
    if (accountCode in counts) {
      counts[accountCode] += 1;
    }
  }
  return counts;
}

function tryBuildBudgetItemKey(
  row: ValidationSourceRow,
  defaultAccountCode?: string,
): string | null {
  try {
    const fiscalYear = Number(row.fiscal_year.trim());
    if (!Number.isSafeInteger(fiscalYear)) {
      return null;
    }
    return buildBudgetItemKey({
      fiscalYear,
      accountCode: row.account_code?.trim() || defaultAccountCode,
      accountName: row.account_name,
      budgetSide: row.budget_side,
      kanCode: normalizeHierarchyCode(row.kan_code, "kan_code"),
      kouCode: normalizeHierarchyCode(row.kou_code, "kou_code"),
      mokuCode: normalizeHierarchyCode(row.moku_code, "moku_code"),
    });
  } catch {
    return null;
  }
}

function isBudgetItemKeyValid(row: ValidationSourceRow): boolean {
  const actualKey = row.budget_item_key?.trim() ?? "";
  const expectedKey = tryBuildBudgetItemKey(row);
  return expectedKey !== null && actualKey === expectedKey;
}

function keyFromRawSection(
  row: ValidationSourceRow,
  defaultAccountCode?: string,
): string {
  return tryBuildBudgetItemKey(row, defaultAccountCode) ?? "";
}

function accountFromCode(
  accountCode: string,
  config: BudgetAccountsConfig,
): BudgetAccountDefinition | undefined {
  return config.accounts.find(
    (account) => account.account_code === accountCode,
  );
}

function addTotalMismatch(
  errors: ValidationErrorDraft[],
  errorType: string,
  sourceFile: string,
  label: string,
  expected: number,
  actual: number,
  account?: BudgetAccountDefinition,
): void {
  if (actual === expected) {
    return;
  }
  errors.push({
    error_type: errorType,
    severity: "error",
    account_code: account?.account_code ?? "",
    account_name: account?.account_name ?? "",
    budget_item_key: "",
    source_file: sourceFile,
    pdf_page: "",
    budget_book_page: "",
    message: `${label}が期待値と一致しません。`,
    expected_amount_thousand_yen: expected,
    actual_amount_thousand_yen: actual,
    diff_amount_thousand_yen: expected - actual,
    raw_text: "",
  });
}

function addItemStatusErrors(
  errors: ValidationErrorDraft[],
  itemRows: ValidationSourceRow[],
): void {
  const knownStatuses = new Set<string>(BUDGET_ITEM_VALIDATION_STATUSES);

  for (const row of itemRows) {
    const status = row.validation_status.trim();
    const programTotal = parseThousandYenAmount(
      row.program_total_amount_thousand_yen,
      "budget_items.csv.program_total_amount_thousand_yen",
    );
    const sectionTotal = parseThousandYenAmount(
      row.section_total_amount_thousand_yen,
      "budget_items.csv.section_total_amount_thousand_yen",
    );

    if (ITEM_ERROR_STATUSES.has(status as BudgetItemValidationStatus)) {
      errors.push({
        error_type: status,
        severity: "error",
        account_code: row.account_code,
        account_name: row.account_name,
        budget_item_key: row.budget_item_key,
        source_file: "budget_items.csv",
        pdf_page: "",
        budget_book_page: "",
        message:
          `budget_items.csvで${status}が検出されました。` +
          ` programs=${programTotal}, sections=${sectionTotal}`,
        expected_amount_thousand_yen: programTotal,
        actual_amount_thousand_yen: sectionTotal,
        diff_amount_thousand_yen: programTotal - sectionTotal,
        raw_text: "",
      });
      continue;
    }

    if (!knownStatuses.has(status)) {
      errors.push({
        error_type: "invalid_validation_status",
        severity: "error",
        account_code: row.account_code,
        account_name: row.account_name,
        budget_item_key: row.budget_item_key,
        source_file: "budget_items.csv",
        pdf_page: "",
        budget_book_page: "",
        message: `未定義のvalidation_statusです: ${status || "(empty)"}`,
        expected_amount_thousand_yen: "",
        actual_amount_thousand_yen: "",
        diff_amount_thousand_yen: "",
        raw_text: "",
      });
    }
  }
}

function addGeneralNeedsReviewErrors(
  errors: ValidationErrorDraft[],
  rows: ValidationSourceRow[],
): number {
  let count = 0;
  for (const row of rows) {
    if (row.parse_status.trim() !== "needs_review") {
      continue;
    }
    count += 1;
    errors.push({
      error_type: "pdf_section_needs_review",
      severity: "error",
      account_code: TARGET_ACCOUNT_CODE,
      account_name: TARGET_ACCOUNT_NAME,
      budget_item_key: keyFromRawSection(row, TARGET_ACCOUNT_CODE),
      source_file: row.source_file || "raw_pdf_sections.csv",
      pdf_page: row.pdf_page,
      budget_book_page: row.budget_book_page,
      message:
        "raw_pdf_sections.csvにparse_status=needs_reviewがあります。" +
        (row.parse_note ? ` ${row.parse_note}` : ""),
      expected_amount_thousand_yen: "",
      actual_amount_thousand_yen: "",
      diff_amount_thousand_yen: "",
      raw_text: row.raw_text,
    });
  }
  return count;
}

function addSpecialNeedsReviewErrors(
  errors: ValidationErrorDraft[],
  rows: ValidationSourceRow[],
): number {
  let count = 0;
  for (const row of rows) {
    if (row.parse_status.trim() !== "needs_review") {
      continue;
    }
    count += 1;
    errors.push({
      error_type: "pdf_section_needs_review",
      severity: "error",
      account_code: row.account_code,
      account_name: row.account_name,
      budget_item_key: keyFromRawSection(row),
      source_file: "raw_pdf_sections_special.csv",
      pdf_page: row.pdf_page,
      budget_book_page: row.budget_book_page,
      message:
        "raw_pdf_sections_special.csvにparse_status=needs_reviewがあります。" +
        (row.review_reason ? ` ${row.review_reason}` : ""),
      expected_amount_thousand_yen: "",
      actual_amount_thousand_yen: "",
      diff_amount_thousand_yen: "",
      raw_text: row.raw_text,
    });
  }
  return count;
}

function addDuplicateIdErrors(
  errors: ValidationErrorDraft[],
  rows: ValidationSourceRow[],
  idField: "program_id" | "section_id",
  sourceName: string,
): number {
  const counts = countValues(rows, idField);
  const duplicateIds = new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id]) => id),
  );

  for (const duplicateId of [...duplicateIds].sort()) {
    const row = rows.find((candidate) => candidate[idField] === duplicateId);
    if (!row) {
      continue;
    }
    errors.push({
      error_type: `duplicate_${idField}`,
      severity: "error",
      account_code: row.account_code,
      account_name: row.account_name,
      budget_item_key: row.budget_item_key,
      source_file: sourceName,
      pdf_page: idField === "section_id" ? row.pdf_page ?? "" : "",
      budget_book_page:
        idField === "section_id" ? row.budget_book_page ?? "" : "",
      message:
        `${sourceName}の${idField}が重複しています: ` +
        `${duplicateId} (${counts.get(duplicateId)}件)`,
      expected_amount_thousand_yen: "",
      actual_amount_thousand_yen: "",
      diff_amount_thousand_yen: "",
      raw_text: "",
    });
  }
  return counts.size;
}

function addInvalidKeyErrors(
  errors: ValidationErrorDraft[],
  rows: ValidationSourceRow[],
  sourceName: string,
): number {
  const invalidRows = rows.filter((row) => !isBudgetItemKeyValid(row));
  const reportedKeys = new Set<string>();

  for (const row of invalidRows) {
    const key = row.budget_item_key?.trim() ?? "";
    const reportKey = `${row.account_code}\u0000${key}`;
    if (reportedKeys.has(reportKey)) {
      continue;
    }
    reportedKeys.add(reportKey);
    const expectedKey = tryBuildBudgetItemKey(row);
    errors.push({
      error_type: "invalid_budget_item_key_format",
      severity: "error",
      account_code: row.account_code,
      account_name: row.account_name,
      budget_item_key: key,
      source_file: sourceName,
      pdf_page: sourceName === "budget_sections.csv" ? row.pdf_page ?? "" : "",
      budget_book_page:
        sourceName === "budget_sections.csv"
          ? row.budget_book_page ?? ""
          : "",
      message:
        `${sourceName}のbudget_item_key形式が一致しません。` +
        ` expected=${expectedKey ?? "(unavailable)"}, actual=${key}`,
      expected_amount_thousand_yen: "",
      actual_amount_thousand_yen: "",
      diff_amount_thousand_yen: "",
      raw_text: "",
    });
  }
  return invalidRows.length;
}

function addAccountDefinitionErrors(
  errors: ValidationErrorDraft[],
  rows: ValidationSourceRow[],
  sourceName: string,
  config: BudgetAccountsConfig,
): { invalidCodeRows: number; metadataMismatchRows: number } {
  let invalidCodeRows = 0;
  let metadataMismatchRows = 0;
  const reported = new Set<string>();

  for (const row of rows) {
    const accountCode = row.account_code?.trim() ?? "";
    const account = accountFromCode(accountCode, config);
    if (!account) {
      invalidCodeRows += 1;
      const reportKey = `${sourceName}\u0000${accountCode}`;
      if (!reported.has(reportKey)) {
        reported.add(reportKey);
        errors.push({
          error_type: "invalid_account_code",
          severity: "error",
          account_code: accountCode,
          account_name: row.account_name ?? "",
          budget_item_key: row.budget_item_key ?? "",
          source_file: sourceName,
          pdf_page: row.pdf_page ?? "",
          budget_book_page: row.budget_book_page ?? "",
          message:
            `${sourceName}にconfig未定義のaccount_codeがあります: ` +
            `${accountCode || "(empty)"}`,
          expected_amount_thousand_yen: "",
          actual_amount_thousand_yen: "",
          diff_amount_thousand_yen: "",
          raw_text: row.raw_text ?? "",
        });
      }
      continue;
    }

    let metadataMatches = true;
    try {
      metadataMatches =
        normalizeText(row.account_name, `${sourceName}.account_name`) ===
          account.account_name &&
        normalizeText(row.budget_side, `${sourceName}.budget_side`) ===
          account.budget_side &&
        Number(row.fiscal_year) === config.fiscal_year;
    } catch {
      metadataMatches = false;
    }
    if (!metadataMatches) {
      metadataMismatchRows += 1;
      const reportKey =
        `${sourceName}\u0000${accountCode}\u0000` +
        `${row.budget_item_key ?? row.raw_section_id ?? ""}`;
      if (!reported.has(reportKey)) {
        reported.add(reportKey);
        errors.push({
          error_type: "account_metadata_mismatch",
          severity: "error",
          account_code: accountCode,
          account_name: row.account_name ?? "",
          budget_item_key: row.budget_item_key ?? keyFromRawSection(row),
          source_file: sourceName,
          pdf_page: row.pdf_page ?? "",
          budget_book_page: row.budget_book_page ?? "",
          message:
            `${sourceName}の年度・会計名・budget_sideがconfigと` +
            "一致しません。",
          expected_amount_thousand_yen: "",
          actual_amount_thousand_yen: "",
          diff_amount_thousand_yen: "",
          raw_text: row.raw_text ?? "",
        });
      }
    }
  }

  return { invalidCodeRows, metadataMismatchRows };
}

function buildAccountSummaries(
  inputs: BudgetValidationInputs,
  config: BudgetAccountsConfig,
): AccountValidationSummary[] {
  const programRows = countRowsByAccount(inputs.programRows, config);
  const sectionRows = countRowsByAccount(inputs.sectionRows, config);
  const itemRows = countRowsByAccount(inputs.itemRows, config);
  const programAmounts = sumAmountsByAccount(
    inputs.programRows,
    "amount_thousand_yen",
    "budget_programs.csv",
    config,
  );
  const sectionAmounts = sumAmountsByAccount(
    inputs.sectionRows,
    "amount_thousand_yen",
    "budget_sections.csv",
    config,
  );
  const itemProgramAmounts = sumAmountsByAccount(
    inputs.itemRows,
    "program_total_amount_thousand_yen",
    "budget_items.csv",
    config,
  );
  const itemSectionAmounts = sumAmountsByAccount(
    inputs.itemRows,
    "section_total_amount_thousand_yen",
    "budget_items.csv",
    config,
  );
  const rawRows = createAccountNumberMap(config);
  rawRows[TARGET_ACCOUNT_CODE] =
    inputs.generalRawSectionRows.length;
  for (const row of inputs.specialRawSectionRows) {
    const accountCode = row.account_code?.trim() ?? "";
    if (accountCode in rawRows) {
      rawRows[accountCode] += 1;
    }
  }

  return config.accounts.map((account) => {
    const expected = account.expected_amount_thousand_yen;
    const sectionPolicyPass =
      account.status === "abolished_zero"
        ? sectionRows[account.account_code] === 0 &&
          sectionAmounts[account.account_code] === 0
        : sectionAmounts[account.account_code] === expected;
    return {
      accountCode: account.account_code,
      accountName: account.account_name,
      status: account.status,
      expectedAmountThousandYen: expected,
      programRowCount: programRows[account.account_code],
      programAmountThousandYen: programAmounts[account.account_code],
      sectionRowCount: sectionRows[account.account_code],
      sectionAmountThousandYen: sectionAmounts[account.account_code],
      itemRowCount: itemRows[account.account_code],
      itemProgramAmountThousandYen:
        itemProgramAmounts[account.account_code],
      itemSectionAmountThousandYen:
        itemSectionAmounts[account.account_code],
      rawSectionRowCount: rawRows[account.account_code],
      isPass:
        programAmounts[account.account_code] === expected &&
        sectionPolicyPass &&
        itemProgramAmounts[account.account_code] === expected &&
        itemSectionAmounts[account.account_code] === expected,
    };
  });
}

function addAccountAmountErrors(
  errors: ValidationErrorDraft[],
  summaries: AccountValidationSummary[],
  config: BudgetAccountsConfig,
): void {
  for (const summary of summaries) {
    const account = accountFromCode(summary.accountCode, config);
    if (!account) {
      continue;
    }
    addTotalMismatch(
      errors,
      "budget_programs_account_total_mismatch",
      "budget_programs.csv",
      `${summary.accountCode}のbudget_programs合計`,
      summary.expectedAmountThousandYen,
      summary.programAmountThousandYen,
      account,
    );
    addTotalMismatch(
      errors,
      "budget_sections_account_total_mismatch",
      "budget_sections.csv",
      `${summary.accountCode}のbudget_sections合計`,
      summary.expectedAmountThousandYen,
      summary.sectionAmountThousandYen,
      account,
    );
    addTotalMismatch(
      errors,
      "budget_items_account_program_total_mismatch",
      "budget_items.csv",
      `${summary.accountCode}のbudget_items program_total合計`,
      summary.expectedAmountThousandYen,
      summary.itemProgramAmountThousandYen,
      account,
    );
    addTotalMismatch(
      errors,
      "budget_items_account_section_total_mismatch",
      "budget_items.csv",
      `${summary.accountCode}のbudget_items section_total合計`,
      summary.expectedAmountThousandYen,
      summary.itemSectionAmountThousandYen,
      account,
    );
    if (
      summary.status === "abolished_zero" &&
      summary.sectionRowCount > 0
    ) {
      errors.push({
        error_type: "abolished_zero_sections_present",
        severity: "error",
        account_code: summary.accountCode,
        account_name: summary.accountName,
        budget_item_key: "",
        source_file: "budget_sections.csv",
        pdf_page: "",
        budget_book_page: "",
        message:
          "abolished_zero会計にPDF由来ではないsection行があります。",
        expected_amount_thousand_yen: 0,
        actual_amount_thousand_yen: summary.sectionAmountThousandYen,
        diff_amount_thousand_yen:
          0 - summary.sectionAmountThousandYen,
        raw_text: "",
      });
    }
  }
}

function countInvalidKeys(rows: ValidationSourceRow[]): number {
  return rows.filter((row) => !isBudgetItemKeyValid(row)).length;
}

function buildGeneralCompatibility(
  inputs: BudgetValidationInputs,
  baseline: GeneralPhase6Baseline,
): GeneralCompatibilityResult {
  const programRows = inputs.programRows.filter(
    (row) => row.account_code === TARGET_ACCOUNT_CODE,
  );
  const sectionRows = inputs.sectionRows.filter(
    (row) => row.account_code === TARGET_ACCOUNT_CODE,
  );
  const itemRows = inputs.itemRows.filter(
    (row) => row.account_code === TARGET_ACCOUNT_CODE,
  );
  const programKeys = new Set(
    programRows.map((row) => row.budget_item_key),
  );
  const sectionKeys = new Set(
    sectionRows.map((row) => row.budget_item_key),
  );
  const itemKeys = new Set(itemRows.map((row) => row.budget_item_key));
  const errorStatusCount = itemRows.filter((row) =>
    ITEM_ERROR_STATUSES.has(
      row.validation_status as BudgetItemValidationStatus,
    ),
  ).length;

  const actual: GeneralPhase6Baseline = {
    programRows: programRows.length,
    sectionRows: sectionRows.length,
    itemRows: itemRows.length,
    rawSectionRows: inputs.generalRawSectionRows.length,
    programTotal: sumAmounts(
      programRows,
      "amount_thousand_yen",
      "budget_programs.csv",
    ),
    sectionTotal: sumAmounts(
      sectionRows,
      "amount_thousand_yen",
      "budget_sections.csv",
    ),
    itemProgramTotal: sumAmounts(
      itemRows,
      "program_total_amount_thousand_yen",
      "budget_items.csv",
    ),
    itemSectionTotal: sumAmounts(
      itemRows,
      "section_total_amount_thousand_yen",
      "budget_items.csv",
    ),
    programKeyCount: programKeys.size,
    sectionKeyCount: sectionKeys.size,
    itemKeyCount: itemKeys.size,
    unionKeyCount: new Set([...programKeys, ...sectionKeys]).size,
    okCount: itemRows.filter((row) => row.validation_status === "ok").length,
    zeroAmountCount: itemRows.filter(
      (row) => row.validation_status === "ok_zero_amount",
    ).length,
    errorStatusCount,
    needsReviewCount: inputs.generalRawSectionRows.filter(
      (row) => row.parse_status === "needs_review",
    ).length,
    uniqueProgramIdCount: new Set(
      programRows.map((row) => row.program_id),
    ).size,
    uniqueSectionIdCount: new Set(
      sectionRows.map((row) => row.section_id),
    ).size,
    invalidProgramKeyRowCount: countInvalidKeys(programRows),
    invalidSectionKeyRowCount: countInvalidKeys(sectionRows),
    invalidItemKeyRowCount: countInvalidKeys(itemRows),
  };

  const labels: Record<keyof GeneralPhase6Baseline, string> = {
    programRows: "budget_programs 行数",
    sectionRows: "budget_sections 行数",
    itemRows: "budget_items 行数",
    rawSectionRows: "raw_pdf_sections 行数",
    programTotal: "budget_programs 合計",
    sectionTotal: "budget_sections 合計",
    itemProgramTotal: "budget_items program_total",
    itemSectionTotal: "budget_items section_total",
    programKeyCount: "programs budget_item_key数",
    sectionKeyCount: "sections budget_item_key数",
    itemKeyCount: "items budget_item_key数",
    unionKeyCount: "programs/sections unionキー数",
    okCount: "validation_status=ok件数",
    zeroAmountCount: "ok_zero_amount件数",
    errorStatusCount: "error系status件数",
    needsReviewCount: "needs_review件数",
    uniqueProgramIdCount: "program_id一意数",
    uniqueSectionIdCount: "section_id一意数",
    invalidProgramKeyRowCount: "programs不正キー行数",
    invalidSectionKeyRowCount: "sections不正キー行数",
    invalidItemKeyRowCount: "items不正キー行数",
  };
  const checks = (
    Object.keys(baseline) as Array<keyof GeneralPhase6Baseline>
  ).map((key) => ({
    label: labels[key],
    expected: baseline[key],
    actual: actual[key],
    isPass: baseline[key] === actual[key],
  }));
  return {
    checks,
    isPass: checks.every((check) => check.isPass),
  };
}

function addGeneralCompatibilityErrors(
  errors: ValidationErrorDraft[],
  compatibility: GeneralCompatibilityResult,
): void {
  for (const check of compatibility.checks) {
    if (check.isPass) {
      continue;
    }
    errors.push({
      error_type: "general_phase6_compatibility_mismatch",
      severity: "error",
      account_code: TARGET_ACCOUNT_CODE,
      account_name: TARGET_ACCOUNT_NAME,
      budget_item_key: "",
      source_file: "Phase 6 baseline",
      pdf_page: "",
      budget_book_page: "",
      message: `一般会計のPhase 6互換性に失敗しました: ${check.label}`,
      expected_amount_thousand_yen: check.expected,
      actual_amount_thousand_yen: check.actual,
      diff_amount_thousand_yen: check.expected - check.actual,
      raw_text: "",
    });
  }
}

function assignErrorIds(
  errors: ValidationErrorDraft[],
): ValidationError[] {
  return errors.map((error, index) => ({
    error_id: `validation_error_${String(index + 1).padStart(4, "0")}`,
    ...error,
  }));
}

export function validateBudgetData(
  inputs: BudgetValidationInputs,
  config: BudgetAccountsConfig,
  options: BudgetValidationOptions = {},
): BudgetValidationResult {
  const errors: ValidationErrorDraft[] = [];
  const expectedTotal =
    options.expectedAllAccountTotalThousandYen ??
    EXPECTED_ALL_ACCOUNT_EXPENDITURE_TOTAL;
  const configuredExpectedTotal = config.accounts.reduce(
    (total, account) => total + account.expected_amount_thousand_yen,
    0,
  );
  const programTotal = sumAmounts(
    inputs.programRows,
    "amount_thousand_yen",
    "budget_programs.csv",
  );
  const sectionTotal = sumAmounts(
    inputs.sectionRows,
    "amount_thousand_yen",
    "budget_sections.csv",
  );
  const itemProgramTotal = sumAmounts(
    inputs.itemRows,
    "program_total_amount_thousand_yen",
    "budget_items.csv",
  );
  const itemSectionTotal = sumAmounts(
    inputs.itemRows,
    "section_total_amount_thousand_yen",
    "budget_items.csv",
  );

  addTotalMismatch(
    errors,
    "config_expected_total_mismatch",
    "config/budget-accounts.json",
    "configのexpected_amount_thousand_yen合計",
    expectedTotal,
    configuredExpectedTotal,
  );
  addTotalMismatch(
    errors,
    "budget_programs_total_mismatch",
    "budget_programs.csv",
    "budget_programs.csvのamount_thousand_yen合計",
    expectedTotal,
    programTotal,
  );
  addTotalMismatch(
    errors,
    "budget_sections_total_mismatch",
    "budget_sections.csv",
    "budget_sections.csvのamount_thousand_yen合計",
    expectedTotal,
    sectionTotal,
  );
  addTotalMismatch(
    errors,
    "budget_items_program_total_mismatch",
    "budget_items.csv",
    "budget_items.csvのprogram_total合計",
    expectedTotal,
    itemProgramTotal,
  );
  addTotalMismatch(
    errors,
    "budget_items_section_total_mismatch",
    "budget_items.csv",
    "budget_items.csvのsection_total合計",
    expectedTotal,
    itemSectionTotal,
  );

  const accountSummaries = buildAccountSummaries(inputs, config);
  addAccountAmountErrors(errors, accountSummaries, config);

  const validationStatusCounts: Record<string, number> = Object.fromEntries(
    BUDGET_ITEM_VALIDATION_STATUSES.map((status) => [status, 0]),
  );
  for (const row of inputs.itemRows) {
    const status = row.validation_status.trim();
    validationStatusCounts[status] =
      (validationStatusCounts[status] ?? 0) + 1;
  }
  addItemStatusErrors(errors, inputs.itemRows);

  const generalNeedsReviewCount = addGeneralNeedsReviewErrors(
    errors,
    inputs.generalRawSectionRows,
  );
  const specialNeedsReviewCount = addSpecialNeedsReviewErrors(
    errors,
    inputs.specialRawSectionRows,
  );
  const uniqueSectionIdCount = addDuplicateIdErrors(
    errors,
    inputs.sectionRows,
    "section_id",
    "budget_sections.csv",
  );
  const uniqueProgramIdCount = addDuplicateIdErrors(
    errors,
    inputs.programRows,
    "program_id",
    "budget_programs.csv",
  );
  const invalidProgramKeyRowCount = addInvalidKeyErrors(
    errors,
    inputs.programRows,
    "budget_programs.csv",
  );
  const invalidSectionKeyRowCount = addInvalidKeyErrors(
    errors,
    inputs.sectionRows,
    "budget_sections.csv",
  );
  const invalidItemKeyRowCount = addInvalidKeyErrors(
    errors,
    inputs.itemRows,
    "budget_items.csv",
  );

  const accountChecks = [
    addAccountDefinitionErrors(
      errors,
      inputs.programRows,
      "budget_programs.csv",
      config,
    ),
    addAccountDefinitionErrors(
      errors,
      inputs.sectionRows,
      "budget_sections.csv",
      config,
    ),
    addAccountDefinitionErrors(
      errors,
      inputs.itemRows,
      "budget_items.csv",
      config,
    ),
    addAccountDefinitionErrors(
      errors,
      inputs.specialRawSectionRows,
      "raw_pdf_sections_special.csv",
      config,
    ),
  ];
  const invalidAccountCodeRowCount = accountChecks.reduce(
    (total, check) => total + check.invalidCodeRows,
    0,
  );
  const accountMetadataMismatchRowCount = accountChecks.reduce(
    (total, check) => total + check.metadataMismatchRows,
    0,
  );

  const generalCompatibility = buildGeneralCompatibility(
    inputs,
    options.generalPhase6Baseline ?? DEFAULT_GENERAL_PHASE6_BASELINE,
  );
  addGeneralCompatibilityErrors(errors, generalCompatibility);

  const zeroAmountItems = inputs.itemRows
    .filter((row) => row.validation_status.trim() === "ok_zero_amount")
    .map((row) => ({
      accountCode: row.account_code,
      accountName: row.account_name,
      budgetItemKey: row.budget_item_key,
      kanName: row.kan_name,
      kouName: row.kou_name,
      mokuName: row.moku_name,
      programTotalAmountThousandYen: parseThousandYenAmount(
        row.program_total_amount_thousand_yen,
        "budget_items.csv.program_total_amount_thousand_yen",
      ),
      sectionTotalAmountThousandYen: parseThousandYenAmount(
        row.section_total_amount_thousand_yen,
        "budget_items.csv.section_total_amount_thousand_yen",
      ),
      programRowCount: parseCount(
        row.program_row_count,
        "program_row_count",
        "budget_items.csv",
      ),
      sectionRowCount: parseCount(
        row.section_row_count,
        "section_row_count",
        "budget_items.csv",
      ),
    }))
    .sort((left, right) =>
      left.budgetItemKey.localeCompare(right.budgetItemKey),
    );

  const programKeys = new Set(
    inputs.programRows.map((row) => row.budget_item_key),
  );
  const sectionKeys = new Set(
    inputs.sectionRows.map((row) => row.budget_item_key),
  );
  const itemKeys = new Set(
    inputs.itemRows.map((row) => row.budget_item_key),
  );
  const errorsWithIds = assignErrorIds(errors);

  return {
    rowCounts: {
      budgetPrograms: inputs.programRows.length,
      budgetSections: inputs.sectionRows.length,
      budgetItems: inputs.itemRows.length,
      rawPdfSectionsGeneral: inputs.generalRawSectionRows.length,
      rawPdfSectionsSpecial: inputs.specialRawSectionRows.length,
      rawPdfSectionsTotal:
        inputs.generalRawSectionRows.length +
        inputs.specialRawSectionRows.length,
    },
    totals: {
      budgetPrograms: programTotal,
      budgetSections: sectionTotal,
      budgetItemsProgramTotal: itemProgramTotal,
      budgetItemsSectionTotal: itemSectionTotal,
      configuredExpected: configuredExpectedTotal,
      expected: expectedTotal,
    },
    accountSummaries,
    budgetItemKeyCounts: {
      budgetPrograms: programKeys.size,
      budgetSections: sectionKeys.size,
      budgetItems: itemKeys.size,
      union: new Set([...programKeys, ...sectionKeys]).size,
    },
    validationStatusCounts,
    zeroAmountItems,
    needsReviewCounts: {
      general: generalNeedsReviewCount,
      special: specialNeedsReviewCount,
      total: generalNeedsReviewCount + specialNeedsReviewCount,
    },
    uniqueSectionIdCount,
    uniqueProgramIdCount,
    invalidProgramKeyRowCount,
    invalidSectionKeyRowCount,
    invalidItemKeyRowCount,
    invalidAccountCodeRowCount,
    accountMetadataMismatchRowCount,
    generalCompatibility,
    errors: errorsWithIds,
    isPass: errorsWithIds.length === 0,
  };
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function resultLabel(matches: boolean): string {
  return matches ? "PASS" : "FAIL";
}

export function serializeValidationErrors(
  errors: ValidationError[],
): string {
  return stringify(errors, {
    columns: [...VALIDATION_ERROR_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

export function renderValidationReport(
  result: BudgetValidationResult,
  reportDate: string,
): string {
  const lines: string[] = [
    "# 世田谷区令和8年度当初予算 全会計データ検証レポート",
    "",
    `- 検証日: ${reportDate}`,
    "- 金額単位: 千円",
    `- 期待総額: \`${formatNumber(result.totals.expected)}\``,
    "",
    "## 最終判定",
    "",
    `**${result.isPass ? "PASS" : "FAIL"}**`,
    "",
    `検出エラーは ${formatNumber(result.errors.length)} 件。`,
    "",
    "## 入力ファイル一覧",
    "",
    "| ファイル | 用途 |",
    "| --- | --- |",
    "| `processed/core/budget_programs.csv` | 公式CSV由来の全会計事業別予算 |",
    "| `processed/core/budget_sections.csv` | PDF由来の全会計節別予算 |",
    "| `processed/core/budget_items.csv` | 全会計の款・項・目単位突合結果 |",
    "| `processed/audit/raw_pdf_sections.csv` | 一般会計PDF節抽出の中間データ |",
    "| `processed/audit/raw_pdf_sections_special.csv` | 特別会計PDF節抽出の中間データ |",
    "| `config/budget-accounts.json` | 会計定義・期待額・状態 |",
    "",
    "## 会計別の金額検証",
    "",
    "| account_code | 会計名 | status | 期待額 | programs | sections | " +
      "items program | items section | 判定 |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const account of result.accountSummaries) {
    lines.push(
      `| \`${account.accountCode}\` | ${account.accountName} | ` +
        `${account.status} | ${formatNumber(account.expectedAmountThousandYen)} | ` +
        `${formatNumber(account.programAmountThousandYen)} | ` +
        `${formatNumber(account.sectionAmountThousandYen)} | ` +
        `${formatNumber(account.itemProgramAmountThousandYen)} | ` +
        `${formatNumber(account.itemSectionAmountThousandYen)} | ` +
        `${resultLabel(account.isPass)} |`,
    );
  }

  lines.push(
    "",
    "## 全会計合計",
    "",
    "差額は `期待値 - 実績値`。",
    "",
    "| 検証対象 | 期待値 | 実績値 | 差額 | 結果 |",
    "| --- | ---: | ---: | ---: | --- |",
  );
  const totalChecks: Array<[string, number]> = [
    ["config expected合計", result.totals.configuredExpected],
    ["budget_programs amount合計", result.totals.budgetPrograms],
    ["budget_sections amount合計", result.totals.budgetSections],
    [
      "budget_items program_total合計",
      result.totals.budgetItemsProgramTotal,
    ],
    [
      "budget_items section_total合計",
      result.totals.budgetItemsSectionTotal,
    ],
  ];
  for (const [label, actual] of totalChecks) {
    lines.push(
      `| ${label} | ${formatNumber(result.totals.expected)} | ` +
        `${formatNumber(actual)} | ` +
        `${formatNumber(result.totals.expected - actual)} | ` +
        `${resultLabel(actual === result.totals.expected)} |`,
    );
  }

  lines.push(
    "",
    "## 各CSVの行数",
    "",
    "| ファイル | データ行数 |",
    "| --- | ---: |",
    `| \`budget_programs.csv\` | ${formatNumber(result.rowCounts.budgetPrograms)} |`,
    `| \`budget_sections.csv\` | ${formatNumber(result.rowCounts.budgetSections)} |`,
    `| \`budget_items.csv\` | ${formatNumber(result.rowCounts.budgetItems)} |`,
    `| \`raw_pdf_sections.csv\` | ${formatNumber(result.rowCounts.rawPdfSectionsGeneral)} |`,
    `| \`raw_pdf_sections_special.csv\` | ${formatNumber(result.rowCounts.rawPdfSectionsSpecial)} |`,
    `| raw PDF中間データ合計 | ${formatNumber(result.rowCounts.rawPdfSectionsTotal)} |`,
    `| \`validation_errors.csv\` | ${formatNumber(result.errors.length)} |`,
    "",
    "## account_code 別の行数",
    "",
    "| account_code | programs | sections | items | raw PDF sections |",
    "| --- | ---: | ---: | ---: | ---: |",
  );
  for (const account of result.accountSummaries) {
    lines.push(
      `| \`${account.accountCode}\` | ` +
        `${formatNumber(account.programRowCount)} | ` +
        `${formatNumber(account.sectionRowCount)} | ` +
        `${formatNumber(account.itemRowCount)} | ` +
        `${formatNumber(account.rawSectionRowCount)} |`,
    );
  }

  lines.push(
    "",
    "## budget_item_key 数",
    "",
    "| 対象 | キー数 |",
    "| --- | ---: |",
    `| budget_programs | ${formatNumber(result.budgetItemKeyCounts.budgetPrograms)} |`,
    `| budget_sections | ${formatNumber(result.budgetItemKeyCounts.budgetSections)} |`,
    `| budget_items | ${formatNumber(result.budgetItemKeyCounts.budgetItems)} |`,
    "| programsとsectionsのunion | " +
      `${formatNumber(result.budgetItemKeyCounts.union)} |`,
    "",
    "## validation_status 別件数",
    "",
    "| validation_status | 件数 |",
    "| --- | ---: |",
  );
  for (const status of BUDGET_ITEM_VALIDATION_STATUSES) {
    lines.push(
      `| \`${status}\` | ` +
        `${formatNumber(result.validationStatusCounts[status] ?? 0)} |`,
    );
  }
  const extraStatuses = Object.keys(result.validationStatusCounts)
    .filter(
      (status) =>
        !BUDGET_ITEM_VALIDATION_STATUSES.includes(
          status as BudgetItemValidationStatus,
        ),
    )
    .sort();
  for (const status of extraStatuses) {
    lines.push(
      `| \`${status || "(empty)"}\` | ` +
        `${formatNumber(result.validationStatusCounts[status])} |`,
    );
  }

  lines.push(
    "",
    "## ok_zero_amount の一覧",
    "",
    `件数: ${formatNumber(result.zeroAmountItems.length)} 件`,
    "",
    "| account_code | budget_item_key | 款 | 項 | 目 | program_total | " +
      "section_total | program行数 | section行数 |",
    "| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
  );
  if (result.zeroAmountItems.length === 0) {
    lines.push("| なし | - | - | - | - | 0 | 0 | 0 | 0 |");
  } else {
    for (const item of result.zeroAmountItems) {
      lines.push(
        `| \`${item.accountCode}\` | \`${item.budgetItemKey}\` | ` +
          `${item.kanName} | ${item.kouName} | ${item.mokuName} | ` +
          `${formatNumber(item.programTotalAmountThousandYen)} | ` +
          `${formatNumber(item.sectionTotalAmountThousandYen)} | ` +
          `${formatNumber(item.programRowCount)} | ` +
          `${formatNumber(item.sectionRowCount)} |`,
      );
    }
  }

  lines.push(
    "",
    "## needs_review 件数",
    "",
    "| 入力 | 件数 | 判定 |",
    "| --- | ---: | --- |",
    "| raw_pdf_sections.csv | " +
      `${formatNumber(result.needsReviewCounts.general)} | ` +
      `${resultLabel(result.needsReviewCounts.general === 0)} |`,
    "| raw_pdf_sections_special.csv | " +
      `${formatNumber(result.needsReviewCounts.special)} | ` +
      `${resultLabel(result.needsReviewCounts.special === 0)} |`,
    "| 合計 | " +
      `${formatNumber(result.needsReviewCounts.total)} | ` +
      `${resultLabel(result.needsReviewCounts.total === 0)} |`,
    "",
    "## ID・キー・会計コード検証",
    "",
    "| 検証項目 | 結果 | 判定 |",
    "| --- | ---: | --- |",
    "| section_id 一意数 / 行数 | " +
      `${formatNumber(result.uniqueSectionIdCount)} / ` +
      `${formatNumber(result.rowCounts.budgetSections)} | ` +
      `${resultLabel(
        result.uniqueSectionIdCount === result.rowCounts.budgetSections,
      )} |`,
    "| program_id 一意数 / 行数 | " +
      `${formatNumber(result.uniqueProgramIdCount)} / ` +
      `${formatNumber(result.rowCounts.budgetPrograms)} | ` +
      `${resultLabel(
        result.uniqueProgramIdCount === result.rowCounts.budgetPrograms,
      )} |`,
    "| programs側の不正なbudget_item_key行 | " +
      `${formatNumber(result.invalidProgramKeyRowCount)} | ` +
      `${resultLabel(result.invalidProgramKeyRowCount === 0)} |`,
    "| sections側の不正なbudget_item_key行 | " +
      `${formatNumber(result.invalidSectionKeyRowCount)} | ` +
      `${resultLabel(result.invalidSectionKeyRowCount === 0)} |`,
    "| items側の不正なbudget_item_key行 | " +
      `${formatNumber(result.invalidItemKeyRowCount)} | ` +
      `${resultLabel(result.invalidItemKeyRowCount === 0)} |`,
    "| config未定義account_code行 | " +
      `${formatNumber(result.invalidAccountCodeRowCount)} | ` +
      `${resultLabel(result.invalidAccountCodeRowCount === 0)} |`,
    "| 会計メタデータ不一致行 | " +
      `${formatNumber(result.accountMetadataMismatchRowCount)} | ` +
      `${resultLabel(result.accountMetadataMismatchRowCount === 0)} |`,
    "",
    "## 一般会計のPhase 6互換性",
    "",
    `総合判定: **${resultLabel(result.generalCompatibility.isPass)}**`,
    "",
    "| 検証項目 | Phase 6基準 | 現在値 | 判定 |",
    "| --- | ---: | ---: | --- |",
  );
  for (const check of result.generalCompatibility.checks) {
    lines.push(
      `| ${check.label} | ${formatNumber(check.expected)} | ` +
        `${formatNumber(check.actual)} | ${resultLabel(check.isPass)} |`,
    );
  }

  lines.push(
    "",
    "## 学校給食費会計",
    "",
    "`school_lunch_fee` は令和8年度の廃止・0円会計として " +
      "`status=abolished_zero` で検証した。",
    "",
    "- `budget_programs.csv`: 0円項目を保持",
    "- `budget_items.csv`: `ok_zero_amount` として保持",
    "- `budget_sections.csv`: PDF由来の節がないため0行。補完行は追加しない",
    "",
    "## エラー",
    "",
    `エラー件数: ${formatNumber(result.errors.length)} 件`,
    "",
  );

  if (result.errors.length === 0) {
    lines.push(
      "`processed/validation/validation_errors.csv` はヘッダーのみ。" +
        "要確認事項はない。",
    );
  } else {
    const errorTypeCounts = new Map<string, number>();
    for (const error of result.errors) {
      errorTypeCounts.set(
        error.error_type,
        (errorTypeCounts.get(error.error_type) ?? 0) + 1,
      );
    }
    lines.push("| error_type | 件数 |", "| --- | ---: |");
    for (const [errorType, count] of [...errorTypeCounts].sort()) {
      lines.push(`| \`${errorType}\` | ${formatNumber(count)} |`);
    }
  }

  lines.push(
    "",
    "## 関連資料",
    "",
    "- [入力ファイルプロファイル](budget_data_input_profile.md)",
    "- [一般会計PDF節抽出ノート](pdf_section_extraction_notes.md)",
    "- [特別会計PDF全体抽出レポート](special_account_full_extraction_report.md)",
    "",
  );
  return lines.join("\n");
}
