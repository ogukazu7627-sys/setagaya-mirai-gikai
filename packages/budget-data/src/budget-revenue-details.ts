import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type {
  BudgetAccountDefinition,
  BudgetAccountsConfig,
} from "./budget-accounts";
import {
  normalizeHierarchyCode,
  parseThousandYenAmount,
} from "./budget-programs";

export const TARGET_REVENUE_FISCAL_YEAR = 2026;
export const TARGET_REVENUE_BUDGET_TYPE = "当初";
export const TARGET_REVENUE_BUDGET_SIDE = "revenue";
export const EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT = 2_192;
export const EXPECTED_REVENUE_ITEM_KEY_COUNT = 175;
export const EXPECTED_REVENUE_SECTION_ID_COUNT = 650;
export const EXPECTED_BUDGET_REVENUE_TOTAL = 621_033_664;
export const DEFAULT_BUDGET_REVENUE_SOURCE_FILE = "ippansainyu.csv";
export const SOURCE_BUDGET_REVENUE_ROW_NUMBER = Symbol(
  "sourceBudgetRevenueRowNumber",
);

export const BUDGET_REVENUE_DETAIL_COLUMNS = [
  "revenue_detail_id",
  "revenue_section_id",
  "revenue_item_key",
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
  "saisetsu_code",
  "saisetsu_name",
  "department_code",
  "department_name",
  "source_revenue_number",
  "source_revenue_number_name",
  "source_funding_category_code",
  "source_funding_category_name",
  "funding_nature",
  "previous_amount_thousand_yen",
  "requested_amount_thousand_yen",
  "estimated_amount_thousand_yen",
  "current_amount_thousand_yen",
  "allocated_amount_thousand_yen",
  "unallocated_amount_thousand_yen",
  "request_content",
  "assessment_content",
  "is_zero_amount",
  "source_type",
  "source_file",
  "source_row_number",
] as const;

const REQUIRED_SOURCE_COLUMNS = [
  "年度",
  "当初補正区分名称",
  "所属",
  "所属名称",
  "歳入番号",
  "歳入番号名称",
  "会計名称",
  "款",
  "款名称",
  "項",
  "項名称",
  "目",
  "目名称",
  "節",
  "節名称",
  "細節",
  "細節名称",
  "予算前額",
  "予算要求額",
  "予算見積額",
  "現計予算額",
  "現計充当額",
  "現計未充当額",
  "財源区分",
  "財源区分名称",
  "要求内容",
  "査定内容",
] as const;

export type FundingNature = "general" | "specific" | "special_account";

export type SourceBudgetRevenueRow = Record<string, string> & {
  [SOURCE_BUDGET_REVENUE_ROW_NUMBER]?: number;
};

export interface BudgetRevenueDetail {
  revenue_detail_id: string;
  revenue_section_id: string;
  revenue_item_key: string;
  fiscal_year: number;
  account_code: string;
  account_name: string;
  budget_side: "revenue";
  kan_code: string;
  kan_name: string;
  kou_code: string;
  kou_name: string;
  moku_code: string;
  moku_name: string;
  setsu_code: string;
  setsu_name: string;
  saisetsu_code: string;
  saisetsu_name: string;
  department_code: string;
  department_name: string;
  source_revenue_number: string;
  source_revenue_number_name: string;
  source_funding_category_code: string;
  source_funding_category_name: string;
  funding_nature: FundingNature;
  previous_amount_thousand_yen: number;
  requested_amount_thousand_yen: number;
  estimated_amount_thousand_yen: number;
  current_amount_thousand_yen: number;
  allocated_amount_thousand_yen: number;
  unallocated_amount_thousand_yen: number;
  request_content: string;
  assessment_content: string;
  is_zero_amount: boolean;
  source_type: "official_csv";
  source_file: string;
  source_row_number: number;
}

export interface BudgetRevenueDetailValidation {
  rowCount: number;
  uniqueRevenueDetailIdCount: number;
  uniqueRevenueItemKeyCount: number;
  uniqueRevenueSectionIdCount: number;
  balancedRowCount: number;
  zeroAmountCount: number;
  zeroFlagConsistentCount: number;
  keyConsistencyCount: number;
  accountRowCounts: Record<string, number>;
  accountCurrentAmountTotalsThousandYen: Record<string, number>;
  expectedAccountCurrentAmountTotalsThousandYen: Record<string, number>;
  currentAmountTotalThousandYen: number;
  expectedCurrentAmountTotalThousandYen: number;
}

export interface BudgetRevenueSourceTraceability {
  rowCount: number;
  recoveredSourceRowCount: number;
  comparedColumnCount: number;
}

export interface SerializedBudgetRevenueDetailValidation {
  rowCount: number;
  columnCount: number;
}

function requiredSourceText(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName}が空です。`);
  }
  return value;
}

function optionalSourceText(value: string | undefined): string {
  return value ?? "";
}

function buildRevenueItemKey(
  fiscalYear: number,
  accountCode: string,
  kanCode: string,
  kouCode: string,
  mokuCode: string,
): string {
  if (fiscalYear !== TARGET_REVENUE_FISCAL_YEAR) {
    throw new Error(`対象外の年度です: ${fiscalYear}`);
  }
  if (!/^[a-z][a-z0-9_]*$/.test(accountCode)) {
    throw new Error(`account_codeが不正です: ${accountCode}`);
  }

  return (
    `${fiscalYear}_${accountCode}_${TARGET_REVENUE_BUDGET_SIDE}_` +
    `${normalizeHierarchyCode(kanCode, "款")}_` +
    `${normalizeHierarchyCode(kouCode, "項")}_` +
    normalizeHierarchyCode(mokuCode, "目")
  );
}

function classifyFundingNature(
  account: BudgetAccountDefinition,
  sourceFundingCategoryName: string,
): FundingNature {
  if (account.account_type !== "general") {
    return "special_account";
  }
  return sourceFundingCategoryName.trim() === "一般財源"
    ? "general"
    : "specific";
}

function buildBudgetRevenueDetail(
  row: SourceBudgetRevenueRow,
  fiscalYear: number,
  account: BudgetAccountDefinition,
  sourceFile: string,
  sourceRowNumber: number,
): BudgetRevenueDetail {
  const kanCode = normalizeHierarchyCode(row["款"], "款");
  const kouCode = normalizeHierarchyCode(row["項"], "項");
  const mokuCode = normalizeHierarchyCode(row["目"], "目");
  const setsuCode = normalizeHierarchyCode(row["節"], "節");
  const saisetsuCode = normalizeHierarchyCode(row["細節"], "細節");
  const departmentCode = requiredSourceText(row["所属"], "所属");
  const revenueItemKey = buildRevenueItemKey(
    fiscalYear,
    account.account_code,
    kanCode,
    kouCode,
    mokuCode,
  );
  const revenueSectionId = `rs_${revenueItemKey}_${setsuCode}`;
  const sourceFundingCategoryName = requiredSourceText(
    row["財源区分名称"],
    "財源区分名称",
  );
  const currentAmount = parseThousandYenAmount(
    row["現計予算額"],
    "現計予算額",
  );

  return {
    revenue_detail_id:
      `rd_${revenueItemKey}_${setsuCode}_${saisetsuCode}_` +
      departmentCode,
    revenue_section_id: revenueSectionId,
    revenue_item_key: revenueItemKey,
    fiscal_year: fiscalYear,
    account_code: account.account_code,
    account_name: account.account_name,
    budget_side: TARGET_REVENUE_BUDGET_SIDE,
    kan_code: kanCode,
    kan_name: requiredSourceText(row["款名称"], "款名称"),
    kou_code: kouCode,
    kou_name: requiredSourceText(row["項名称"], "項名称"),
    moku_code: mokuCode,
    moku_name: requiredSourceText(row["目名称"], "目名称"),
    setsu_code: setsuCode,
    setsu_name: requiredSourceText(row["節名称"], "節名称"),
    saisetsu_code: saisetsuCode,
    saisetsu_name: requiredSourceText(row["細節名称"], "細節名称"),
    department_code: departmentCode,
    department_name: requiredSourceText(row["所属名称"], "所属名称"),
    source_revenue_number: requiredSourceText(
      row["歳入番号"],
      "歳入番号",
    ),
    source_revenue_number_name: requiredSourceText(
      row["歳入番号名称"],
      "歳入番号名称",
    ),
    source_funding_category_code: requiredSourceText(
      row["財源区分"],
      "財源区分",
    ),
    source_funding_category_name: sourceFundingCategoryName,
    funding_nature: classifyFundingNature(
      account,
      sourceFundingCategoryName,
    ),
    previous_amount_thousand_yen: parseThousandYenAmount(
      row["予算前額"],
      "予算前額",
    ),
    requested_amount_thousand_yen: parseThousandYenAmount(
      row["予算要求額"],
      "予算要求額",
    ),
    estimated_amount_thousand_yen: parseThousandYenAmount(
      row["予算見積額"],
      "予算見積額",
    ),
    current_amount_thousand_yen: currentAmount,
    allocated_amount_thousand_yen: parseThousandYenAmount(
      row["現計充当額"],
      "現計充当額",
    ),
    unallocated_amount_thousand_yen: parseThousandYenAmount(
      row["現計未充当額"],
      "現計未充当額",
    ),
    request_content: optionalSourceText(row["要求内容"]),
    assessment_content: optionalSourceText(row["査定内容"]),
    is_zero_amount: currentAmount === 0,
    source_type: "official_csv",
    source_file: requiredSourceText(sourceFile, "source_file"),
    source_row_number: sourceRowNumber,
  };
}

export function parseSourceBudgetRevenueRows(
  csvText: string,
): SourceBudgetRevenueRow[] {
  const rows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;

  if (rows.length === 0) {
    throw new Error("入力歳入CSVにデータ行がありません。");
  }

  const sourceColumns = new Set(Object.keys(rows[0]));
  const missingColumns = REQUIRED_SOURCE_COLUMNS.filter(
    (column) => !sourceColumns.has(column),
  );
  if (missingColumns.length > 0) {
    throw new Error(
      `入力歳入CSVに必要な列がありません: ${missingColumns.join(", ")}`,
    );
  }

  return rows.map((row, index) => {
    Object.defineProperty(row, SOURCE_BUDGET_REVENUE_ROW_NUMBER, {
      configurable: false,
      enumerable: false,
      value: index + 1,
      writable: false,
    });
    return row as SourceBudgetRevenueRow;
  });
}

export function transformBudgetRevenueDetails(
  sourceRows: SourceBudgetRevenueRow[],
  config: BudgetAccountsConfig,
  sourceFile = DEFAULT_BUDGET_REVENUE_SOURCE_FILE,
): BudgetRevenueDetail[] {
  if (config.fiscal_year !== TARGET_REVENUE_FISCAL_YEAR) {
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
      sourceRowNumber:
        row[SOURCE_BUDGET_REVENUE_ROW_NUMBER] ?? index + 1,
    }))
    .filter(
      ({ row }) =>
        row["年度"]?.trim() === String(config.fiscal_year) &&
        row["当初補正区分名称"]?.trim() ===
          TARGET_REVENUE_BUDGET_TYPE &&
        accountsByCsvName.has(row["会計名称"]?.trim()),
    );
  if (targetRows.length === 0) {
    throw new Error("設定対象の2026年度・当初歳入行がありません。");
  }

  const targetAccountNames = new Set(
    targetRows.map(({ row }) => row["会計名称"].trim()),
  );
  const missingAccounts = config.accounts.filter(
    (account) => !targetAccountNames.has(account.csv_account_name),
  );
  if (missingAccounts.length > 0) {
    throw new Error(
      `入力歳入CSVに設定会計の行がありません: ` +
        missingAccounts
          .map((account) => account.csv_account_name)
          .join(", "),
    );
  }

  const details = targetRows.map(({ row, sourceRowNumber }) => {
    const account = accountsByCsvName.get(row["会計名称"].trim());
    if (!account) {
      throw new Error(`未定義の会計です: ${row["会計名称"]}`);
    }
    return buildBudgetRevenueDetail(
      row,
      config.fiscal_year,
      account,
      sourceFile,
      sourceRowNumber,
    );
  });

  const detailIdGroups = new Map<string, BudgetRevenueDetail[]>();
  for (const detail of details) {
    const group = detailIdGroups.get(detail.revenue_detail_id) ?? [];
    group.push(detail);
    detailIdGroups.set(detail.revenue_detail_id, group);
  }
  const collisions = [...detailIdGroups.entries()].filter(
    ([, group]) => group.length > 1,
  );
  if (collisions.length > 0) {
    const examples = collisions
      .slice(0, 5)
      .map(
        ([id, group]) =>
          `${id} ` +
          `(source rows: ${group
            .map((detail) => detail.source_row_number)
            .join("/")}; revenue numbers: ${group
            .map((detail) => detail.source_revenue_number)
            .join("/")})`,
      )
      .join(", ");
    throw new Error(
      `revenue_detail_idが衝突しました。` +
        `source_revenue_numberをID末尾へ追加する要否の確認が必要です: ` +
        examples,
    );
  }

  return details.sort((left, right) =>
    left.revenue_detail_id.localeCompare(right.revenue_detail_id),
  );
}

function expectedFundingNature(
  account: BudgetAccountDefinition,
  fundingCategoryName: string,
): FundingNature {
  return classifyFundingNature(account, fundingCategoryName);
}

export function validateBudgetRevenueDetails(
  details: BudgetRevenueDetail[],
  config: BudgetAccountsConfig,
): BudgetRevenueDetailValidation {
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
  const detailIds = new Set<string>();
  const itemKeys = new Set<string>();
  const sectionIds = new Set<string>();
  const sourceRowNumbers = new Set<number>();
  let balancedRowCount = 0;
  let zeroFlagConsistentCount = 0;
  let keyConsistencyCount = 0;

  for (const detail of details) {
    const account = accountsByCode.get(detail.account_code);
    if (!account) {
      throw new Error(
        `設定にないaccount_codeです: ${detail.account_code}`,
      );
    }
    if (
      detail.fiscal_year !== config.fiscal_year ||
      detail.account_name !== account.account_name ||
      detail.budget_side !== TARGET_REVENUE_BUDGET_SIDE
    ) {
      throw new Error(
        `会計メタデータが設定と一致しません: ` +
          detail.revenue_detail_id,
      );
    }

    const expectedItemKey = buildRevenueItemKey(
      detail.fiscal_year,
      detail.account_code,
      detail.kan_code,
      detail.kou_code,
      detail.moku_code,
    );
    const expectedSectionId =
      `rs_${expectedItemKey}_${detail.setsu_code}`;
    const expectedDetailId =
      `rd_${expectedItemKey}_${detail.setsu_code}_` +
      `${detail.saisetsu_code}_${detail.department_code}`;
    if (
      detail.revenue_item_key !== expectedItemKey ||
      detail.revenue_section_id !== expectedSectionId ||
      detail.revenue_detail_id !== expectedDetailId
    ) {
      throw new Error(
        `歳入IDと階層コードが一致しません: ${detail.revenue_detail_id}`,
      );
    }
    keyConsistencyCount += 1;

    if (detailIds.has(detail.revenue_detail_id)) {
      throw new Error(
        `revenue_detail_idが重複しています: ` +
          detail.revenue_detail_id,
      );
    }
    detailIds.add(detail.revenue_detail_id);
    itemKeys.add(detail.revenue_item_key);
    sectionIds.add(detail.revenue_section_id);

    if (
      !Number.isSafeInteger(detail.source_row_number) ||
      detail.source_row_number <= 0 ||
      sourceRowNumbers.has(detail.source_row_number)
    ) {
      throw new Error(
        `source_row_numberが不正です: ${detail.revenue_detail_id}`,
      );
    }
    sourceRowNumbers.add(detail.source_row_number);
    if (
      detail.source_type !== "official_csv" ||
      detail.source_file.trim().length === 0
    ) {
      throw new Error(
        `出典メタデータが不正です: ${detail.revenue_detail_id}`,
      );
    }

    const amounts = [
      detail.previous_amount_thousand_yen,
      detail.requested_amount_thousand_yen,
      detail.estimated_amount_thousand_yen,
      detail.current_amount_thousand_yen,
      detail.allocated_amount_thousand_yen,
      detail.unallocated_amount_thousand_yen,
    ];
    if (amounts.some((amount) => !Number.isSafeInteger(amount))) {
      throw new Error(
        `整数でない金額があります: ${detail.revenue_detail_id}`,
      );
    }
    if (
      detail.current_amount_thousand_yen !==
      detail.allocated_amount_thousand_yen +
        detail.unallocated_amount_thousand_yen
    ) {
      throw new Error(
        `現計予算額と充当・未充当額が一致しません: ` +
          `${detail.revenue_detail_id} ` +
          `${detail.current_amount_thousand_yen} != ` +
          `${detail.allocated_amount_thousand_yen} + ` +
          detail.unallocated_amount_thousand_yen,
      );
    }
    balancedRowCount += 1;

    if (
      detail.is_zero_amount !==
      (detail.current_amount_thousand_yen === 0)
    ) {
      throw new Error(
        `is_zero_amountが不正です: ${detail.revenue_detail_id}`,
      );
    }
    zeroFlagConsistentCount += 1;

    if (
      detail.funding_nature !==
      expectedFundingNature(
        account,
        detail.source_funding_category_name,
      )
    ) {
      throw new Error(
        `funding_natureが不正です: ${detail.revenue_detail_id}`,
      );
    }

    accountRowCounts[detail.account_code] += 1;
    accountTotals[detail.account_code] +=
      detail.current_amount_thousand_yen;
  }

  for (const account of config.accounts) {
    const actual = accountTotals[account.account_code];
    if (actual !== account.expected_amount_thousand_yen) {
      throw new Error(
        `${account.account_code}のcurrent_amount_thousand_yen合計が` +
          `一致しません: ${actual} != ` +
          account.expected_amount_thousand_yen,
      );
    }
  }

  const currentAmountTotal = Object.values(accountTotals).reduce(
    (total, amount) => total + amount,
    0,
  );
  const expectedCurrentAmountTotal = config.accounts.reduce(
    (total, account) => total + account.expected_amount_thousand_yen,
    0,
  );
  if (currentAmountTotal !== expectedCurrentAmountTotal) {
    throw new Error(
      `全会計のcurrent_amount_thousand_yen合計が一致しません: ` +
        `${currentAmountTotal} != ${expectedCurrentAmountTotal}`,
    );
  }

  return {
    rowCount: details.length,
    uniqueRevenueDetailIdCount: detailIds.size,
    uniqueRevenueItemKeyCount: itemKeys.size,
    uniqueRevenueSectionIdCount: sectionIds.size,
    balancedRowCount,
    zeroAmountCount: details.filter((detail) => detail.is_zero_amount)
      .length,
    zeroFlagConsistentCount,
    keyConsistencyCount,
    accountRowCounts,
    accountCurrentAmountTotalsThousandYen: accountTotals,
    expectedAccountCurrentAmountTotalsThousandYen:
      expectedAccountTotals,
    currentAmountTotalThousandYen: currentAmountTotal,
    expectedCurrentAmountTotalThousandYen: expectedCurrentAmountTotal,
  };
}

export function validateBudgetRevenueSourceTraceability(
  details: BudgetRevenueDetail[],
  sourceRows: SourceBudgetRevenueRow[],
  config: BudgetAccountsConfig,
  sourceFile = DEFAULT_BUDGET_REVENUE_SOURCE_FILE,
): BudgetRevenueSourceTraceability {
  const accountsByCsvName = new Map(
    config.accounts.map((account) => [
      account.csv_account_name,
      account,
    ]),
  );
  const recoveredSourceRows = new Set<number>();

  for (const detail of details) {
    const sourceRow = sourceRows[detail.source_row_number - 1];
    if (!sourceRow) {
      throw new Error(
        `source_row_numberから元歳入CSV行を復元できません: ` +
          detail.revenue_detail_id,
      );
    }
    const account = accountsByCsvName.get(
      sourceRow["会計名称"]?.trim(),
    );
    if (!account) {
      throw new Error(
        `復元元歳入CSV行の会計が設定外です: ` +
          detail.revenue_detail_id,
      );
    }
    if (
      sourceRow["年度"]?.trim() !== String(config.fiscal_year) ||
      sourceRow["当初補正区分名称"]?.trim() !==
        TARGET_REVENUE_BUDGET_TYPE
    ) {
      throw new Error(
        `復元元歳入CSV行が対象年度・当初ではありません: ` +
          detail.revenue_detail_id,
      );
    }

    const recovered = buildBudgetRevenueDetail(
      sourceRow,
      config.fiscal_year,
      account,
      sourceFile,
      detail.source_row_number,
    ) as unknown as Record<string, string | number | boolean>;
    const current = detail as unknown as Record<
      string,
      string | number | boolean
    >;
    for (const column of BUDGET_REVENUE_DETAIL_COLUMNS) {
      if (String(recovered[column]) !== String(current[column])) {
        throw new Error(
          `元歳入CSV行から出力列を復元できません: ` +
            `${detail.revenue_detail_id}.${column}`,
        );
      }
    }
    recoveredSourceRows.add(detail.source_row_number);
  }

  return {
    rowCount: details.length,
    recoveredSourceRowCount: recoveredSourceRows.size,
    comparedColumnCount: BUDGET_REVENUE_DETAIL_COLUMNS.length,
  };
}

export function serializeBudgetRevenueDetails(
  details: BudgetRevenueDetail[],
): string {
  return stringify(
    details.map((detail) => ({
      ...detail,
      is_zero_amount: String(detail.is_zero_amount),
    })),
    {
      columns: [...BUDGET_REVENUE_DETAIL_COLUMNS],
      header: true,
      record_delimiter: "unix",
    },
  );
}

export function validateSerializedBudgetRevenueDetails(
  csvText: string,
  details: BudgetRevenueDetail[],
): SerializedBudgetRevenueDetailValidation {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length === 0) {
    throw new Error("一時出力したbudget_revenue_details.csvが空です。");
  }
  if (
    records[0].join(",") !== BUDGET_REVENUE_DETAIL_COLUMNS.join(",")
  ) {
    throw new Error(
      "一時出力したbudget_revenue_details.csvの列が不正です。",
    );
  }
  if (records.length - 1 !== details.length) {
    throw new Error(
      `一時出力したbudget_revenue_details.csvの行数が不正です: ` +
        `${records.length - 1} != ${details.length}`,
    );
  }

  for (let rowIndex = 0; rowIndex < details.length; rowIndex += 1) {
    const current = details[rowIndex] as unknown as Record<
      string,
      string | number | boolean
    >;
    const serialized = records[rowIndex + 1];
    for (
      let columnIndex = 0;
      columnIndex < BUDGET_REVENUE_DETAIL_COLUMNS.length;
      columnIndex += 1
    ) {
      const column = BUDGET_REVENUE_DETAIL_COLUMNS[columnIndex];
      if (serialized[columnIndex] !== String(current[column])) {
        throw new Error(
          `一時出力の再読込比較に失敗しました: ` +
            `row=${rowIndex + 1}, column=${column}`,
        );
      }
    }
  }

  return {
    rowCount: details.length,
    columnCount: BUDGET_REVENUE_DETAIL_COLUMNS.length,
  };
}
