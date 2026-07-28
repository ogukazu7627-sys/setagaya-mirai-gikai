import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type {
  BudgetAccountDefinition,
  BudgetAccountsConfig,
} from "./budget-accounts";
import {
  buildBudgetItemKey,
  normalizeHierarchyCode,
  normalizeText,
  parseThousandYenAmount,
  TARGET_ACCOUNT_CODE,
  TARGET_ACCOUNT_NAME,
} from "./budget-programs";

export const EXPECTED_GENERAL_BUDGET_ITEM_ROW_COUNT = 128;
export const EXPECTED_BUDGET_ITEM_ROW_COUNT = 190;
export const EXPECTED_ZERO_AMOUNT_ITEM_COUNT = 10;

export const BUDGET_ITEM_LEGACY_COLUMNS = [
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

export const BUDGET_ITEM_COLUMNS = [
  ...BUDGET_ITEM_LEGACY_COLUMNS,
  "source_type",
  "is_zero_amount",
] as const;

export const BUDGET_ITEM_VALIDATION_STATUSES = [
  "ok",
  "ok_zero_amount",
  "error_missing_sections",
  "error_missing_programs",
  "error_amount_mismatch",
] as const;

const REQUIRED_SOURCE_COLUMNS = [
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

const EXISTING_ITEM_REQUIRED_COLUMNS = [
  "budget_item_key",
  "fiscal_year",
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

const GENERAL_REGRESSION_COLUMNS = [
  ...EXISTING_ITEM_REQUIRED_COLUMNS,
] as const;

export type BudgetItemSourceRow = Record<string, string>;
export type BudgetItemValidationStatus =
  (typeof BUDGET_ITEM_VALIDATION_STATUSES)[number];

export interface BudgetItem {
  budget_item_key: string;
  fiscal_year: number;
  account_code: string;
  account_name: string;
  budget_side: string;
  kan_code: string;
  kan_name: string;
  kou_code: string;
  kou_name: string;
  moku_code: string;
  moku_name: string;
  program_total_amount_thousand_yen: number;
  section_total_amount_thousand_yen: number;
  diff_amount_thousand_yen: number;
  validation_status: BudgetItemValidationStatus;
  program_row_count: number;
  section_row_count: number;
  source_type: "derived";
  is_zero_amount: boolean;
}

export interface BudgetItemValidation {
  rowCount: number;
  uniqueBudgetItemKeyCount: number;
  programTotalAmountThousandYen: number;
  sectionTotalAmountThousandYen: number;
  expectedAmountTotalThousandYen: number;
  accountItemCounts: Record<string, number>;
  accountProgramTotalsThousandYen: Record<string, number>;
  accountSectionTotalsThousandYen: Record<string, number>;
  expectedAccountTotalsThousandYen: Record<string, number>;
  statusCounts: Record<BudgetItemValidationStatus, number>;
  zeroAmountCount: number;
  errorStatusCount: number;
  isPass: boolean;
}

export interface GeneralBudgetItemRegression {
  rowCount: number;
  comparedColumnCount: number;
}

export interface BudgetItemLegacyRegression {
  rowCount: number;
  comparedColumnCount: number;
}

interface BudgetItemDimensions {
  budgetItemKey: string;
  fiscalYear: number;
  accountCode: string;
  accountName: string;
  budgetSide: string;
  kanCode: string;
  kanName: string;
  kouCode: string;
  kouName: string;
  mokuCode: string;
  mokuName: string;
}

interface NormalizedSourceRow {
  dimensions: BudgetItemDimensions;
  amountThousandYen: number;
}

interface BudgetItemAggregate extends BudgetItemDimensions {
  totalAmountThousandYen: number;
  rowCount: number;
}

function parseSourceRows(
  csvText: string,
  sourceName: string,
  requiredColumns: readonly string[],
): BudgetItemSourceRow[] {
  const rows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as BudgetItemSourceRow[];

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

export function parseBudgetProgramRows(
  csvText: string,
): BudgetItemSourceRow[] {
  return parseSourceRows(
    csvText,
    "budget_programs.csv",
    REQUIRED_SOURCE_COLUMNS,
  );
}

export function parseBudgetSectionRows(
  csvText: string,
): BudgetItemSourceRow[] {
  return parseSourceRows(
    csvText,
    "budget_sections.csv",
    REQUIRED_SOURCE_COLUMNS,
  );
}

export function parseExistingBudgetItemRows(
  csvText: string,
): BudgetItemSourceRow[] {
  return parseSourceRows(
    csvText,
    "既存budget_items.csv",
    EXISTING_ITEM_REQUIRED_COLUMNS,
  );
}

function parseFiscalYear(value: string, sourceName: string): number {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      `${sourceName}のfiscal_yearが整数ではありません: ${value}`,
    );
  }

  const fiscalYear = Number(normalized);
  if (!Number.isSafeInteger(fiscalYear) || fiscalYear <= 0) {
    throw new Error(`${sourceName}のfiscal_yearが不正です: ${value}`);
  }
  return fiscalYear;
}

function resolveAccount(
  row: BudgetItemSourceRow,
  sourceName: string,
  config: BudgetAccountsConfig,
): BudgetAccountDefinition {
  const accountCode = normalizeText(
    row.account_code,
    `${sourceName}.account_code`,
  );
  const account = config.accounts.find(
    (candidate) => candidate.account_code === accountCode,
  );
  if (!account) {
    throw new Error(
      `${sourceName}に設定外のaccount_codeがあります: ${accountCode}`,
    );
  }
  return account;
}

function normalizeSourceRow(
  row: BudgetItemSourceRow,
  sourceName: string,
  config: BudgetAccountsConfig,
): NormalizedSourceRow {
  const fiscalYear = parseFiscalYear(row.fiscal_year, sourceName);
  if (fiscalYear !== config.fiscal_year) {
    throw new Error(
      `${sourceName}のfiscal_yearが設定と一致しません: ` +
        `${fiscalYear} != ${config.fiscal_year}`,
    );
  }
  const account = resolveAccount(row, sourceName, config);
  const accountName = normalizeText(
    row.account_name,
    `${sourceName}.account_name`,
  );
  if (accountName !== account.account_name) {
    throw new Error(
      `${sourceName}のaccount_nameが設定と一致しません: ` +
        `${accountName} != ${account.account_name}`,
    );
  }
  const budgetSide = normalizeText(
    row.budget_side,
    `${sourceName}.budget_side`,
  );
  if (budgetSide !== account.budget_side) {
    throw new Error(
      `${sourceName}のbudget_sideが設定と一致しません: ` +
        `${budgetSide} != ${account.budget_side}`,
    );
  }
  const kanCode = normalizeHierarchyCode(
    row.kan_code,
    `${sourceName}.kan_code`,
  );
  const kouCode = normalizeHierarchyCode(
    row.kou_code,
    `${sourceName}.kou_code`,
  );
  const mokuCode = normalizeHierarchyCode(
    row.moku_code,
    `${sourceName}.moku_code`,
  );
  const expectedBudgetItemKey = buildBudgetItemKey({
    fiscalYear,
    accountCode: account.account_code,
    accountName,
    budgetSide,
    kanCode,
    kouCode,
    mokuCode,
  });
  const budgetItemKey = normalizeText(
    row.budget_item_key,
    `${sourceName}.budget_item_key`,
  );
  if (budgetItemKey !== expectedBudgetItemKey) {
    throw new Error(
      `${sourceName}のbudget_item_keyと会計・款・項・目コードが` +
        `一致しません: ${budgetItemKey} != ${expectedBudgetItemKey}`,
    );
  }

  return {
    dimensions: {
      budgetItemKey,
      fiscalYear,
      accountCode: account.account_code,
      accountName,
      budgetSide,
      kanCode,
      kanName: normalizeText(row.kan_name, `${sourceName}.kan_name`),
      kouCode,
      kouName: normalizeText(row.kou_name, `${sourceName}.kou_name`),
      mokuCode,
      mokuName: normalizeText(row.moku_name, `${sourceName}.moku_name`),
    },
    amountThousandYen: parseThousandYenAmount(
      row.amount_thousand_yen,
      `${sourceName}.amount_thousand_yen`,
    ),
  };
}

function dimensionsMatch(
  left: BudgetItemDimensions,
  right: BudgetItemDimensions,
): boolean {
  return (
    left.fiscalYear === right.fiscalYear &&
    left.accountCode === right.accountCode &&
    left.accountName === right.accountName &&
    left.budgetSide === right.budgetSide &&
    left.kanCode === right.kanCode &&
    left.kanName === right.kanName &&
    left.kouCode === right.kouCode &&
    left.kouName === right.kouName &&
    left.mokuCode === right.mokuCode &&
    left.mokuName === right.mokuName
  );
}

function aggregateSourceRows(
  rows: BudgetItemSourceRow[],
  sourceName: string,
  config: BudgetAccountsConfig,
): Map<string, BudgetItemAggregate> {
  const aggregates = new Map<string, BudgetItemAggregate>();

  for (const row of rows) {
    const normalized = normalizeSourceRow(row, sourceName, config);
    const key = normalized.dimensions.budgetItemKey;
    const existing = aggregates.get(key);

    if (!existing) {
      aggregates.set(key, {
        ...normalized.dimensions,
        totalAmountThousandYen: normalized.amountThousandYen,
        rowCount: 1,
      });
      continue;
    }

    if (!dimensionsMatch(existing, normalized.dimensions)) {
      throw new Error(
        `${sourceName}内で同一budget_item_keyの` +
          `会計・名称・コードが不一致です: ${key}`,
      );
    }

    const totalAmount =
      existing.totalAmountThousandYen + normalized.amountThousandYen;
    if (!Number.isSafeInteger(totalAmount)) {
      throw new Error(
        `${sourceName}の集計額が安全な整数範囲を超えました: ${key}`,
      );
    }
    existing.totalAmountThousandYen = totalAmount;
    existing.rowCount += 1;
  }

  return aggregates;
}

function determineValidationStatus(
  programExists: boolean,
  sectionExists: boolean,
  programTotal: number,
  sectionTotal: number,
): BudgetItemValidationStatus {
  if (programTotal === 0 && sectionTotal === 0) {
    return "ok_zero_amount";
  }
  if (
    programExists &&
    programTotal > 0 &&
    (!sectionExists || sectionTotal === 0)
  ) {
    return "error_missing_sections";
  }
  if (
    sectionExists &&
    sectionTotal > 0 &&
    (!programExists || programTotal === 0)
  ) {
    return "error_missing_programs";
  }
  if (
    programExists &&
    sectionExists &&
    programTotal === sectionTotal &&
    programTotal > 0
  ) {
    return "ok";
  }
  return "error_amount_mismatch";
}

export function transformBudgetItems(
  programRows: BudgetItemSourceRow[],
  sectionRows: BudgetItemSourceRow[],
  config: BudgetAccountsConfig,
): BudgetItem[] {
  const programAggregates = aggregateSourceRows(
    programRows,
    "budget_programs.csv",
    config,
  );
  const sectionAggregates = aggregateSourceRows(
    sectionRows,
    "budget_sections.csv",
    config,
  );
  const allKeys = new Set([
    ...programAggregates.keys(),
    ...sectionAggregates.keys(),
  ]);

  return [...allKeys]
    .sort((left, right) => left.localeCompare(right))
    .map((budgetItemKey) => {
      const programAggregate = programAggregates.get(budgetItemKey);
      const sectionAggregate = sectionAggregates.get(budgetItemKey);
      const preferredDimensions = programAggregate ?? sectionAggregate;
      if (!preferredDimensions) {
        throw new Error(`集計元がないbudget_item_keyです: ${budgetItemKey}`);
      }

      const programTotal =
        programAggregate?.totalAmountThousandYen ?? 0;
      const sectionTotal =
        sectionAggregate?.totalAmountThousandYen ?? 0;
      const validationStatus = determineValidationStatus(
        programAggregate !== undefined,
        sectionAggregate !== undefined,
        programTotal,
        sectionTotal,
      );

      return {
        budget_item_key: budgetItemKey,
        fiscal_year: preferredDimensions.fiscalYear,
        account_code: preferredDimensions.accountCode,
        account_name: preferredDimensions.accountName,
        budget_side: preferredDimensions.budgetSide,
        kan_code: preferredDimensions.kanCode,
        kan_name: preferredDimensions.kanName,
        kou_code: preferredDimensions.kouCode,
        kou_name: preferredDimensions.kouName,
        moku_code: preferredDimensions.mokuCode,
        moku_name: preferredDimensions.mokuName,
        program_total_amount_thousand_yen: programTotal,
        section_total_amount_thousand_yen: sectionTotal,
        diff_amount_thousand_yen: programTotal - sectionTotal,
        validation_status: validationStatus,
        program_row_count: programAggregate?.rowCount ?? 0,
        section_row_count: sectionAggregate?.rowCount ?? 0,
        source_type: "derived",
        is_zero_amount: validationStatus === "ok_zero_amount",
      };
    });
}

export function validateBudgetItems(
  budgetItems: BudgetItem[],
  config: BudgetAccountsConfig,
): BudgetItemValidation {
  if (budgetItems.length === 0) {
    throw new Error("検証対象の予算項目データがありません。");
  }

  const uniqueKeys = new Set(budgetItems.map((row) => row.budget_item_key));
  if (uniqueKeys.size !== budgetItems.length) {
    throw new Error("budget_item_keyの一意性検証に失敗しました。");
  }

  const accountsByCode = new Map(
    config.accounts.map((account) => [account.account_code, account]),
  );
  const accountItemCounts = Object.fromEntries(
    config.accounts.map((account) => [account.account_code, 0]),
  ) as Record<string, number>;
  const accountProgramTotals = Object.fromEntries(
    config.accounts.map((account) => [account.account_code, 0]),
  ) as Record<string, number>;
  const accountSectionTotals = Object.fromEntries(
    config.accounts.map((account) => [account.account_code, 0]),
  ) as Record<string, number>;
  const expectedAccountTotals = Object.fromEntries(
    config.accounts.map((account) => [
      account.account_code,
      account.expected_amount_thousand_yen,
    ]),
  ) as Record<string, number>;
  const statusCounts = Object.fromEntries(
    BUDGET_ITEM_VALIDATION_STATUSES.map((status) => [status, 0]),
  ) as Record<BudgetItemValidationStatus, number>;

  for (const row of budgetItems) {
    const account = accountsByCode.get(row.account_code);
    if (!account) {
      throw new Error(`設定にないaccount_codeです: ${row.account_code}`);
    }
    if (
      row.fiscal_year !== config.fiscal_year ||
      row.account_name !== account.account_name ||
      row.budget_side !== account.budget_side
    ) {
      throw new Error(
        `会計メタデータが設定と一致しません: ${row.budget_item_key}`,
      );
    }

    const expectedBudgetItemKey = buildBudgetItemKey({
      fiscalYear: row.fiscal_year,
      accountCode: row.account_code,
      accountName: row.account_name,
      budgetSide: row.budget_side,
      kanCode: row.kan_code,
      kouCode: row.kou_code,
      mokuCode: row.moku_code,
    });
    if (row.budget_item_key !== expectedBudgetItemKey) {
      throw new Error(
        `budget_item_keyと会計・款・項・目コードが一致しません: ` +
          `${row.budget_item_key} != ${expectedBudgetItemKey}`,
      );
    }
    if (
      !Number.isSafeInteger(row.program_total_amount_thousand_yen) ||
      !Number.isSafeInteger(row.section_total_amount_thousand_yen) ||
      !Number.isSafeInteger(row.diff_amount_thousand_yen)
    ) {
      throw new Error(`金額が整数ではありません: ${row.budget_item_key}`);
    }
    if (
      row.diff_amount_thousand_yen !==
      row.program_total_amount_thousand_yen -
        row.section_total_amount_thousand_yen
    ) {
      throw new Error(
        `diff_amount_thousand_yenが不正です: ${row.budget_item_key}`,
      );
    }
    if (
      !Number.isSafeInteger(row.program_row_count) ||
      !Number.isSafeInteger(row.section_row_count) ||
      row.program_row_count < 0 ||
      row.section_row_count < 0
    ) {
      throw new Error(`行数が不正です: ${row.budget_item_key}`);
    }

    const expectedStatus = determineValidationStatus(
      row.program_row_count > 0,
      row.section_row_count > 0,
      row.program_total_amount_thousand_yen,
      row.section_total_amount_thousand_yen,
    );
    if (row.validation_status !== expectedStatus) {
      throw new Error(
        `validation_statusが不正です: ${row.budget_item_key} ` +
        `${row.validation_status} != ${expectedStatus}`,
      );
    }
    if (
      row.source_type !== "derived" ||
      row.is_zero_amount !== (row.validation_status === "ok_zero_amount")
    ) {
      throw new Error(
        `派生データのメタデータが不正です: ${row.budget_item_key}`,
      );
    }

    accountItemCounts[row.account_code] += 1;
    accountProgramTotals[row.account_code] +=
      row.program_total_amount_thousand_yen;
    accountSectionTotals[row.account_code] +=
      row.section_total_amount_thousand_yen;
    statusCounts[row.validation_status] += 1;
  }

  const programTotal = Object.values(accountProgramTotals).reduce(
    (total, amount) => total + amount,
    0,
  );
  const sectionTotal = Object.values(accountSectionTotals).reduce(
    (total, amount) => total + amount,
    0,
  );
  const expectedAmountTotal = config.accounts.reduce(
    (total, account) => total + account.expected_amount_thousand_yen,
    0,
  );
  const accountTotalsPass = config.accounts.every(
    (account) =>
      accountProgramTotals[account.account_code] ===
        account.expected_amount_thousand_yen &&
      accountSectionTotals[account.account_code] ===
        account.expected_amount_thousand_yen,
  );
  const errorStatusCount =
    statusCounts.error_missing_sections +
    statusCounts.error_missing_programs +
    statusCounts.error_amount_mismatch;

  return {
    rowCount: budgetItems.length,
    uniqueBudgetItemKeyCount: uniqueKeys.size,
    programTotalAmountThousandYen: programTotal,
    sectionTotalAmountThousandYen: sectionTotal,
    expectedAmountTotalThousandYen: expectedAmountTotal,
    accountItemCounts,
    accountProgramTotalsThousandYen: accountProgramTotals,
    accountSectionTotalsThousandYen: accountSectionTotals,
    expectedAccountTotalsThousandYen: expectedAccountTotals,
    statusCounts,
    zeroAmountCount: budgetItems.filter((row) => row.is_zero_amount).length,
    errorStatusCount,
    isPass:
      accountTotalsPass &&
      programTotal === expectedAmountTotal &&
      sectionTotal === expectedAmountTotal &&
      errorStatusCount === 0,
  };
}

export function validateBudgetItemLegacyRegression(
  existingRows: BudgetItemSourceRow[],
  budgetItems: BudgetItem[],
): BudgetItemLegacyRegression {
  if (existingRows.length === 0) {
    throw new Error("既存budget_items.csvにデータ行がありません。");
  }
  const existingColumns = Object.keys(existingRows[0]).slice(
    0,
    BUDGET_ITEM_LEGACY_COLUMNS.length,
  );
  if (
    existingColumns.join(",") !== BUDGET_ITEM_LEGACY_COLUMNS.join(",")
  ) {
    throw new Error(
      "既存budget_items.csvの先頭17列が基準スキーマと一致しません。",
    );
  }
  if (existingRows.length !== budgetItems.length) {
    throw new Error(
      `budget_items.csvの行数が更新前と一致しません: ` +
        `${budgetItems.length} != ${existingRows.length}`,
    );
  }

  for (let index = 0; index < budgetItems.length; index += 1) {
    const existing = existingRows[index];
    const current = budgetItems[index] as unknown as Record<
      string,
      string | number | boolean
    >;
    for (const column of BUDGET_ITEM_LEGACY_COLUMNS) {
      const existingValue = existing[column] ?? "";
      const currentValue = String(current[column]);
      if (existingValue !== currentValue) {
        throw new Error(
          `budget_items.csvの既存値が変わりました: ` +
            `row=${index + 1}, column=${column}, ` +
            `${currentValue} != ${existingValue}`,
        );
      }
    }
  }

  return {
    rowCount: budgetItems.length,
    comparedColumnCount: BUDGET_ITEM_LEGACY_COLUMNS.length,
  };
}

export function validateGeneralBudgetItemRegression(
  existingRows: BudgetItemSourceRow[],
  budgetItems: BudgetItem[],
  expectedRowCount = EXPECTED_GENERAL_BUDGET_ITEM_ROW_COUNT,
): GeneralBudgetItemRegression {
  const existingGeneralRows = existingRows.filter(
    (row) =>
      row.account_code?.trim() === TARGET_ACCOUNT_CODE ||
      row.account_name?.trim() === TARGET_ACCOUNT_NAME,
  );
  const newGeneralRows = budgetItems.filter(
    (row) => row.account_code === TARGET_ACCOUNT_CODE,
  );

  if (existingGeneralRows.length !== expectedRowCount) {
    throw new Error(
      `既存一般会計の行数がPhase 6と一致しません: ` +
        `${existingGeneralRows.length} != ${expectedRowCount}`,
    );
  }
  if (newGeneralRows.length !== existingGeneralRows.length) {
    throw new Error(
      `一般会計の行数が既存出力と一致しません: ` +
        `${newGeneralRows.length} != ${existingGeneralRows.length}`,
    );
  }

  for (let index = 0; index < newGeneralRows.length; index += 1) {
    const existing = existingGeneralRows[index];
    const current = newGeneralRows[index] as unknown as Record<
      string,
      string | number
    >;
    for (const column of GENERAL_REGRESSION_COLUMNS) {
      const existingValue = existing[column] ?? "";
      const currentValue = String(current[column]);
      if (existingValue !== currentValue) {
        throw new Error(
          `一般会計のPhase 6回帰比較に失敗しました: ` +
            `row=${index + 1}, column=${column}, ` +
            `${currentValue} != ${existingValue}`,
        );
      }
    }
  }

  return {
    rowCount: newGeneralRows.length,
    comparedColumnCount: GENERAL_REGRESSION_COLUMNS.length,
  };
}

export function serializeBudgetItems(budgetItems: BudgetItem[]): string {
  return stringify(
    budgetItems.map((budgetItem) => ({
      ...budgetItem,
      is_zero_amount: String(budgetItem.is_zero_amount),
    })),
    {
      columns: [...BUDGET_ITEM_COLUMNS],
      header: true,
      record_delimiter: "unix",
    },
  );
}
