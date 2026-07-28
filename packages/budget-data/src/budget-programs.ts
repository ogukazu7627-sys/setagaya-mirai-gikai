import { TextDecoder } from "node:util";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type {
  BudgetAccountDefinition,
  BudgetAccountsConfig,
} from "./budget-accounts";
import {
  DEPARTMENT_MAPPING_STATUSES,
  indexDepartmentNameMappings,
  type DepartmentMappingStatus,
  type DepartmentNameMapping,
} from "./department-name-map";

export const TARGET_FISCAL_YEAR = 2026;
export const TARGET_ACCOUNT_CODE = "general";
export const TARGET_ACCOUNT_NAME = "一般会計";
export const TARGET_BUDGET_TYPE = "当初";
export const TARGET_BUDGET_SIDE = "expenditure";
export const EXPECTED_GENERAL_EXPENDITURE_TOTAL = 431_353_010;
export const EXPECTED_ALL_ACCOUNT_EXPENDITURE_TOTAL = 621_033_664;
export const EXPECTED_BUDGET_PROGRAM_ROW_COUNT = 1_170;
export const EXPECTED_BUDGET_PROGRAM_GROUP_COUNT = 1_166;
export const EXPECTED_ZERO_AMOUNT_PROGRAM_COUNT = 44;
export const EXPECTED_NEGATIVE_GENERAL_REVENUE_COUNT = 26;
export const DEFAULT_BUDGET_PROGRAM_SOURCE_FILE = "ippansaisyutu.csv";
export const SOURCE_BUDGET_ROW_NUMBER = Symbol("sourceBudgetRowNumber");

export const BUDGET_PROGRAM_LEGACY_COLUMNS = [
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
  "major_program_name",
  "budget_program_name",
  "detail_program_name",
  "department_name",
  "amount_thousand_yen",
  "general_revenue_thousand_yen",
  "allocated_revenue_thousand_yen",
] as const;

export const BUDGET_PROGRAM_EXTENSION_COLUMNS = [
  "major_program_code",
  "budget_program_code",
  "detail_program_code",
  "budget_program_group_id",
  "source_type",
  "source_file",
  "source_row_number",
  "is_zero_amount",
  "funding_data_status",
] as const;

export const BUDGET_PROGRAM_PHASE_16_COLUMNS = [
  ...BUDGET_PROGRAM_LEGACY_COLUMNS,
  ...BUDGET_PROGRAM_EXTENSION_COLUMNS,
] as const;

export const BUDGET_PROGRAM_DEPARTMENT_COLUMNS = [
  "department_display_name",
  "department_mapping_status",
] as const;

export const BUDGET_PROGRAM_COLUMNS = [
  ...BUDGET_PROGRAM_PHASE_16_COLUMNS,
  ...BUDGET_PROGRAM_DEPARTMENT_COLUMNS,
] as const;

const GENERAL_REGRESSION_COLUMNS = [
  "program_id",
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
  "major_program_name",
  "budget_program_name",
  "detail_program_name",
  "department_name",
  "amount_thousand_yen",
  "general_revenue_thousand_yen",
  "allocated_revenue_thousand_yen",
] as const;

const REQUIRED_SOURCE_COLUMNS = [
  "年度",
  "当初補正区分名称",
  "会計名称",
  "所属名称",
  "款",
  "款名称",
  "項",
  "項名称",
  "目",
  "目名称",
  "大事業",
  "大事業名称",
  "予算事業",
  "予算事業名称",
  "内訳事業",
  "内訳事業名称",
  "予算見積額",
  "充当額",
  "一般財源額",
] as const;

export type SourceBudgetRow = Record<string, string> & {
  [SOURCE_BUDGET_ROW_NUMBER]?: number;
};

export interface BudgetProgram {
  program_id: string;
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
  major_program_name: string;
  budget_program_name: string;
  detail_program_name: string;
  department_name: string;
  amount_thousand_yen: number;
  general_revenue_thousand_yen: number;
  allocated_revenue_thousand_yen: number;
  major_program_code: string;
  budget_program_code: string;
  detail_program_code: string;
  budget_program_group_id: string;
  source_type: "official_csv";
  source_file: string;
  source_row_number: number;
  is_zero_amount: boolean;
  funding_data_status: "raw_source_only";
  department_display_name: string;
  department_mapping_status: DepartmentMappingStatus;
}

type BudgetProgramPhase16 = Omit<
  BudgetProgram,
  "department_display_name" | "department_mapping_status"
>;

export interface DecodedBudgetCsv {
  encoding: "utf-8" | "cp932";
  text: string;
}

export interface BudgetProgramValidation {
  rowCount: number;
  uniqueProgramIdCount: number;
  budgetItemKeyConsistencyCount: number;
  revenueBalanceCount: number;
  accountRowCounts: Record<string, number>;
  accountAmountTotalsThousandYen: Record<string, number>;
  expectedAccountAmountTotalsThousandYen: Record<string, number>;
  amountTotalThousandYen: number;
  expectedAmountTotalThousandYen: number;
  uniqueBudgetProgramGroupIdCount: number;
  zeroAmountCount: number;
  negativeGeneralRevenueCount: number;
  uniqueDepartmentNameCount: number;
  departmentMappingStatusCounts: Record<DepartmentMappingStatus, number>;
  departmentNeedsReviewCount: number;
}

export interface GeneralProgramRegression {
  rowCount: number;
  comparedColumnCount: number;
}

export interface BudgetProgramLegacyRegression {
  rowCount: number;
  comparedColumnCount: number;
}

export interface BudgetProgramSourceTraceability {
  rowCount: number;
  recoveredSourceRowCount: number;
  comparedColumnCount: number;
}

export interface BudgetItemKeyParts {
  fiscalYear: number;
  accountCode?: string;
  accountName: string;
  budgetSide: string;
  kanCode: string;
  kouCode: string;
  mokuCode: string;
}

function decodeWith(
  bytes: Uint8Array,
  encoding: "utf-8" | "shift_jis",
): string {
  return new TextDecoder(encoding, { fatal: true }).decode(bytes);
}

export function decodeBudgetCsv(bytes: Uint8Array): DecodedBudgetCsv {
  try {
    return {
      encoding: "utf-8",
      text: decodeWith(bytes, "utf-8").replace(/^\uFEFF/, ""),
    };
  } catch {
    try {
      return {
        encoding: "cp932",
        text: decodeWith(bytes, "shift_jis").replace(/^\uFEFF/, ""),
      };
    } catch {
      throw new Error(
        "入力CSVをUTF-8またはCP932としてデコードできませんでした。",
      );
    }
  }
}

export function parseSourceBudgetRows(csvText: string): SourceBudgetRow[] {
  const rows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;

  if (rows.length === 0) {
    throw new Error("入力CSVにデータ行がありません。");
  }

  const sourceColumns = new Set(Object.keys(rows[0]));
  const missingColumns = REQUIRED_SOURCE_COLUMNS.filter(
    (column) => !sourceColumns.has(column),
  );
  if (missingColumns.length > 0) {
    throw new Error(
      `入力CSVに必要な列がありません: ${missingColumns.join(", ")}`,
    );
  }

  return rows.map((row, index) => {
    Object.defineProperty(row, SOURCE_BUDGET_ROW_NUMBER, {
      configurable: false,
      enumerable: false,
      value: index + 1,
      writable: false,
    });
    return row as SourceBudgetRow;
  });
}

export function normalizeText(value: string, fieldName: string): string {
  const normalized = value
    .normalize("NFC")
    .replace(/\r\n?|\n/g, " ")
    .replace(/[ \t\u3000]+/g, " ")
    .trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName}が空です。`);
  }
  return normalized;
}

export function normalizeHierarchyCode(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${fieldName}が整数コードではありません: ${value}`);
  }

  const numericValue = Number(normalized);
  if (!Number.isSafeInteger(numericValue) || numericValue < 0) {
    throw new Error(`${fieldName}が有効な整数コードではありません: ${value}`);
  }

  return String(numericValue).padStart(2, "0");
}

export function parseThousandYenAmount(
  value: string,
  fieldName: string,
): number {
  const normalized = value.replaceAll(",", "").trim();
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error(`${fieldName}が整数金額ではありません: ${value}`);
  }

  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount)) {
    throw new Error(`${fieldName}が安全な整数範囲を超えています: ${value}`);
  }
  return amount;
}

export function buildBudgetItemKey(parts: BudgetItemKeyParts): string {
  if (parts.fiscalYear !== TARGET_FISCAL_YEAR) {
    throw new Error(`対象外の年度です: ${parts.fiscalYear}`);
  }
  if (parts.budgetSide.trim() !== TARGET_BUDGET_SIDE) {
    throw new Error(`対象外の予算区分です: ${parts.budgetSide}`);
  }

  const accountName = parts.accountName.trim();
  const accountCode =
    parts.accountCode?.trim() ||
    (accountName === TARGET_ACCOUNT_NAME ? TARGET_ACCOUNT_CODE : "");
  if (!/^[a-z][a-z0-9_]*$/.test(accountCode)) {
    throw new Error(`account_codeが不正です: ${accountCode || "(empty)"}`);
  }
  if (accountName.length === 0) {
    throw new Error("account_nameが空です。");
  }

  const kanCode = normalizeHierarchyCode(parts.kanCode, "款");
  const kouCode = normalizeHierarchyCode(parts.kouCode, "項");
  const mokuCode = normalizeHierarchyCode(parts.mokuCode, "目");

  return (
    `${parts.fiscalYear}_${accountCode}_${TARGET_BUDGET_SIDE}_` +
    `${kanCode}_${kouCode}_${mokuCode}`
  );
}

function buildBudgetProgram(
  row: SourceBudgetRow,
  fiscalYear: number,
  account: BudgetAccountDefinition,
  sourceFile: string,
  sourceRowNumber: number,
): BudgetProgramPhase16 {
  const kanCode = normalizeHierarchyCode(row["款"], "款");
  const kouCode = normalizeHierarchyCode(row["項"], "項");
  const mokuCode = normalizeHierarchyCode(row["目"], "目");
  const majorProgramCode = normalizeHierarchyCode(row["大事業"], "大事業");
  const budgetProgramCode = normalizeHierarchyCode(
    row["予算事業"],
    "予算事業",
  );
  const detailProgramCode = normalizeHierarchyCode(
    row["内訳事業"],
    "内訳事業",
  );
  const budgetItemKey = buildBudgetItemKey({
    fiscalYear,
    accountCode: account.account_code,
    accountName: account.account_name,
    budgetSide: account.budget_side,
    kanCode,
    kouCode,
    mokuCode,
  });

  const amount = parseThousandYenAmount(row["予算見積額"], "予算見積額");
  const generalRevenue = parseThousandYenAmount(
    row["一般財源額"],
    "一般財源額",
  );
  const allocatedRevenue = parseThousandYenAmount(row["充当額"], "充当額");

  if (amount !== generalRevenue + allocatedRevenue) {
    throw new Error(
      `財源額が一致しません: ${budgetItemKey} ` +
        `${amount} != ${generalRevenue} + ${allocatedRevenue}`,
    );
  }

  return {
    program_id:
      `${budgetItemKey}_${majorProgramCode}_` +
      `${budgetProgramCode}_${detailProgramCode}`,
    budget_item_key: budgetItemKey,
    fiscal_year: fiscalYear,
    account_code: account.account_code,
    account_name: account.account_name,
    budget_side: account.budget_side,
    kan_code: kanCode,
    kan_name: normalizeText(row["款名称"], "款名称"),
    kou_code: kouCode,
    kou_name: normalizeText(row["項名称"], "項名称"),
    moku_code: mokuCode,
    moku_name: normalizeText(row["目名称"], "目名称"),
    major_program_name: normalizeText(row["大事業名称"], "大事業名称"),
    budget_program_name: normalizeText(row["予算事業名称"], "予算事業名称"),
    detail_program_name: normalizeText(row["内訳事業名称"], "内訳事業名称"),
    department_name: normalizeText(row["所属名称"], "所属名称"),
    amount_thousand_yen: amount,
    general_revenue_thousand_yen: generalRevenue,
    allocated_revenue_thousand_yen: allocatedRevenue,
    major_program_code: majorProgramCode,
    budget_program_code: budgetProgramCode,
    detail_program_code: detailProgramCode,
    budget_program_group_id:
      `${budgetItemKey}_${majorProgramCode}_${budgetProgramCode}`,
    source_type: "official_csv",
    source_file: normalizeText(sourceFile, "source_file"),
    source_row_number: sourceRowNumber,
    is_zero_amount: amount === 0,
    funding_data_status: "raw_source_only",
  };
}

export function transformBudgetPrograms(
  sourceRows: SourceBudgetRow[],
  config: BudgetAccountsConfig,
  departmentMappings: readonly DepartmentNameMapping[],
  sourceFile = DEFAULT_BUDGET_PROGRAM_SOURCE_FILE,
): BudgetProgram[] {
  if (config.fiscal_year !== TARGET_FISCAL_YEAR) {
    throw new Error(
      `設定年度が対象年度ではありません: ${config.fiscal_year}`,
    );
  }

  const accountsByCsvName = new Map(
    config.accounts.map((account) => [
      account.csv_account_name,
      account,
    ]),
  );
  const targetRows = sourceRows
    .map((row, index) => ({
      row,
      sourceRowNumber: row[SOURCE_BUDGET_ROW_NUMBER] ?? index + 1,
    }))
    .filter(
      ({ row }) =>
        row["年度"]?.trim() === String(config.fiscal_year) &&
        row["当初補正区分名称"]?.trim() === TARGET_BUDGET_TYPE &&
        accountsByCsvName.has(row["会計名称"]?.trim()),
    );
  if (targetRows.length === 0) {
    throw new Error("設定対象の2026年度・当初予算行がありません。");
  }

  const targetAccountNames = new Set(
    targetRows.map(({ row }) => row["会計名称"].trim()),
  );
  const missingAccounts = config.accounts.filter(
    (account) => !targetAccountNames.has(account.csv_account_name),
  );
  if (missingAccounts.length > 0) {
    throw new Error(
      `入力CSVに設定会計の行がありません: ` +
        missingAccounts
          .map((account) => account.csv_account_name)
          .join(", "),
    );
  }

  const phase16Programs = targetRows
    .map(({ row, sourceRowNumber }) => {
      const account = accountsByCsvName.get(row["会計名称"].trim());
      if (!account) {
        throw new Error(`未定義の会計です: ${row["会計名称"]}`);
      }
      return buildBudgetProgram(
        row,
        config.fiscal_year,
        account,
        sourceFile,
        sourceRowNumber,
      );
    })
    .sort((left, right) => left.program_id.localeCompare(right.program_id));
  const mappingsByRawName = indexDepartmentNameMappings(
    phase16Programs.map((program) => program.department_name),
    departmentMappings,
  );
  const programs = phase16Programs.map((program) => {
    const mapping = mappingsByRawName.get(program.department_name);
    if (!mapping) {
      throw new Error(
        `部署名マッピングを取得できません: ${program.department_name}`,
      );
    }
    return {
      ...program,
      department_display_name: mapping.department_display_name,
      department_mapping_status: mapping.mapping_status,
    };
  });

  const uniqueProgramIds = new Set(programs.map((row) => row.program_id));
  if (uniqueProgramIds.size !== programs.length) {
    throw new Error(
      `program_idが重複しています: ` +
        `${programs.length - uniqueProgramIds.size}件`,
    );
  }

  return programs;
}

export function validateBudgetPrograms(
  programs: BudgetProgram[],
  config: BudgetAccountsConfig,
): BudgetProgramValidation {
  const uniqueProgramIds = new Set(programs.map((row) => row.program_id));
  if (uniqueProgramIds.size !== programs.length) {
    throw new Error("program_idの一意性検証に失敗しました。");
  }

  const accountsByCode = new Map(
    config.accounts.map((account) => [account.account_code, account]),
  );
  const accountRowCounts = Object.fromEntries(
    config.accounts.map((account) => [account.account_code, 0]),
  ) as Record<string, number>;
  const accountTotals = Object.fromEntries(
    config.accounts.map((account) => [account.account_code, 0]),
  ) as Record<string, number>;
  const expectedAccountTotals = Object.fromEntries(
    config.accounts.map((account) => [
      account.account_code,
      account.expected_amount_thousand_yen,
    ]),
  ) as Record<string, number>;
  const sourceRowNumbers = new Set<number>();
  const departmentMappingStatusCounts = Object.fromEntries(
    DEPARTMENT_MAPPING_STATUSES.map((status) => [status, 0]),
  ) as Record<DepartmentMappingStatus, number>;

  for (const row of programs) {
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
        `会計メタデータが設定と一致しません: ${row.program_id}`,
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

    const programCodeSuffix = row.program_id.slice(
      `${row.budget_item_key}_`.length,
    );
    if (
      !row.program_id.startsWith(`${row.budget_item_key}_`) ||
      !/^\d{2}_\d{2}_\d{2}$/.test(programCodeSuffix)
    ) {
      throw new Error(
        `program_idが_区切りの階層コード形式ではありません: ` +
          row.program_id,
      );
    }
    if (
      programCodeSuffix !==
      `${row.major_program_code}_${row.budget_program_code}_` +
        row.detail_program_code
    ) {
      throw new Error(
        `program_idと事業コードが一致しません: ${row.program_id}`,
      );
    }
    const expectedGroupId =
      `${row.budget_item_key}_${row.major_program_code}_` +
      row.budget_program_code;
    if (row.budget_program_group_id !== expectedGroupId) {
      throw new Error(
        `budget_program_group_idが不正です: ${row.program_id}`,
      );
    }
    if (
      row.source_type !== "official_csv" ||
      row.funding_data_status !== "raw_source_only"
    ) {
      throw new Error(`出典メタデータが不正です: ${row.program_id}`);
    }
    if (
      !Number.isSafeInteger(row.source_row_number) ||
      row.source_row_number <= 0 ||
      sourceRowNumbers.has(row.source_row_number)
    ) {
      throw new Error(`source_row_numberが不正です: ${row.program_id}`);
    }
    sourceRowNumbers.add(row.source_row_number);
    if (row.is_zero_amount !== (row.amount_thousand_yen === 0)) {
      throw new Error(`is_zero_amountが不正です: ${row.program_id}`);
    }
    if (
      !DEPARTMENT_MAPPING_STATUSES.includes(
        row.department_mapping_status,
      )
    ) {
      throw new Error(
        `department_mapping_statusが不正です: ${row.program_id}`,
      );
    }
    if (
      row.department_mapping_status !== "needs_review" &&
      row.department_display_name.length === 0
    ) {
      throw new Error(
        `確定済み部署表示名が空です: ${row.program_id}`,
      );
    }
    departmentMappingStatusCounts[row.department_mapping_status] += 1;
    if (
      row.amount_thousand_yen !==
      row.general_revenue_thousand_yen + row.allocated_revenue_thousand_yen
    ) {
      throw new Error(
        `財源額が一致しません: ${row.program_id} ` +
          `${row.amount_thousand_yen} != ` +
          `${row.general_revenue_thousand_yen} + ` +
          `${row.allocated_revenue_thousand_yen}`,
      );
    }

    accountRowCounts[row.account_code] += 1;
    accountTotals[row.account_code] += row.amount_thousand_yen;
  }

  for (const account of config.accounts) {
    const actual = accountTotals[account.account_code];
    if (actual !== account.expected_amount_thousand_yen) {
      throw new Error(
        `${account.account_code}のamount_thousand_yen合計が` +
          `一致しません: ${actual} != ` +
          account.expected_amount_thousand_yen,
      );
    }
  }

  const amountTotal = Object.values(accountTotals).reduce(
    (total, amount) => total + amount,
    0,
  );
  const expectedAmountTotal = config.accounts.reduce(
    (total, account) => total + account.expected_amount_thousand_yen,
    0,
  );
  if (amountTotal !== expectedAmountTotal) {
    throw new Error(
      `全会計のamount_thousand_yen合計が一致しません: ` +
        `${amountTotal} != ${expectedAmountTotal}`,
    );
  }

  return {
    rowCount: programs.length,
    uniqueProgramIdCount: uniqueProgramIds.size,
    budgetItemKeyConsistencyCount: programs.length,
    revenueBalanceCount: programs.length,
    accountRowCounts,
    accountAmountTotalsThousandYen: accountTotals,
    expectedAccountAmountTotalsThousandYen: expectedAccountTotals,
    amountTotalThousandYen: amountTotal,
    expectedAmountTotalThousandYen: expectedAmountTotal,
    uniqueBudgetProgramGroupIdCount: new Set(
      programs.map((row) => row.budget_program_group_id),
    ).size,
    zeroAmountCount: programs.filter((row) => row.is_zero_amount).length,
    negativeGeneralRevenueCount: programs.filter(
      (row) => row.general_revenue_thousand_yen < 0,
    ).length,
    uniqueDepartmentNameCount: new Set(
      programs.map((row) => row.department_name),
    ).size,
    departmentMappingStatusCounts,
    departmentNeedsReviewCount:
      departmentMappingStatusCounts.needs_review,
  };
}

function parseExistingProgramRows(
  csvText: string,
  expectedColumns: readonly string[],
): Array<Record<string, string>> {
  const rows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;
  if (rows.length === 0) {
    throw new Error("既存budget_programs.csvにデータ行がありません。");
  }
  const existingColumns = Object.keys(rows[0]).slice(
    0,
    expectedColumns.length,
  );
  if (existingColumns.join(",") !== expectedColumns.join(",")) {
    throw new Error(
      `既存budget_programs.csvの先頭${expectedColumns.length}列が` +
        "基準スキーマと一致しません。",
    );
  }
  return rows;
}

function validateBudgetProgramColumnsRegression(
  existingCsvText: string,
  programs: BudgetProgram[],
  columns: readonly (keyof BudgetProgram)[],
): BudgetProgramLegacyRegression {
  const existingRows = parseExistingProgramRows(existingCsvText, columns);
  if (existingRows.length !== programs.length) {
    throw new Error(
      `budget_programs.csvの行数が更新前と一致しません: ` +
        `${programs.length} != ${existingRows.length}`,
    );
  }

  for (let index = 0; index < programs.length; index += 1) {
    const existing = existingRows[index];
    const current = programs[index] as unknown as Record<
      string,
      string | number | boolean
    >;
    for (const column of columns) {
      const existingValue = existing[column] ?? "";
      const currentValue = String(current[column]);
      if (existingValue !== currentValue) {
        throw new Error(
          `budget_programs.csvの既存値が変わりました: ` +
            `row=${index + 1}, column=${column}, ` +
            `${currentValue} != ${existingValue}`,
        );
      }
    }
  }

  return {
    rowCount: programs.length,
    comparedColumnCount: columns.length,
  };
}

export function validateBudgetProgramLegacyRegression(
  existingCsvText: string,
  programs: BudgetProgram[],
): BudgetProgramLegacyRegression {
  return validateBudgetProgramColumnsRegression(
    existingCsvText,
    programs,
    BUDGET_PROGRAM_LEGACY_COLUMNS,
  );
}

export function validateBudgetProgramPhase16Regression(
  existingCsvText: string,
  programs: BudgetProgram[],
): BudgetProgramLegacyRegression {
  return validateBudgetProgramColumnsRegression(
    existingCsvText,
    programs,
    BUDGET_PROGRAM_PHASE_16_COLUMNS,
  );
}

export function validateBudgetProgramSourceTraceability(
  programs: BudgetProgram[],
  sourceRows: SourceBudgetRow[],
  config: BudgetAccountsConfig,
  sourceFile = DEFAULT_BUDGET_PROGRAM_SOURCE_FILE,
): BudgetProgramSourceTraceability {
  const accountsByCsvName = new Map(
    config.accounts.map((account) => [
      account.csv_account_name,
      account,
    ]),
  );
  const recoveredSourceRows = new Set<number>();

  for (const program of programs) {
    const sourceRow = sourceRows[program.source_row_number - 1];
    if (!sourceRow) {
      throw new Error(
        `source_row_numberから元CSV行を復元できません: ` +
          program.program_id,
      );
    }
    const account = accountsByCsvName.get(sourceRow["会計名称"]?.trim());
    if (!account) {
      throw new Error(
        `復元元CSV行の会計が設定外です: ${program.program_id}`,
      );
    }
    const recovered = buildBudgetProgram(
      sourceRow,
      config.fiscal_year,
      account,
      sourceFile,
      program.source_row_number,
    ) as unknown as Record<string, string | number | boolean>;
    const current = program as unknown as Record<
      string,
      string | number | boolean
    >;
    for (const column of BUDGET_PROGRAM_LEGACY_COLUMNS) {
      if (String(recovered[column]) !== String(current[column])) {
        throw new Error(
          `元CSV行から既存19列を復元できません: ` +
            `${program.program_id}.${column}`,
        );
      }
    }
    recoveredSourceRows.add(program.source_row_number);
  }

  return {
    rowCount: programs.length,
    recoveredSourceRowCount: recoveredSourceRows.size,
    comparedColumnCount: BUDGET_PROGRAM_LEGACY_COLUMNS.length,
  };
}

export function validateGeneralProgramRegression(
  existingCsvText: string,
  programs: BudgetProgram[],
): GeneralProgramRegression {
  const existingRows = parseExistingProgramRows(
    existingCsvText,
    BUDGET_PROGRAM_LEGACY_COLUMNS,
  );
  const existingGeneralRows = existingRows
    .filter(
      (row) =>
        row.account_code?.trim() === TARGET_ACCOUNT_CODE ||
        row.account_name?.trim() === TARGET_ACCOUNT_NAME,
    )
    .sort((left, right) =>
      left.program_id.localeCompare(right.program_id),
    );
  const newGeneralRows = programs
    .filter((row) => row.account_code === TARGET_ACCOUNT_CODE)
    .sort((left, right) => left.program_id.localeCompare(right.program_id));

  if (existingGeneralRows.length !== newGeneralRows.length) {
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
      const existingValue = existing[column]?.trim() ?? "";
      const currentValue = String(current[column]);
      if (existingValue !== currentValue) {
        throw new Error(
          `一般会計の回帰比較に失敗しました: ` +
            `${current.program_id}.${column} ` +
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

export function serializeBudgetPrograms(programs: BudgetProgram[]): string {
  return stringify(
    programs.map((program) => ({
      ...program,
      is_zero_amount: String(program.is_zero_amount),
    })),
    {
      columns: [...BUDGET_PROGRAM_COLUMNS],
      header: true,
      record_delimiter: "unix",
    },
  );
}
