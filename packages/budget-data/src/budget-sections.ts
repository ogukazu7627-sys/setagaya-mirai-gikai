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

export const EXPECTED_GENERAL_SECTION_ROW_COUNT = 872;
export const EXPECTED_BUDGET_SECTION_ROW_COUNT = 994;
export const DEFAULT_BUDGET_BOOK_SOURCE_FILE =
  "r8tousyoyosanallpage.pdf";

export const BUDGET_SECTION_LEGACY_COLUMNS = [
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
  "setsu_code",
  "setsu_name",
  "amount_thousand_yen",
  "budget_book_page",
  "pdf_page",
  "source_file",
] as const;

export const BUDGET_SECTION_COLUMNS = [
  ...BUDGET_SECTION_LEGACY_COLUMNS,
  "source_type",
] as const;

const EXISTING_SECTION_REQUIRED_COLUMNS = [
  "section_id",
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
  "setsu_code",
  "setsu_name",
  "amount_thousand_yen",
  "budget_book_page",
  "pdf_page",
  "source_file",
] as const;

const GENERAL_RAW_SECTION_REQUIRED_COLUMNS = [
  "source_file",
  "pdf_page",
  "budget_book_page",
  "fiscal_year",
  "account_name",
  "budget_side",
  "kan_code",
  "kan_name",
  "kou_code",
  "kou_name",
  "moku_code",
  "moku_name",
  "moku_total_amount_thousand_yen",
  "setsu_code",
  "setsu_name",
  "setsu_amount_thousand_yen",
  "raw_text",
  "parse_status",
  "parse_note",
] as const;

const SPECIAL_SECTION_REQUIRED_COLUMNS = [
  "raw_section_id",
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
  "setsu_code",
  "setsu_name",
  "amount_thousand_yen",
  "budget_book_page",
  "pdf_page",
  "parse_status",
  "review_reason",
] as const;

const PROGRAM_REQUIRED_COLUMNS = ["budget_item_key"] as const;

const GENERAL_REGRESSION_COLUMNS = [
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
  "setsu_code",
  "setsu_name",
  "amount_thousand_yen",
  "budget_book_page",
  "pdf_page",
  "source_file",
] as const;

export type BudgetSectionSourceRow = Record<string, string>;

export interface BudgetSection {
  section_id: string;
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
  setsu_code: string;
  setsu_name: string;
  amount_thousand_yen: number;
  budget_book_page: number;
  pdf_page: number;
  source_file: string;
  source_type: "official_pdf";
}

type BudgetSectionWithoutId = Omit<BudgetSection, "section_id">;

export interface BudgetSectionValidation {
  rowCount: number;
  uniqueSectionIdCount: number;
  uniqueBudgetItemKeyCount: number;
  budgetItemKeyConsistencyCount: number;
  programBudgetItemKeyConsistencyCount: number;
  accountRowCounts: Record<string, number>;
  accountAmountTotalsThousandYen: Record<string, number>;
  expectedAccountAmountTotalsThousandYen: Record<string, number>;
  amountTotalThousandYen: number;
  expectedAmountTotalThousandYen: number;
}

export interface GeneralSectionRegression {
  rowCount: number;
  comparedColumnCount: number;
}

export interface BudgetSectionLegacyRegression {
  rowCount: number;
  comparedColumnCount: number;
}

function parseCsvRows(
  csvText: string,
  sourceName: string,
  requiredColumns: readonly string[],
): BudgetSectionSourceRow[] {
  const rows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as BudgetSectionSourceRow[];

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

export function parseExistingBudgetSectionRows(
  csvText: string,
): BudgetSectionSourceRow[] {
  return parseCsvRows(
    csvText,
    "既存budget_sections.csv",
    EXISTING_SECTION_REQUIRED_COLUMNS,
  );
}

export function parseRawGeneralSectionRows(
  csvText: string,
): BudgetSectionSourceRow[] {
  return parseCsvRows(
    csvText,
    "raw_pdf_sections.csv",
    GENERAL_RAW_SECTION_REQUIRED_COLUMNS,
  );
}

export function parseRawSpecialSectionRows(
  csvText: string,
): BudgetSectionSourceRow[] {
  return parseCsvRows(
    csvText,
    "raw_pdf_sections_special.csv",
    SPECIAL_SECTION_REQUIRED_COLUMNS,
  );
}

export function parseBudgetProgramKeySet(csvText: string): Set<string> {
  const rows = parseCsvRows(
    csvText,
    "budget_programs.csv",
    PROGRAM_REQUIRED_COLUMNS,
  );
  return new Set(
    rows.map((row) =>
      normalizeText(row.budget_item_key, "budget_programs.budget_item_key"),
    ),
  );
}

function parsePositiveInteger(value: string, fieldName: string): number {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${fieldName}が正の整数ではありません: ${value}`);
  }

  const parsedValue = Number(normalized);
  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName}が正の整数ではありません: ${value}`);
  }
  return parsedValue;
}

function findGeneralAccount(
  config: BudgetAccountsConfig,
): BudgetAccountDefinition {
  const account = config.accounts.find(
    (candidate) => candidate.account_code === TARGET_ACCOUNT_CODE,
  );
  if (
    !account ||
    account.account_name !== TARGET_ACCOUNT_NAME ||
    account.account_type !== "general" ||
    account.status !== "active"
  ) {
    throw new Error("一般会計の設定がactiveなgeneral会計ではありません。");
  }
  return account;
}

function normalizeSectionCore(
  row: BudgetSectionSourceRow,
  account: BudgetAccountDefinition,
  fiscalYear: number,
  sourceName: string,
  sourceFile: string,
): BudgetSectionWithoutId {
  const rowFiscalYear = parsePositiveInteger(
    row.fiscal_year,
    `${sourceName}.fiscal_year`,
  );
  if (rowFiscalYear !== fiscalYear) {
    throw new Error(
      `${sourceName}の年度が設定と一致しません: ` +
        `${rowFiscalYear} != ${fiscalYear}`,
    );
  }

  const rowAccountCode = row.account_code?.trim();
  if (rowAccountCode && rowAccountCode !== account.account_code) {
    throw new Error(
      `${sourceName}のaccount_codeが設定と一致しません: ` +
        `${rowAccountCode} != ${account.account_code}`,
    );
  }
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
  const setsuCode = normalizeHierarchyCode(
    row.setsu_code,
    `${sourceName}.setsu_code`,
  );
  const budgetItemKey = buildBudgetItemKey({
    fiscalYear: rowFiscalYear,
    accountCode: account.account_code,
    accountName,
    budgetSide,
    kanCode,
    kouCode,
    mokuCode,
  });
  const sourceBudgetItemKey = row.budget_item_key?.trim();
  if (sourceBudgetItemKey && sourceBudgetItemKey !== budgetItemKey) {
    throw new Error(
      `${sourceName}のbudget_item_keyが会計・款・項・目と` +
        `一致しません: ${sourceBudgetItemKey} != ${budgetItemKey}`,
    );
  }

  return {
    budget_item_key: budgetItemKey,
    fiscal_year: rowFiscalYear,
    account_code: account.account_code,
    account_name: accountName,
    budget_side: budgetSide,
    kan_code: kanCode,
    kan_name: normalizeText(row.kan_name, `${sourceName}.kan_name`),
    kou_code: kouCode,
    kou_name: normalizeText(row.kou_name, `${sourceName}.kou_name`),
    moku_code: mokuCode,
    moku_name: normalizeText(row.moku_name, `${sourceName}.moku_name`),
    setsu_code: setsuCode,
    setsu_name: normalizeText(row.setsu_name, `${sourceName}.setsu_name`),
    amount_thousand_yen: parseThousandYenAmount(
      row.amount_thousand_yen,
      `${sourceName}.amount_thousand_yen`,
    ),
    budget_book_page: parsePositiveInteger(
      row.budget_book_page,
      `${sourceName}.budget_book_page`,
    ),
    pdf_page: parsePositiveInteger(
      row.pdf_page,
      `${sourceName}.pdf_page`,
    ),
    source_file: normalizeText(sourceFile, `${sourceName}.source_file`),
    source_type: "official_pdf",
  };
}

function normalizeExistingGeneralSections(
  sourceRows: BudgetSectionSourceRow[],
  config: BudgetAccountsConfig,
): BudgetSectionWithoutId[] {
  const account = findGeneralAccount(config);
  const generalRows = sourceRows.filter(
    (row) =>
      row.account_code?.trim() === account.account_code ||
      row.account_name?.trim() === account.account_name,
  );
  if (generalRows.length === 0) {
    throw new Error("既存budget_sections.csvに一般会計行がありません。");
  }

  return generalRows.map((row) =>
    normalizeSectionCore(
      row,
      account,
      config.fiscal_year,
      "既存budget_sections.csv",
      row.source_file,
    ),
  );
}

function normalizeRawGeneralSections(
  sourceRows: BudgetSectionSourceRow[],
  config: BudgetAccountsConfig,
): BudgetSectionWithoutId[] {
  const account = findGeneralAccount(config);
  const invalidRows = sourceRows.filter(
    (row) => row.parse_status?.trim() !== "parsed",
  );
  if (invalidRows.length > 0) {
    throw new Error(
      `raw_pdf_sections.csvにparsed以外の行があります: ` +
        `${invalidRows.length}件`,
    );
  }

  return sourceRows.map((row) => {
    const normalized = normalizeSectionCore(
      {
        ...row,
        amount_thousand_yen: row.setsu_amount_thousand_yen,
      },
      account,
      config.fiscal_year,
      "raw_pdf_sections.csv",
      row.source_file,
    );

    if (
      account.pdf_page_start === null ||
      account.pdf_page_end === null ||
      normalized.pdf_page < account.pdf_page_start ||
      normalized.pdf_page > account.pdf_page_end
    ) {
      throw new Error(
        `${account.account_code}のpdf_pageが設定範囲外です: ` +
          normalized.pdf_page,
      );
    }
    if (
      account.pdf_budget_book_start_page === null ||
      account.pdf_budget_book_end_page === null ||
      normalized.budget_book_page <
        account.pdf_budget_book_start_page ||
      normalized.budget_book_page > account.pdf_budget_book_end_page
    ) {
      throw new Error(
        `${account.account_code}のbudget_book_pageが設定範囲外です: ` +
          normalized.budget_book_page,
      );
    }
    return normalized;
  });
}

function normalizeSpecialSections(
  sourceRows: BudgetSectionSourceRow[],
  config: BudgetAccountsConfig,
): BudgetSectionWithoutId[] {
  const specialAccounts = config.accounts.filter(
    (account) => account.account_type === "special" && account.status === "active",
  );
  const accountsByCode = new Map(
    specialAccounts.map((account) => [account.account_code, account]),
  );
  const invalidRows = sourceRows.filter(
    (row) => row.parse_status?.trim() !== "matched",
  );
  if (invalidRows.length > 0) {
    throw new Error(
      `raw_pdf_sections_special.csvにmatched以外の行があります: ` +
        `${invalidRows.length}件`,
    );
  }

  const normalizedRows = sourceRows.map((row) => {
    const accountCode = normalizeText(
      row.account_code,
      "raw_pdf_sections_special.csv.account_code",
    );
    const account = accountsByCode.get(accountCode);
    if (!account) {
      throw new Error(
        `PDF節抽出対象外または未定義のaccount_codeです: ${accountCode}`,
      );
    }
    const normalized = normalizeSectionCore(
      row,
      account,
      config.fiscal_year,
      "raw_pdf_sections_special.csv",
      DEFAULT_BUDGET_BOOK_SOURCE_FILE,
    );

    if (
      account.pdf_page_start === null ||
      account.pdf_page_end === null ||
      normalized.pdf_page < account.pdf_page_start ||
      normalized.pdf_page > account.pdf_page_end
    ) {
      throw new Error(
        `${accountCode}のpdf_pageが設定範囲外です: ` +
          normalized.pdf_page,
      );
    }
    if (
      account.pdf_budget_book_start_page === null ||
      account.pdf_budget_book_end_page === null ||
      normalized.budget_book_page < account.pdf_budget_book_start_page ||
      normalized.budget_book_page > account.pdf_budget_book_end_page
    ) {
      throw new Error(
        `${accountCode}のbudget_book_pageが設定範囲外です: ` +
          normalized.budget_book_page,
      );
    }
    return normalized;
  });

  const accountCodesWithRows = new Set(
    normalizedRows.map((row) => row.account_code),
  );
  const missingAccounts = specialAccounts.filter(
    (account) => !accountCodesWithRows.has(account.account_code),
  );
  if (missingAccounts.length > 0) {
    throw new Error(
      `raw_pdf_sections_special.csvにactive特別会計の行がありません: ` +
        missingAccounts.map((account) => account.account_code).join(", "),
    );
  }

  return normalizedRows;
}

function assignSectionIds(
  rows: BudgetSectionWithoutId[],
): BudgetSection[] {
  const baseIdTotals = new Map<string, number>();
  for (const row of rows) {
    const baseId = `bs_${row.budget_item_key}_${row.setsu_code}`;
    baseIdTotals.set(baseId, (baseIdTotals.get(baseId) ?? 0) + 1);
  }

  const occurrences = new Map<string, number>();
  return rows.map((row) => {
    const baseId = `bs_${row.budget_item_key}_${row.setsu_code}`;
    const occurrence = (occurrences.get(baseId) ?? 0) + 1;
    occurrences.set(baseId, occurrence);
    const sectionId =
      baseIdTotals.get(baseId) === 1
        ? baseId
        : `${baseId}_${String(occurrence).padStart(2, "0")}`;
    return {
      section_id: sectionId,
      ...row,
    };
  });
}

export function transformBudgetSections(
  existingRows: BudgetSectionSourceRow[],
  specialRows: BudgetSectionSourceRow[],
  config: BudgetAccountsConfig,
): BudgetSection[] {
  const generalSections = normalizeExistingGeneralSections(
    existingRows,
    config,
  );
  const specialSections = normalizeSpecialSections(specialRows, config);
  return assignSectionIds([...generalSections, ...specialSections]);
}

export function transformBudgetSectionsFromRaw(
  generalRows: BudgetSectionSourceRow[],
  specialRows: BudgetSectionSourceRow[],
  config: BudgetAccountsConfig,
): BudgetSection[] {
  const generalSections = normalizeRawGeneralSections(
    generalRows,
    config,
  );
  const specialSections = normalizeSpecialSections(specialRows, config);
  return assignSectionIds([...generalSections, ...specialSections]);
}

export function validateBudgetSections(
  sections: BudgetSection[],
  config: BudgetAccountsConfig,
  programBudgetItemKeys: ReadonlySet<string>,
): BudgetSectionValidation {
  if (sections.length === 0) {
    throw new Error("検証対象の節データがありません。");
  }

  const uniqueSectionIds = new Set(sections.map((row) => row.section_id));
  if (uniqueSectionIds.size !== sections.length) {
    throw new Error("section_idの一意性検証に失敗しました。");
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
  const expectedIds = assignSectionIds(
    sections.map(({ section_id: _sectionId, ...row }) => row),
  );

  let programKeyConsistencyCount = 0;
  for (let index = 0; index < sections.length; index += 1) {
    const row = sections[index];
    const account = accountsByCode.get(row.account_code);
    if (!account) {
      throw new Error(`設定にないaccount_codeです: ${row.account_code}`);
    }
    if (account.status !== "active") {
      throw new Error(
        `PDF節データにabolished_zero会計が含まれています: ` +
          row.account_code,
      );
    }
    if (
      row.fiscal_year !== config.fiscal_year ||
      row.account_name !== account.account_name ||
      row.budget_side !== account.budget_side
    ) {
      throw new Error(
        `会計メタデータが設定と一致しません: ${row.section_id}`,
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
    if (row.section_id !== expectedIds[index].section_id) {
      throw new Error(
        `section_idが指定形式ではありません: ` +
          `${row.section_id} != ${expectedIds[index].section_id}`,
      );
    }
    if (!programBudgetItemKeys.has(row.budget_item_key)) {
      throw new Error(
        `budget_programs.csvにbudget_item_keyがありません: ` +
          row.budget_item_key,
      );
    }
    if (row.source_type !== "official_pdf") {
      throw new Error(`source_typeが不正です: ${row.section_id}`);
    }
    programKeyConsistencyCount += 1;

    if (!Number.isSafeInteger(row.amount_thousand_yen)) {
      throw new Error(
        `amount_thousand_yenが整数ではありません: ${row.section_id}`,
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
    if (
      account.status === "abolished_zero" &&
      accountRowCounts[account.account_code] !== 0
    ) {
      throw new Error(
        `${account.account_code}にPDF由来ではない補完行があります。`,
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
    rowCount: sections.length,
    uniqueSectionIdCount: uniqueSectionIds.size,
    uniqueBudgetItemKeyCount: new Set(
      sections.map((row) => row.budget_item_key),
    ).size,
    budgetItemKeyConsistencyCount: sections.length,
    programBudgetItemKeyConsistencyCount: programKeyConsistencyCount,
    accountRowCounts,
    accountAmountTotalsThousandYen: accountTotals,
    expectedAccountAmountTotalsThousandYen: expectedAccountTotals,
    amountTotalThousandYen: amountTotal,
    expectedAmountTotalThousandYen: expectedAmountTotal,
  };
}

export function validateGeneralSectionRegression(
  existingRows: BudgetSectionSourceRow[],
  sections: BudgetSection[],
  expectedRowCount = EXPECTED_GENERAL_SECTION_ROW_COUNT,
): GeneralSectionRegression {
  const existingGeneralRows = existingRows.filter(
    (row) =>
      row.account_code?.trim() === TARGET_ACCOUNT_CODE ||
      row.account_name?.trim() === TARGET_ACCOUNT_NAME,
  );
  const newGeneralRows = sections.filter(
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

export function validateBudgetSectionLegacyRegression(
  existingCsvText: string,
  sections: BudgetSection[],
): BudgetSectionLegacyRegression {
  const existingRows = parse(existingCsvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;
  if (existingRows.length === 0) {
    throw new Error("既存budget_sections.csvにデータ行がありません。");
  }
  const existingColumns = Object.keys(existingRows[0]).slice(
    0,
    BUDGET_SECTION_LEGACY_COLUMNS.length,
  );
  if (
    existingColumns.join(",") !== BUDGET_SECTION_LEGACY_COLUMNS.join(",")
  ) {
    throw new Error(
      "既存budget_sections.csvの先頭18列が基準スキーマと一致しません。",
    );
  }
  if (existingRows.length !== sections.length) {
    throw new Error(
      `budget_sections.csvの行数が更新前と一致しません: ` +
        `${sections.length} != ${existingRows.length}`,
    );
  }

  for (let index = 0; index < sections.length; index += 1) {
    const existing = existingRows[index];
    const current = sections[index] as unknown as Record<
      string,
      string | number
    >;
    for (const column of BUDGET_SECTION_LEGACY_COLUMNS) {
      const existingValue = existing[column] ?? "";
      const currentValue = String(current[column]);
      if (existingValue !== currentValue) {
        throw new Error(
          `budget_sections.csvの既存値が変わりました: ` +
            `row=${index + 1}, column=${column}, ` +
            `${currentValue} != ${existingValue}`,
        );
      }
    }
  }

  return {
    rowCount: sections.length,
    comparedColumnCount: BUDGET_SECTION_LEGACY_COLUMNS.length,
  };
}

export function validateGeneralRawSectionRegression(
  rawRows: BudgetSectionSourceRow[],
  sections: BudgetSection[],
  expectedRowCount = EXPECTED_GENERAL_SECTION_ROW_COUNT,
): GeneralSectionRegression {
  const regressionRows = rawRows.map((row) => {
    const fiscalYear = parsePositiveInteger(
      row.fiscal_year,
      "raw_pdf_sections.csv.fiscal_year",
    );
    const accountName = normalizeText(
      row.account_name,
      "raw_pdf_sections.csv.account_name",
    );
    const budgetSide = normalizeText(
      row.budget_side,
      "raw_pdf_sections.csv.budget_side",
    );
    const kanCode = normalizeHierarchyCode(
      row.kan_code,
      "raw_pdf_sections.csv.kan_code",
    );
    const kouCode = normalizeHierarchyCode(
      row.kou_code,
      "raw_pdf_sections.csv.kou_code",
    );
    const mokuCode = normalizeHierarchyCode(
      row.moku_code,
      "raw_pdf_sections.csv.moku_code",
    );

    return {
      ...row,
      account_code: TARGET_ACCOUNT_CODE,
      budget_item_key: buildBudgetItemKey({
        fiscalYear,
        accountCode: TARGET_ACCOUNT_CODE,
        accountName,
        budgetSide,
        kanCode,
        kouCode,
        mokuCode,
      }),
      amount_thousand_yen: row.setsu_amount_thousand_yen,
    };
  });

  return validateGeneralSectionRegression(
    regressionRows,
    sections,
    expectedRowCount,
  );
}

export function serializeBudgetSections(sections: BudgetSection[]): string {
  return stringify(sections, {
    columns: [...BUDGET_SECTION_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}
