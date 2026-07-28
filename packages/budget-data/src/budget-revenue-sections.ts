import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { parseThousandYenAmount } from "./budget-programs";
import {
  BUDGET_REVENUE_DETAIL_COLUMNS,
  type BudgetRevenueDetail,
  type FundingNature,
} from "./budget-revenue-details";

export const EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT = 650;

export const BUDGET_REVENUE_SECTION_VALIDATION_STATUSES = [
  "ok",
  "ok_zero_amount",
  "error_amount_mismatch",
] as const;

export type BudgetRevenueSectionValidationStatus =
  (typeof BUDGET_REVENUE_SECTION_VALIDATION_STATUSES)[number];

export const BUDGET_REVENUE_SECTION_COLUMNS = [
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
  "previous_amount_thousand_yen",
  "current_amount_thousand_yen",
  "diff_amount_thousand_yen",
  "allocated_amount_thousand_yen",
  "unallocated_amount_thousand_yen",
  "general_revenue_thousand_yen",
  "specific_revenue_thousand_yen",
  "special_account_revenue_thousand_yen",
  "detail_count",
  "validation_status",
  "source_type",
] as const;

const SOURCE_DETAIL_FIELDS = [
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
  "funding_nature",
  "previous_amount_thousand_yen",
  "current_amount_thousand_yen",
  "allocated_amount_thousand_yen",
  "unallocated_amount_thousand_yen",
] as const;

const SECTION_METADATA_FIELDS = [
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
] as const;

export type BudgetRevenueSectionSourceDetail = Pick<
  BudgetRevenueDetail,
  (typeof SOURCE_DETAIL_FIELDS)[number]
>;

export interface BudgetRevenueSection {
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
  previous_amount_thousand_yen: number;
  current_amount_thousand_yen: number;
  diff_amount_thousand_yen: number;
  allocated_amount_thousand_yen: number;
  unallocated_amount_thousand_yen: number;
  general_revenue_thousand_yen: number;
  specific_revenue_thousand_yen: number;
  special_account_revenue_thousand_yen: number;
  detail_count: number;
  validation_status: BudgetRevenueSectionValidationStatus;
  source_type: "derived";
}

export interface BudgetRevenueSectionValidation {
  rowCount: number;
  uniqueRevenueSectionIdCount: number;
  sourceDetailRowCount: number;
  detailCountTotal: number;
  detailCountMatchedCount: number;
  detailsCurrentAmountTotalThousandYen: number;
  sectionsCurrentAmountTotalThousandYen: number;
  accountSectionCounts: Record<string, number>;
  accountCurrentAmountTotalsThousandYen: Record<string, number>;
  generalRevenueTotalThousandYen: number;
  specificRevenueTotalThousandYen: number;
  specialAccountRevenueTotalThousandYen: number;
  statusCounts: Record<BudgetRevenueSectionValidationStatus, number>;
  errorStatusCount: number;
  isPass: boolean;
}

export interface SerializedBudgetRevenueSectionValidation {
  rowCount: number;
  columnCount: number;
}

function requiredText(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName}が空です。`);
  }
  return value;
}

function parsePositiveInteger(value: string, fieldName: string): number {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${fieldName}が正の整数ではありません: ${value}`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName}が正の整数ではありません: ${value}`);
  }
  return parsed;
}

function parseFundingNature(
  value: string,
  fieldName: string,
): FundingNature {
  if (
    value !== "general" &&
    value !== "specific" &&
    value !== "special_account"
  ) {
    throw new Error(`${fieldName}が不正です: ${value}`);
  }
  return value;
}

function assertTwoDigitCode(value: string, fieldName: string): string {
  if (!/^\d{2}$/.test(value)) {
    throw new Error(`${fieldName}が2桁コードではありません: ${value}`);
  }
  return value;
}

function parseSourceDetailRow(
  row: Record<string, string>,
  rowNumber: number,
): BudgetRevenueSectionSourceDetail {
  const prefix = `budget_revenue_details.csv row ${rowNumber}`;
  const fiscalYear = parsePositiveInteger(
    row.fiscal_year,
    `${prefix}.fiscal_year`,
  );
  const accountCode = requiredText(
    row.account_code,
    `${prefix}.account_code`,
  );
  if (!/^[a-z][a-z0-9_]*$/.test(accountCode)) {
    throw new Error(`${prefix}.account_codeが不正です: ${accountCode}`);
  }
  if (row.budget_side !== "revenue") {
    throw new Error(
      `${prefix}.budget_sideがrevenueではありません: ` +
        row.budget_side,
    );
  }
  if (row.source_type !== "official_csv") {
    throw new Error(
      `${prefix}.source_typeがofficial_csvではありません: ` +
        row.source_type,
    );
  }

  return {
    revenue_detail_id: requiredText(
      row.revenue_detail_id,
      `${prefix}.revenue_detail_id`,
    ),
    revenue_section_id: requiredText(
      row.revenue_section_id,
      `${prefix}.revenue_section_id`,
    ),
    revenue_item_key: requiredText(
      row.revenue_item_key,
      `${prefix}.revenue_item_key`,
    ),
    fiscal_year: fiscalYear,
    account_code: accountCode,
    account_name: requiredText(
      row.account_name,
      `${prefix}.account_name`,
    ),
    budget_side: "revenue",
    kan_code: assertTwoDigitCode(
      row.kan_code,
      `${prefix}.kan_code`,
    ),
    kan_name: requiredText(row.kan_name, `${prefix}.kan_name`),
    kou_code: assertTwoDigitCode(
      row.kou_code,
      `${prefix}.kou_code`,
    ),
    kou_name: requiredText(row.kou_name, `${prefix}.kou_name`),
    moku_code: assertTwoDigitCode(
      row.moku_code,
      `${prefix}.moku_code`,
    ),
    moku_name: requiredText(row.moku_name, `${prefix}.moku_name`),
    setsu_code: assertTwoDigitCode(
      row.setsu_code,
      `${prefix}.setsu_code`,
    ),
    setsu_name: requiredText(
      row.setsu_name,
      `${prefix}.setsu_name`,
    ),
    funding_nature: parseFundingNature(
      row.funding_nature,
      `${prefix}.funding_nature`,
    ),
    previous_amount_thousand_yen: parseThousandYenAmount(
      row.previous_amount_thousand_yen,
      `${prefix}.previous_amount_thousand_yen`,
    ),
    current_amount_thousand_yen: parseThousandYenAmount(
      row.current_amount_thousand_yen,
      `${prefix}.current_amount_thousand_yen`,
    ),
    allocated_amount_thousand_yen: parseThousandYenAmount(
      row.allocated_amount_thousand_yen,
      `${prefix}.allocated_amount_thousand_yen`,
    ),
    unallocated_amount_thousand_yen: parseThousandYenAmount(
      row.unallocated_amount_thousand_yen,
      `${prefix}.unallocated_amount_thousand_yen`,
    ),
  };
}

export function parseBudgetRevenueDetailRows(
  csvText: string,
): BudgetRevenueSectionSourceDetail[] {
  const rows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;

  if (rows.length === 0) {
    throw new Error("budget_revenue_details.csvにデータ行がありません。");
  }
  const sourceColumns = Object.keys(rows[0]);
  if (
    sourceColumns.join(",") !== BUDGET_REVENUE_DETAIL_COLUMNS.join(",")
  ) {
    throw new Error(
      "budget_revenue_details.csvの36列スキーマが一致しません。",
    );
  }

  return rows.map((row, index) => parseSourceDetailRow(row, index + 1));
}

function assertSafeSum(
  current: number,
  added: number,
  fieldName: string,
  revenueSectionId: string,
): number {
  const total = current + added;
  if (!Number.isSafeInteger(total)) {
    throw new Error(
      `${fieldName}の集計額が安全な整数範囲を超えました: ` +
        revenueSectionId,
    );
  }
  return total;
}

function sumAmount(
  details: BudgetRevenueSectionSourceDetail[],
  field:
    | "previous_amount_thousand_yen"
    | "current_amount_thousand_yen"
    | "allocated_amount_thousand_yen"
    | "unallocated_amount_thousand_yen",
  revenueSectionId: string,
): number {
  return details.reduce(
    (total, detail) =>
      assertSafeSum(total, detail[field], field, revenueSectionId),
    0,
  );
}

function determineValidationStatus(
  currentAmount: number,
  allocatedAmount: number,
  unallocatedAmount: number,
): BudgetRevenueSectionValidationStatus {
  if (
    currentAmount === 0 &&
    allocatedAmount === 0 &&
    unallocatedAmount === 0
  ) {
    return "ok_zero_amount";
  }
  if (
    currentAmount > 0 &&
    currentAmount === allocatedAmount + unallocatedAmount
  ) {
    return "ok";
  }
  return "error_amount_mismatch";
}

function assertGroupMetadata(
  revenueSectionId: string,
  details: BudgetRevenueSectionSourceDetail[],
): void {
  const first = details[0];
  for (const detail of details.slice(1)) {
    for (const field of SECTION_METADATA_FIELDS) {
      if (detail[field] !== first[field]) {
        throw new Error(
          `同一revenue_section_id内で${field}が一致しません: ` +
            revenueSectionId,
        );
      }
    }
  }

  const expectedItemKey =
    `${first.fiscal_year}_${first.account_code}_revenue_` +
    `${first.kan_code}_${first.kou_code}_${first.moku_code}`;
  const expectedSectionId =
    `rs_${expectedItemKey}_${first.setsu_code}`;
  if (
    first.revenue_item_key !== expectedItemKey ||
    revenueSectionId !== expectedSectionId
  ) {
    throw new Error(
      `歳入節IDと会計・款・項・目・節コードが一致しません: ` +
        revenueSectionId,
    );
  }
}

function buildRevenueSection(
  revenueSectionId: string,
  details: BudgetRevenueSectionSourceDetail[],
): BudgetRevenueSection {
  if (details.length === 0) {
    throw new Error(`集計元明細がない歳入節です: ${revenueSectionId}`);
  }
  assertGroupMetadata(revenueSectionId, details);
  const first = details[0];
  const previousAmount = sumAmount(
    details,
    "previous_amount_thousand_yen",
    revenueSectionId,
  );
  const currentAmount = sumAmount(
    details,
    "current_amount_thousand_yen",
    revenueSectionId,
  );
  const allocatedAmount = sumAmount(
    details,
    "allocated_amount_thousand_yen",
    revenueSectionId,
  );
  const unallocatedAmount = sumAmount(
    details,
    "unallocated_amount_thousand_yen",
    revenueSectionId,
  );

  let generalRevenue = 0;
  let specificRevenue = 0;
  let specialAccountRevenue = 0;
  if (first.account_code === "general") {
    const invalid = details.find(
      (detail) => detail.funding_nature === "special_account",
    );
    if (invalid) {
      throw new Error(
        `一般会計にspecial_accountの財源分類があります: ` +
          invalid.revenue_detail_id,
      );
    }
    for (const detail of details) {
      if (detail.funding_nature === "general") {
        generalRevenue = assertSafeSum(
          generalRevenue,
          detail.current_amount_thousand_yen,
          "general_revenue_thousand_yen",
          revenueSectionId,
        );
      } else {
        specificRevenue = assertSafeSum(
          specificRevenue,
          detail.current_amount_thousand_yen,
          "specific_revenue_thousand_yen",
          revenueSectionId,
        );
      }
    }
  } else {
    const invalid = details.find(
      (detail) => detail.funding_nature !== "special_account",
    );
    if (invalid) {
      throw new Error(
        `特別会計にspecial_account以外の財源分類があります: ` +
          invalid.revenue_detail_id,
      );
    }
    specialAccountRevenue = currentAmount;
  }

  return {
    revenue_section_id: revenueSectionId,
    revenue_item_key: first.revenue_item_key,
    fiscal_year: first.fiscal_year,
    account_code: first.account_code,
    account_name: first.account_name,
    budget_side: "revenue",
    kan_code: first.kan_code,
    kan_name: first.kan_name,
    kou_code: first.kou_code,
    kou_name: first.kou_name,
    moku_code: first.moku_code,
    moku_name: first.moku_name,
    setsu_code: first.setsu_code,
    setsu_name: first.setsu_name,
    previous_amount_thousand_yen: previousAmount,
    current_amount_thousand_yen: currentAmount,
    diff_amount_thousand_yen: currentAmount - previousAmount,
    allocated_amount_thousand_yen: allocatedAmount,
    unallocated_amount_thousand_yen: unallocatedAmount,
    general_revenue_thousand_yen: generalRevenue,
    specific_revenue_thousand_yen: specificRevenue,
    special_account_revenue_thousand_yen: specialAccountRevenue,
    detail_count: details.length,
    validation_status: determineValidationStatus(
      currentAmount,
      allocatedAmount,
      unallocatedAmount,
    ),
    source_type: "derived",
  };
}

export function transformBudgetRevenueSections(
  details: BudgetRevenueSectionSourceDetail[],
): BudgetRevenueSection[] {
  if (details.length === 0) {
    throw new Error("集約対象の歳入明細がありません。");
  }

  const detailIds = new Set<string>();
  const groups = new Map<string, BudgetRevenueSectionSourceDetail[]>();
  for (const detail of details) {
    if (detailIds.has(detail.revenue_detail_id)) {
      throw new Error(
        `revenue_detail_idが重複しています: ` +
          detail.revenue_detail_id,
      );
    }
    detailIds.add(detail.revenue_detail_id);
    const group = groups.get(detail.revenue_section_id) ?? [];
    group.push(detail);
    groups.set(detail.revenue_section_id, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([revenueSectionId, group]) =>
      buildRevenueSection(revenueSectionId, group),
    );
}

export function validateBudgetRevenueSections(
  sections: BudgetRevenueSection[],
  details: BudgetRevenueSectionSourceDetail[],
): BudgetRevenueSectionValidation {
  if (sections.length === 0) {
    throw new Error("検証対象の歳入節データがありません。");
  }

  const expectedSections = new Map(
    transformBudgetRevenueSections(details).map((section) => [
      section.revenue_section_id,
      section,
    ]),
  );
  const sectionIds = new Set<string>();
  const accountSectionCounts: Record<string, number> = {};
  const accountTotals: Record<string, number> = {};
  const statusCounts = Object.fromEntries(
    BUDGET_REVENUE_SECTION_VALIDATION_STATUSES.map((status) => [
      status,
      0,
    ]),
  ) as Record<BudgetRevenueSectionValidationStatus, number>;
  let detailCountTotal = 0;
  let detailCountMatchedCount = 0;
  let sectionsCurrentAmountTotal = 0;
  let generalRevenueTotal = 0;
  let specificRevenueTotal = 0;
  let specialAccountRevenueTotal = 0;

  for (const section of sections) {
    if (sectionIds.has(section.revenue_section_id)) {
      throw new Error(
        `revenue_section_idが重複しています: ` +
          section.revenue_section_id,
      );
    }
    sectionIds.add(section.revenue_section_id);
    const expected = expectedSections.get(section.revenue_section_id);
    if (!expected) {
      throw new Error(
        `入力明細に存在しないrevenue_section_idです: ` +
          section.revenue_section_id,
      );
    }

    const current = section as unknown as Record<
      string,
      string | number
    >;
    const expectedRecord = expected as unknown as Record<
      string,
      string | number
    >;
    for (const column of BUDGET_REVENUE_SECTION_COLUMNS) {
      if (String(current[column]) !== String(expectedRecord[column])) {
        throw new Error(
          `歳入節の集約値が明細と一致しません: ` +
            `${section.revenue_section_id}.${column}`,
        );
      }
    }

    detailCountTotal += section.detail_count;
    detailCountMatchedCount += 1;
    sectionsCurrentAmountTotal = assertSafeSum(
      sectionsCurrentAmountTotal,
      section.current_amount_thousand_yen,
      "sectionsCurrentAmountTotalThousandYen",
      section.revenue_section_id,
    );
    generalRevenueTotal = assertSafeSum(
      generalRevenueTotal,
      section.general_revenue_thousand_yen,
      "generalRevenueTotalThousandYen",
      section.revenue_section_id,
    );
    specificRevenueTotal = assertSafeSum(
      specificRevenueTotal,
      section.specific_revenue_thousand_yen,
      "specificRevenueTotalThousandYen",
      section.revenue_section_id,
    );
    specialAccountRevenueTotal = assertSafeSum(
      specialAccountRevenueTotal,
      section.special_account_revenue_thousand_yen,
      "specialAccountRevenueTotalThousandYen",
      section.revenue_section_id,
    );
    accountSectionCounts[section.account_code] =
      (accountSectionCounts[section.account_code] ?? 0) + 1;
    accountTotals[section.account_code] =
      (accountTotals[section.account_code] ?? 0) +
      section.current_amount_thousand_yen;
    statusCounts[section.validation_status] += 1;
  }

  if (sectionIds.size !== expectedSections.size) {
    throw new Error(
      `revenue_section_id集合が入力明細と一致しません: ` +
        `${sectionIds.size} != ${expectedSections.size}`,
    );
  }

  const detailsCurrentAmountTotal = details.reduce(
    (total, detail) =>
      assertSafeSum(
        total,
        detail.current_amount_thousand_yen,
        "detailsCurrentAmountTotalThousandYen",
        detail.revenue_section_id,
      ),
    0,
  );
  const errorStatusCount = statusCounts.error_amount_mismatch;

  return {
    rowCount: sections.length,
    uniqueRevenueSectionIdCount: sectionIds.size,
    sourceDetailRowCount: details.length,
    detailCountTotal,
    detailCountMatchedCount,
    detailsCurrentAmountTotalThousandYen: detailsCurrentAmountTotal,
    sectionsCurrentAmountTotalThousandYen: sectionsCurrentAmountTotal,
    accountSectionCounts,
    accountCurrentAmountTotalsThousandYen: accountTotals,
    generalRevenueTotalThousandYen: generalRevenueTotal,
    specificRevenueTotalThousandYen: specificRevenueTotal,
    specialAccountRevenueTotalThousandYen:
      specialAccountRevenueTotal,
    statusCounts,
    errorStatusCount,
    isPass:
      sections.length === expectedSections.size &&
      detailCountTotal === details.length &&
      detailCountMatchedCount === sections.length &&
      detailsCurrentAmountTotal === sectionsCurrentAmountTotal &&
      errorStatusCount === 0,
  };
}

export function serializeBudgetRevenueSections(
  sections: BudgetRevenueSection[],
): string {
  return stringify(sections, {
    columns: [...BUDGET_REVENUE_SECTION_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

export function validateSerializedBudgetRevenueSections(
  csvText: string,
  sections: BudgetRevenueSection[],
): SerializedBudgetRevenueSectionValidation {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length === 0) {
    throw new Error("一時出力したbudget_revenue_sections.csvが空です。");
  }
  if (
    records[0].join(",") !== BUDGET_REVENUE_SECTION_COLUMNS.join(",")
  ) {
    throw new Error(
      "一時出力したbudget_revenue_sections.csvの列が不正です。",
    );
  }
  if (records.length - 1 !== sections.length) {
    throw new Error(
      `一時出力したbudget_revenue_sections.csvの行数が不正です: ` +
        `${records.length - 1} != ${sections.length}`,
    );
  }

  for (let rowIndex = 0; rowIndex < sections.length; rowIndex += 1) {
    const current = sections[rowIndex] as unknown as Record<
      string,
      string | number
    >;
    const serialized = records[rowIndex + 1];
    for (
      let columnIndex = 0;
      columnIndex < BUDGET_REVENUE_SECTION_COLUMNS.length;
      columnIndex += 1
    ) {
      const column = BUDGET_REVENUE_SECTION_COLUMNS[columnIndex];
      if (serialized[columnIndex] !== String(current[column])) {
        throw new Error(
          `一時出力の再読込比較に失敗しました: ` +
            `row=${rowIndex + 1}, column=${column}`,
        );
      }
    }
  }

  return {
    rowCount: sections.length,
    columnCount: BUDGET_REVENUE_SECTION_COLUMNS.length,
  };
}
