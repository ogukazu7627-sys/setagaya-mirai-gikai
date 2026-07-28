import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { BudgetAccountsConfig } from "./budget-accounts";
import { parseThousandYenAmount } from "./budget-programs";
import {
  BUDGET_REVENUE_DETAIL_COLUMNS,
  EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
  EXPECTED_BUDGET_REVENUE_TOTAL,
  transformBudgetRevenueDetails,
  type BudgetRevenueDetail,
  type SourceBudgetRevenueRow,
} from "./budget-revenue-details";
import {
  BUDGET_REVENUE_ITEM_COLUMNS,
  BUDGET_REVENUE_ITEM_VALIDATION_STATUSES,
  EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT,
  parseBudgetRevenueSectionRows,
  transformBudgetRevenueItems,
  type BudgetRevenueItem,
  type BudgetRevenueItemValidationStatus,
} from "./budget-revenue-items";
import {
  BUDGET_REVENUE_SECTION_COLUMNS,
  BUDGET_REVENUE_SECTION_VALIDATION_STATUSES,
  EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
  parseBudgetRevenueDetailRows,
  transformBudgetRevenueSections,
  type BudgetRevenueSection,
  type BudgetRevenueSectionSourceDetail,
  type BudgetRevenueSectionValidationStatus,
} from "./budget-revenue-sections";

export const EXPECTED_GENERAL_REVENUE_TOTAL = 279_402_113;
export const EXPECTED_SPECIFIC_REVENUE_TOTAL = 151_950_897;
export const EXPECTED_SCHOOL_LUNCH_DETAIL_COUNT = 4;

export const REVENUE_VALIDATION_ERROR_COLUMNS = [
  "error_id",
  "error_type",
  "severity",
  "account_code",
  "revenue_item_key",
  "revenue_section_id",
  "revenue_detail_id",
  "source_file",
  "source_row_number",
  "message",
  "expected_amount_thousand_yen",
  "actual_amount_thousand_yen",
  "diff_amount_thousand_yen",
] as const;

const DETAIL_TO_ITEM_COLUMNS = [
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
  "previous_amount_thousand_yen",
  "current_amount_thousand_yen",
  "diff_amount_thousand_yen",
  "allocated_amount_thousand_yen",
  "unallocated_amount_thousand_yen",
  "general_revenue_thousand_yen",
  "specific_revenue_thousand_yen",
  "special_account_revenue_thousand_yen",
  "detail_count",
  "source_type",
] as const;

const AGGREGATE_AMOUNT_COLUMNS = [
  "previous_amount_thousand_yen",
  "current_amount_thousand_yen",
  "allocated_amount_thousand_yen",
  "unallocated_amount_thousand_yen",
  "general_revenue_thousand_yen",
  "specific_revenue_thousand_yen",
  "special_account_revenue_thousand_yen",
] as const;

export interface RevenueValidationError {
  error_id: string;
  error_type: string;
  severity: "error";
  account_code: string;
  revenue_item_key: string;
  revenue_section_id: string;
  revenue_detail_id: string;
  source_file: string;
  source_row_number: number | "";
  message: string;
  expected_amount_thousand_yen: number | "";
  actual_amount_thousand_yen: number | "";
  diff_amount_thousand_yen: number | "";
}

type RevenueValidationErrorDraft = Omit<
  RevenueValidationError,
  "error_id"
>;

export interface RevenueValidationInputs {
  rawSourceRows: SourceBudgetRevenueRow[];
  rawSourceFile: string;
  details: BudgetRevenueDetail[];
  sections: BudgetRevenueSection[];
  items: BudgetRevenueItem[];
}

export interface RevenueAccountValidationSummary {
  accountCode: string;
  accountName: string;
  expectedAmountThousandYen: number;
  detailRowCount: number;
  detailAmountThousandYen: number;
  sectionRowCount: number;
  sectionAmountThousandYen: number;
  itemRowCount: number;
  itemAmountThousandYen: number;
  isPass: boolean;
}

export interface BudgetRevenueValidationResult {
  rowCounts: {
    details: number;
    sections: number;
    items: number;
  };
  uniqueIdCounts: {
    revenueDetailId: number;
    revenueSectionId: number;
    revenueItemKey: number;
  };
  totals: {
    details: number;
    sections: number;
    items: number;
    configuredExpected: number;
    expected: number;
  };
  generalFundingTotals: {
    detailsGeneral: number;
    detailsSpecific: number;
    sectionsGeneral: number;
    sectionsSpecific: number;
    itemsGeneral: number;
    itemsSpecific: number;
  };
  statusCounts: {
    sections: Record<string, number>;
    items: Record<string, number>;
    errorTotal: number;
  };
  sourceTraceability: {
    expectedSourceRows: number;
    referencedSourceRows: number;
    uniqueReferencedSourceRows: number;
    recoveredSourceRows: number;
    fullyMatchedSourceRows: number;
    missingSourceRows: number;
    duplicateSourceRowReferences: number;
  };
  aggregationChecks: {
    detailsToSectionsMismatchCount: number;
    detailsToItemsMismatchCount: number;
    sectionsToItemsMismatchCount: number;
  };
  schoolLunch: {
    detailRowCount: number;
    nonZeroDetailRowCount: number;
  };
  accountSummaries: RevenueAccountValidationSummary[];
  errors: RevenueValidationError[];
  isPass: boolean;
}

export interface RevenueValidationReportFiles {
  raw: string;
  details: string;
  sections: string;
  items: string;
  config: string;
  errors: string;
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

function parseNonNegativeInteger(
  value: string,
  fieldName: string,
): number {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${fieldName}が非負整数ではありません: ${value}`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName}が非負整数ではありません: ${value}`);
  }
  return parsed;
}

function parseBoolean(value: string, fieldName: string): boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${fieldName}がbooleanではありません: ${value}`);
}

function assertTwoDigitCode(value: string, fieldName: string): string {
  if (!/^\d{2}$/.test(value)) {
    throw new Error(`${fieldName}が2桁コードではありません: ${value}`);
  }
  return value;
}

export function parseRevenueValidationDetails(
  csvText: string,
): BudgetRevenueDetail[] {
  const rawRows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;
  const sourceDetails = parseBudgetRevenueDetailRows(csvText);

  if (rawRows.length !== sourceDetails.length) {
    throw new Error("budget_revenue_details.csvの解析行数が不一致です。");
  }

  return rawRows.map((row, index) => {
    const source = sourceDetails[index];
    const prefix = `budget_revenue_details.csv row ${index + 1}`;
    return {
      ...source,
      saisetsu_code: assertTwoDigitCode(
        row.saisetsu_code,
        `${prefix}.saisetsu_code`,
      ),
      saisetsu_name: requiredText(
        row.saisetsu_name,
        `${prefix}.saisetsu_name`,
      ),
      department_code: requiredText(
        row.department_code,
        `${prefix}.department_code`,
      ),
      department_name: requiredText(
        row.department_name,
        `${prefix}.department_name`,
      ),
      source_revenue_number: requiredText(
        row.source_revenue_number,
        `${prefix}.source_revenue_number`,
      ),
      source_revenue_number_name: requiredText(
        row.source_revenue_number_name,
        `${prefix}.source_revenue_number_name`,
      ),
      source_funding_category_code: requiredText(
        row.source_funding_category_code,
        `${prefix}.source_funding_category_code`,
      ),
      source_funding_category_name: requiredText(
        row.source_funding_category_name,
        `${prefix}.source_funding_category_name`,
      ),
      requested_amount_thousand_yen: parseThousandYenAmount(
        row.requested_amount_thousand_yen,
        `${prefix}.requested_amount_thousand_yen`,
      ),
      estimated_amount_thousand_yen: parseThousandYenAmount(
        row.estimated_amount_thousand_yen,
        `${prefix}.estimated_amount_thousand_yen`,
      ),
      request_content: row.request_content ?? "",
      assessment_content: row.assessment_content ?? "",
      is_zero_amount: parseBoolean(
        row.is_zero_amount,
        `${prefix}.is_zero_amount`,
      ),
      source_type: "official_csv",
      source_file: requiredText(
        row.source_file,
        `${prefix}.source_file`,
      ),
      source_row_number: parsePositiveInteger(
        row.source_row_number,
        `${prefix}.source_row_number`,
      ),
    };
  });
}

function parseItemValidationStatus(
  value: string,
  fieldName: string,
): BudgetRevenueItemValidationStatus {
  if (
    !BUDGET_REVENUE_ITEM_VALIDATION_STATUSES.includes(
      value as BudgetRevenueItemValidationStatus,
    )
  ) {
    throw new Error(`${fieldName}が不正です: ${value}`);
  }
  return value as BudgetRevenueItemValidationStatus;
}

export function parseRevenueValidationItems(
  csvText: string,
): BudgetRevenueItem[] {
  const rows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;
  if (rows.length === 0) {
    throw new Error("budget_revenue_items.csvにデータ行がありません。");
  }
  if (
    Object.keys(rows[0]).join(",") !==
    BUDGET_REVENUE_ITEM_COLUMNS.join(",")
  ) {
    throw new Error("budget_revenue_items.csvの23列スキーマが不正です。");
  }

  return rows.map((row, index) => {
    const prefix = `budget_revenue_items.csv row ${index + 1}`;
    if (row.budget_side !== "revenue" || row.source_type !== "derived") {
      throw new Error(`${prefix}のbudget_sideまたはsource_typeが不正です。`);
    }
    return {
      revenue_item_key: requiredText(
        row.revenue_item_key,
        `${prefix}.revenue_item_key`,
      ),
      fiscal_year: parsePositiveInteger(
        row.fiscal_year,
        `${prefix}.fiscal_year`,
      ),
      account_code: requiredText(
        row.account_code,
        `${prefix}.account_code`,
      ),
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
      previous_amount_thousand_yen: parseThousandYenAmount(
        row.previous_amount_thousand_yen,
        `${prefix}.previous_amount_thousand_yen`,
      ),
      current_amount_thousand_yen: parseThousandYenAmount(
        row.current_amount_thousand_yen,
        `${prefix}.current_amount_thousand_yen`,
      ),
      diff_amount_thousand_yen: parseThousandYenAmount(
        row.diff_amount_thousand_yen,
        `${prefix}.diff_amount_thousand_yen`,
      ),
      allocated_amount_thousand_yen: parseThousandYenAmount(
        row.allocated_amount_thousand_yen,
        `${prefix}.allocated_amount_thousand_yen`,
      ),
      unallocated_amount_thousand_yen: parseThousandYenAmount(
        row.unallocated_amount_thousand_yen,
        `${prefix}.unallocated_amount_thousand_yen`,
      ),
      general_revenue_thousand_yen: parseThousandYenAmount(
        row.general_revenue_thousand_yen,
        `${prefix}.general_revenue_thousand_yen`,
      ),
      specific_revenue_thousand_yen: parseThousandYenAmount(
        row.specific_revenue_thousand_yen,
        `${prefix}.specific_revenue_thousand_yen`,
      ),
      special_account_revenue_thousand_yen: parseThousandYenAmount(
        row.special_account_revenue_thousand_yen,
        `${prefix}.special_account_revenue_thousand_yen`,
      ),
      section_count: parseNonNegativeInteger(
        row.section_count,
        `${prefix}.section_count`,
      ),
      detail_count: parseNonNegativeInteger(
        row.detail_count,
        `${prefix}.detail_count`,
      ),
      validation_status: parseItemValidationStatus(
        row.validation_status,
        `${prefix}.validation_status`,
      ),
      source_type: "derived",
    };
  });
}

function errorDraft(
  errorType: string,
  message: string,
  context: Partial<RevenueValidationErrorDraft> = {},
): RevenueValidationErrorDraft {
  return {
    error_type: errorType,
    severity: "error",
    account_code: "",
    revenue_item_key: "",
    revenue_section_id: "",
    revenue_detail_id: "",
    source_file: "",
    source_row_number: "",
    message,
    expected_amount_thousand_yen: "",
    actual_amount_thousand_yen: "",
    diff_amount_thousand_yen: "",
    ...context,
  };
}

function amountMismatchDraft(
  errorType: string,
  message: string,
  expected: number,
  actual: number,
  context: Partial<RevenueValidationErrorDraft> = {},
): RevenueValidationErrorDraft {
  return errorDraft(errorType, message, {
    ...context,
    expected_amount_thousand_yen: expected,
    actual_amount_thousand_yen: actual,
    diff_amount_thousand_yen: expected - actual,
  });
}

function safeSum(
  values: number[],
  fieldName: string,
): number {
  return values.reduce((total, value) => {
    const next = total + value;
    if (!Number.isSafeInteger(next)) {
      throw new Error(`${fieldName}の合計が安全な整数範囲外です。`);
    }
    return next;
  }, 0);
}

function countUnique<T>(
  rows: T[],
  getValue: (row: T) => string,
): number {
  return new Set(rows.map(getValue)).size;
}

function addDuplicateErrors<T>(
  errors: RevenueValidationErrorDraft[],
  rows: T[],
  idName: string,
  sourceFile: string,
  getId: (row: T) => string,
  getContext: (row: T) => Partial<RevenueValidationErrorDraft>,
): void {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const id = getId(row);
    const group = groups.get(id) ?? [];
    group.push(row);
    groups.set(id, group);
  }
  for (const [id, group] of [...groups.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (group.length <= 1) {
      continue;
    }
    errors.push(
      errorDraft(
        `duplicate_${idName}`,
        `${sourceFile}の${idName}が${group.length}件重複しています: ${id}`,
        {
          source_file: sourceFile,
          ...getContext(group[0]),
        },
      ),
    );
  }
}

function expectedItemKey(row: {
  fiscal_year: number;
  account_code: string;
  kan_code: string;
  kou_code: string;
  moku_code: string;
}): string {
  return (
    `${row.fiscal_year}_${row.account_code}_revenue_` +
    `${row.kan_code}_${row.kou_code}_${row.moku_code}`
  );
}

function addKeyAndMetadataErrors(
  errors: RevenueValidationErrorDraft[],
  inputs: RevenueValidationInputs,
  config: BudgetAccountsConfig,
): void {
  const accounts = new Map(
    config.accounts.map((account) => [account.account_code, account]),
  );

  for (const detail of inputs.details) {
    const expectedItem = expectedItemKey(detail);
    const expectedSection = `rs_${expectedItem}_${detail.setsu_code}`;
    const expectedDetail =
      `rd_${expectedItem}_${detail.setsu_code}_` +
      `${detail.saisetsu_code}_${detail.department_code}`;
    if (
      detail.revenue_item_key !== expectedItem ||
      detail.revenue_section_id !== expectedSection ||
      detail.revenue_detail_id !== expectedDetail
    ) {
      errors.push(
        errorDraft(
          "invalid_revenue_key_format",
          "歳入明細のIDまたはキーが階層コードと一致しません。",
          {
            account_code: detail.account_code,
            revenue_item_key: detail.revenue_item_key,
            revenue_section_id: detail.revenue_section_id,
            revenue_detail_id: detail.revenue_detail_id,
            source_file: detail.source_file,
            source_row_number: detail.source_row_number,
          },
        ),
      );
    }
    const account = accounts.get(detail.account_code);
    if (
      !account ||
      account.account_name !== detail.account_name ||
      detail.fiscal_year !== config.fiscal_year ||
      detail.budget_side !== "revenue"
    ) {
      errors.push(
        errorDraft(
          "invalid_account_metadata",
          "歳入明細の年度・会計メタデータがconfigと一致しません。",
          {
            account_code: detail.account_code,
            revenue_item_key: detail.revenue_item_key,
            revenue_section_id: detail.revenue_section_id,
            revenue_detail_id: detail.revenue_detail_id,
            source_file: detail.source_file,
            source_row_number: detail.source_row_number,
          },
        ),
      );
    }
  }

  for (const section of inputs.sections) {
    const expectedItem = expectedItemKey(section);
    const expectedSection = `rs_${expectedItem}_${section.setsu_code}`;
    if (
      section.revenue_item_key !== expectedItem ||
      section.revenue_section_id !== expectedSection
    ) {
      errors.push(
        errorDraft(
          "invalid_revenue_key_format",
          "歳入節のIDまたはキーが階層コードと一致しません。",
          {
            account_code: section.account_code,
            revenue_item_key: section.revenue_item_key,
            revenue_section_id: section.revenue_section_id,
            source_file: "budget_revenue_sections.csv",
          },
        ),
      );
    }
    const account = accounts.get(section.account_code);
    if (
      !account ||
      account.account_name !== section.account_name ||
      section.fiscal_year !== config.fiscal_year ||
      section.budget_side !== "revenue"
    ) {
      errors.push(
        errorDraft(
          "invalid_account_metadata",
          "歳入節の年度・会計メタデータがconfigと一致しません。",
          {
            account_code: section.account_code,
            revenue_item_key: section.revenue_item_key,
            revenue_section_id: section.revenue_section_id,
            source_file: "budget_revenue_sections.csv",
          },
        ),
      );
    }
  }

  for (const item of inputs.items) {
    const expected = expectedItemKey(item);
    if (item.revenue_item_key !== expected) {
      errors.push(
        errorDraft(
          "invalid_revenue_key_format",
          "歳入目キーが階層コードと一致しません。",
          {
            account_code: item.account_code,
            revenue_item_key: item.revenue_item_key,
            source_file: "budget_revenue_items.csv",
          },
        ),
      );
    }
    const account = accounts.get(item.account_code);
    if (
      !account ||
      account.account_name !== item.account_name ||
      item.fiscal_year !== config.fiscal_year ||
      item.budget_side !== "revenue"
    ) {
      errors.push(
        errorDraft(
          "invalid_account_metadata",
          "歳入目の年度・会計メタデータがconfigと一致しません。",
          {
            account_code: item.account_code,
            revenue_item_key: item.revenue_item_key,
            source_file: "budget_revenue_items.csv",
          },
        ),
      );
    }
  }
}

function valuesDiffer(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  columns: readonly string[],
): string[] {
  return columns.filter(
    (column) => String(expected[column]) !== String(actual[column]),
  );
}

function addDetailsToSectionsErrors(
  errors: RevenueValidationErrorDraft[],
  details: BudgetRevenueDetail[],
  sections: BudgetRevenueSection[],
): number {
  let mismatchCount = 0;
  let expectedSections: BudgetRevenueSection[];
  try {
    expectedSections = transformBudgetRevenueSections(details);
  } catch (error: unknown) {
    errors.push(
      errorDraft(
        "details_to_sections_aggregation_failed",
        error instanceof Error ? error.message : String(error),
        { source_file: "budget_revenue_details.csv" },
      ),
    );
    return 1;
  }

  const actualById = new Map(
    sections.map((section) => [section.revenue_section_id, section]),
  );
  const expectedIds = new Set(
    expectedSections.map((section) => section.revenue_section_id),
  );
  for (const expected of expectedSections) {
    const actual = actualById.get(expected.revenue_section_id);
    if (!actual) {
      mismatchCount += 1;
      errors.push(
        amountMismatchDraft(
          "details_to_sections_missing",
          "detailsから算出した歳入節がsectionsにありません。",
          expected.current_amount_thousand_yen,
          0,
          {
            account_code: expected.account_code,
            revenue_item_key: expected.revenue_item_key,
            revenue_section_id: expected.revenue_section_id,
            source_file: "budget_revenue_sections.csv",
          },
        ),
      );
      continue;
    }
    const differing = valuesDiffer(
      expected as unknown as Record<string, unknown>,
      actual as unknown as Record<string, unknown>,
      BUDGET_REVENUE_SECTION_COLUMNS,
    );
    if (differing.length === 0) {
      continue;
    }
    mismatchCount += 1;
    errors.push(
      amountMismatchDraft(
        "details_to_sections_mismatch",
        `details集約とsectionsが一致しません: ${differing.join(", ")}`,
        expected.current_amount_thousand_yen,
        actual.current_amount_thousand_yen,
        {
          account_code: actual.account_code,
          revenue_item_key: actual.revenue_item_key,
          revenue_section_id: actual.revenue_section_id,
          source_file: "budget_revenue_sections.csv",
        },
      ),
    );
  }
  for (const actual of sections) {
    if (expectedIds.has(actual.revenue_section_id)) {
      continue;
    }
    mismatchCount += 1;
    errors.push(
      amountMismatchDraft(
        "details_to_sections_extra",
        "detailsに存在しない歳入節がsectionsにあります。",
        0,
        actual.current_amount_thousand_yen,
        {
          account_code: actual.account_code,
          revenue_item_key: actual.revenue_item_key,
          revenue_section_id: actual.revenue_section_id,
          source_file: "budget_revenue_sections.csv",
        },
      ),
    );
  }
  return mismatchCount;
}

interface SectionItemAggregate {
  accountCode: string;
  sectionCount: number;
  detailCount: number;
  amounts: Record<(typeof AGGREGATE_AMOUNT_COLUMNS)[number], number>;
}

function aggregateSectionsByItem(
  sections: BudgetRevenueSection[],
): Map<string, SectionItemAggregate> {
  const aggregates = new Map<string, SectionItemAggregate>();
  for (const section of sections) {
    let aggregate = aggregates.get(section.revenue_item_key);
    if (!aggregate) {
      aggregate = {
        accountCode: section.account_code,
        sectionCount: 0,
        detailCount: 0,
        amounts: {
          previous_amount_thousand_yen: 0,
          current_amount_thousand_yen: 0,
          allocated_amount_thousand_yen: 0,
          unallocated_amount_thousand_yen: 0,
          general_revenue_thousand_yen: 0,
          specific_revenue_thousand_yen: 0,
          special_account_revenue_thousand_yen: 0,
        },
      };
      aggregates.set(section.revenue_item_key, aggregate);
    }
    for (const column of AGGREGATE_AMOUNT_COLUMNS) {
      aggregate.amounts[column] += section[column];
    }
    aggregate.sectionCount += 1;
    aggregate.detailCount += section.detail_count;
  }
  return aggregates;
}

function addDetailsToItemsErrors(
  errors: RevenueValidationErrorDraft[],
  details: BudgetRevenueDetail[],
  sections: BudgetRevenueSection[],
  items: BudgetRevenueItem[],
): number {
  let mismatchCount = 0;
  let expectedItems: BudgetRevenueItem[];
  try {
    expectedItems = transformBudgetRevenueItems(details, sections);
  } catch (error: unknown) {
    errors.push(
      errorDraft(
        "details_to_items_aggregation_failed",
        error instanceof Error ? error.message : String(error),
        { source_file: "budget_revenue_details.csv" },
      ),
    );
    return 1;
  }
  const actualByKey = new Map(
    items.map((item) => [item.revenue_item_key, item]),
  );
  const expectedKeys = new Set(
    expectedItems.map((item) => item.revenue_item_key),
  );
  for (const expected of expectedItems) {
    const actual = actualByKey.get(expected.revenue_item_key);
    if (!actual) {
      mismatchCount += 1;
      errors.push(
        amountMismatchDraft(
          "details_to_items_missing",
          "detailsから算出した歳入目がitemsにありません。",
          expected.current_amount_thousand_yen,
          0,
          {
            account_code: expected.account_code,
            revenue_item_key: expected.revenue_item_key,
            source_file: "budget_revenue_items.csv",
          },
        ),
      );
      continue;
    }
    const differing = valuesDiffer(
      expected as unknown as Record<string, unknown>,
      actual as unknown as Record<string, unknown>,
      DETAIL_TO_ITEM_COLUMNS,
    );
    if (differing.length === 0) {
      continue;
    }
    mismatchCount += 1;
    errors.push(
      amountMismatchDraft(
        "details_to_items_mismatch",
        `details集約とitemsが一致しません: ${differing.join(", ")}`,
        expected.current_amount_thousand_yen,
        actual.current_amount_thousand_yen,
        {
          account_code: actual.account_code,
          revenue_item_key: actual.revenue_item_key,
          source_file: "budget_revenue_items.csv",
        },
      ),
    );
  }
  for (const actual of items) {
    if (expectedKeys.has(actual.revenue_item_key)) {
      continue;
    }
    mismatchCount += 1;
    errors.push(
      amountMismatchDraft(
        "details_to_items_extra",
        "detailsに存在しない歳入目がitemsにあります。",
        0,
        actual.current_amount_thousand_yen,
        {
          account_code: actual.account_code,
          revenue_item_key: actual.revenue_item_key,
          source_file: "budget_revenue_items.csv",
        },
      ),
    );
  }
  return mismatchCount;
}

function addSectionsToItemsErrors(
  errors: RevenueValidationErrorDraft[],
  sections: BudgetRevenueSection[],
  items: BudgetRevenueItem[],
): number {
  let mismatchCount = 0;
  const sectionAggregates = aggregateSectionsByItem(sections);
  const itemByKey = new Map(
    items.map((item) => [item.revenue_item_key, item]),
  );
  for (const [key, expected] of sectionAggregates) {
    const actual = itemByKey.get(key);
    if (!actual) {
      mismatchCount += 1;
      errors.push(
        amountMismatchDraft(
          "sections_to_items_missing",
          "sectionsから算出した歳入目がitemsにありません。",
          expected.amounts.current_amount_thousand_yen,
          0,
          {
            account_code: expected.accountCode,
            revenue_item_key: key,
            source_file: "budget_revenue_items.csv",
          },
        ),
      );
      continue;
    }
    const differing = AGGREGATE_AMOUNT_COLUMNS.filter(
      (column) => expected.amounts[column] !== actual[column],
    );
    if (expected.sectionCount !== actual.section_count) {
      differing.push("section_count" as never);
    }
    if (expected.detailCount !== actual.detail_count) {
      differing.push("detail_count" as never);
    }
    if (differing.length === 0) {
      continue;
    }
    mismatchCount += 1;
    errors.push(
      amountMismatchDraft(
        "sections_to_items_mismatch",
        `sections集約とitemsが一致しません: ${differing.join(", ")}`,
        expected.amounts.current_amount_thousand_yen,
        actual.current_amount_thousand_yen,
        {
          account_code: actual.account_code,
          revenue_item_key: actual.revenue_item_key,
          source_file: "budget_revenue_items.csv",
        },
      ),
    );
  }
  return mismatchCount;
}

function sumByAccount<T>(
  rows: T[],
  config: BudgetAccountsConfig,
  getAccountCode: (row: T) => string,
  getAmount: (row: T) => number,
): Record<string, number> {
  const totals = Object.fromEntries(
    config.accounts.map((account) => [account.account_code, 0]),
  ) as Record<string, number>;
  for (const row of rows) {
    const accountCode = getAccountCode(row);
    if (accountCode in totals) {
      totals[accountCode] += getAmount(row);
    }
  }
  return totals;
}

function countByAccount<T>(
  rows: T[],
  config: BudgetAccountsConfig,
  getAccountCode: (row: T) => string,
): Record<string, number> {
  const counts = Object.fromEntries(
    config.accounts.map((account) => [account.account_code, 0]),
  ) as Record<string, number>;
  for (const row of rows) {
    const accountCode = getAccountCode(row);
    if (accountCode in counts) {
      counts[accountCode] += 1;
    }
  }
  return counts;
}

function addSourceTraceabilityErrors(
  errors: RevenueValidationErrorDraft[],
  inputs: RevenueValidationInputs,
  config: BudgetAccountsConfig,
): BudgetRevenueValidationResult["sourceTraceability"] {
  let expectedDetails: BudgetRevenueDetail[];
  try {
    expectedDetails = transformBudgetRevenueDetails(
      inputs.rawSourceRows,
      config,
      inputs.rawSourceFile,
    );
  } catch (error: unknown) {
    errors.push(
      errorDraft(
        "raw_source_transformation_failed",
        error instanceof Error ? error.message : String(error),
        { source_file: inputs.rawSourceFile },
      ),
    );
    return {
      expectedSourceRows: 0,
      referencedSourceRows: inputs.details.length,
      uniqueReferencedSourceRows: 0,
      recoveredSourceRows: 0,
      fullyMatchedSourceRows: 0,
      missingSourceRows: 0,
      duplicateSourceRowReferences: 0,
    };
  }

  const expectedBySourceRow = new Map(
    expectedDetails.map((detail) => [detail.source_row_number, detail]),
  );
  const actualGroups = new Map<number, BudgetRevenueDetail[]>();
  for (const detail of inputs.details) {
    const group = actualGroups.get(detail.source_row_number) ?? [];
    group.push(detail);
    actualGroups.set(detail.source_row_number, group);
  }
  let duplicateReferences = 0;
  let recoveredSourceRows = 0;
  let fullyMatchedSourceRows = 0;
  for (const [sourceRowNumber, group] of actualGroups) {
    if (group.length > 1) {
      duplicateReferences += group.length - 1;
      errors.push(
        errorDraft(
          "duplicate_source_row_number",
          `source_row_number=${sourceRowNumber}が${group.length}件重複しています。`,
          {
            account_code: group[0].account_code,
            revenue_item_key: group[0].revenue_item_key,
            revenue_section_id: group[0].revenue_section_id,
            revenue_detail_id: group[0].revenue_detail_id,
            source_file: group[0].source_file,
            source_row_number: sourceRowNumber,
          },
        ),
      );
    }
    const expected = expectedBySourceRow.get(sourceRowNumber);
    if (!expected) {
      for (const actual of group) {
        errors.push(
          errorDraft(
            "unrecoverable_source_row_number",
            "source_row_numberから対象の公式CSV行を復元できません。",
            {
              account_code: actual.account_code,
              revenue_item_key: actual.revenue_item_key,
              revenue_section_id: actual.revenue_section_id,
              revenue_detail_id: actual.revenue_detail_id,
              source_file: actual.source_file,
              source_row_number: sourceRowNumber,
            },
          ),
        );
      }
      continue;
    }
    recoveredSourceRows += 1;
    const actual = group[0];
    const differing = valuesDiffer(
      expected as unknown as Record<string, unknown>,
      actual as unknown as Record<string, unknown>,
      BUDGET_REVENUE_DETAIL_COLUMNS,
    );
    if (differing.length === 0) {
      fullyMatchedSourceRows += 1;
      continue;
    }
    errors.push(
      amountMismatchDraft(
        "source_record_mismatch",
        `公式CSV元行の復元結果と一致しません: ${differing.join(", ")}`,
        expected.current_amount_thousand_yen,
        actual.current_amount_thousand_yen,
        {
          account_code: actual.account_code,
          revenue_item_key: actual.revenue_item_key,
          revenue_section_id: actual.revenue_section_id,
          revenue_detail_id: actual.revenue_detail_id,
          source_file: actual.source_file,
          source_row_number: sourceRowNumber,
        },
      ),
    );
  }

  let missingSourceRows = 0;
  for (const expected of expectedDetails) {
    if (actualGroups.has(expected.source_row_number)) {
      continue;
    }
    missingSourceRows += 1;
    errors.push(
      errorDraft(
        "missing_source_row_number",
        "公式CSVの対象行を参照する歳入明細がありません。",
        {
          account_code: expected.account_code,
          revenue_item_key: expected.revenue_item_key,
          revenue_section_id: expected.revenue_section_id,
          revenue_detail_id: expected.revenue_detail_id,
          source_file: expected.source_file,
          source_row_number: expected.source_row_number,
        },
      ),
    );
  }

  return {
    expectedSourceRows: expectedDetails.length,
    referencedSourceRows: inputs.details.length,
    uniqueReferencedSourceRows: actualGroups.size,
    recoveredSourceRows,
    fullyMatchedSourceRows,
    missingSourceRows,
    duplicateSourceRowReferences: duplicateReferences,
  };
}

function countStatuses<T>(
  rows: T[],
  statuses: readonly string[],
  getStatus: (row: T) => string,
): Record<string, number> {
  const counts = Object.fromEntries(
    statuses.map((status) => [status, 0]),
  ) as Record<string, number>;
  for (const row of rows) {
    const status = getStatus(row);
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

export function validateBudgetRevenueData(
  inputs: RevenueValidationInputs,
  config: BudgetAccountsConfig,
): BudgetRevenueValidationResult {
  const errors: RevenueValidationErrorDraft[] = [];

  const expectedRowCounts = [
    [
      "budget_revenue_details.csv",
      inputs.details.length,
      EXPECTED_BUDGET_REVENUE_DETAIL_ROW_COUNT,
    ],
    [
      "budget_revenue_sections.csv",
      inputs.sections.length,
      EXPECTED_BUDGET_REVENUE_SECTION_ROW_COUNT,
    ],
    [
      "budget_revenue_items.csv",
      inputs.items.length,
      EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT,
    ],
  ] as const;
  for (const [sourceFile, actual, expected] of expectedRowCounts) {
    if (actual !== expected) {
      errors.push(
        errorDraft(
          "row_count_mismatch",
          `${sourceFile}の行数が一致しません: ${actual} != ${expected}`,
          { source_file: sourceFile },
        ),
      );
    }
  }

  addDuplicateErrors(
    errors,
    inputs.details,
    "revenue_detail_id",
    "budget_revenue_details.csv",
    (row) => row.revenue_detail_id,
    (row) => ({
      account_code: row.account_code,
      revenue_item_key: row.revenue_item_key,
      revenue_section_id: row.revenue_section_id,
      revenue_detail_id: row.revenue_detail_id,
      source_row_number: row.source_row_number,
    }),
  );
  addDuplicateErrors(
    errors,
    inputs.sections,
    "revenue_section_id",
    "budget_revenue_sections.csv",
    (row) => row.revenue_section_id,
    (row) => ({
      account_code: row.account_code,
      revenue_item_key: row.revenue_item_key,
      revenue_section_id: row.revenue_section_id,
    }),
  );
  addDuplicateErrors(
    errors,
    inputs.items,
    "revenue_item_key",
    "budget_revenue_items.csv",
    (row) => row.revenue_item_key,
    (row) => ({
      account_code: row.account_code,
      revenue_item_key: row.revenue_item_key,
    }),
  );
  addKeyAndMetadataErrors(errors, inputs, config);

  for (const detail of inputs.details) {
    const expectedBalance =
      detail.allocated_amount_thousand_yen +
      detail.unallocated_amount_thousand_yen;
    if (detail.current_amount_thousand_yen !== expectedBalance) {
      errors.push(
        amountMismatchDraft(
          "detail_amount_mismatch",
          "歳入明細のcurrent_amountがallocated+unallocatedと一致しません。",
          expectedBalance,
          detail.current_amount_thousand_yen,
          {
            account_code: detail.account_code,
            revenue_item_key: detail.revenue_item_key,
            revenue_section_id: detail.revenue_section_id,
            revenue_detail_id: detail.revenue_detail_id,
            source_file: detail.source_file,
            source_row_number: detail.source_row_number,
          },
        ),
      );
    }
    if (
      detail.is_zero_amount !==
      (detail.current_amount_thousand_yen === 0)
    ) {
      errors.push(
        errorDraft(
          "zero_amount_flag_mismatch",
          "is_zero_amountがcurrent_amountと一致しません。",
          {
            account_code: detail.account_code,
            revenue_item_key: detail.revenue_item_key,
            revenue_section_id: detail.revenue_section_id,
            revenue_detail_id: detail.revenue_detail_id,
            source_file: detail.source_file,
            source_row_number: detail.source_row_number,
          },
        ),
      );
    }

    const expectedFunding =
      detail.account_code === "general"
        ? detail.source_funding_category_name === "一般財源"
          ? "general"
          : "specific"
        : "special_account";
    if (detail.funding_nature !== expectedFunding) {
      errors.push(
        errorDraft(
          "funding_nature_mismatch",
          `funding_natureが財源区分名称・会計ルールと一致しません: ` +
            `${detail.funding_nature} != ${expectedFunding}`,
          {
            account_code: detail.account_code,
            revenue_item_key: detail.revenue_item_key,
            revenue_section_id: detail.revenue_section_id,
            revenue_detail_id: detail.revenue_detail_id,
            source_file: detail.source_file,
            source_row_number: detail.source_row_number,
          },
        ),
      );
    }
  }

  const detailsToSectionsMismatchCount = addDetailsToSectionsErrors(
    errors,
    inputs.details,
    inputs.sections,
  );
  const detailsToItemsMismatchCount = addDetailsToItemsErrors(
    errors,
    inputs.details,
    inputs.sections,
    inputs.items,
  );
  const sectionsToItemsMismatchCount = addSectionsToItemsErrors(
    errors,
    inputs.sections,
    inputs.items,
  );

  const detailTotals = sumByAccount(
    inputs.details,
    config,
    (row) => row.account_code,
    (row) => row.current_amount_thousand_yen,
  );
  const sectionTotals = sumByAccount(
    inputs.sections,
    config,
    (row) => row.account_code,
    (row) => row.current_amount_thousand_yen,
  );
  const itemTotals = sumByAccount(
    inputs.items,
    config,
    (row) => row.account_code,
    (row) => row.current_amount_thousand_yen,
  );
  const detailCounts = countByAccount(
    inputs.details,
    config,
    (row) => row.account_code,
  );
  const sectionCounts = countByAccount(
    inputs.sections,
    config,
    (row) => row.account_code,
  );
  const itemCounts = countByAccount(
    inputs.items,
    config,
    (row) => row.account_code,
  );

  const accountSummaries = config.accounts.map((account) => {
    const expected =
      account.revenue?.expected_amount_thousand_yen ??
      account.expected_amount_thousand_yen;
    const details = detailTotals[account.account_code];
    const sections = sectionTotals[account.account_code];
    const items = itemTotals[account.account_code];
    for (const [sourceFile, actual] of [
      ["budget_revenue_details.csv", details],
      ["budget_revenue_sections.csv", sections],
      ["budget_revenue_items.csv", items],
    ] as const) {
      if (actual !== expected) {
        errors.push(
          amountMismatchDraft(
            "account_total_mismatch",
            `${sourceFile}の${account.account_code}合計がconfig期待値と一致しません。`,
            expected,
            actual,
            {
              account_code: account.account_code,
              source_file: sourceFile,
            },
          ),
        );
      }
    }
    return {
      accountCode: account.account_code,
      accountName: account.account_name,
      expectedAmountThousandYen: expected,
      detailRowCount: detailCounts[account.account_code],
      detailAmountThousandYen: details,
      sectionRowCount: sectionCounts[account.account_code],
      sectionAmountThousandYen: sections,
      itemRowCount: itemCounts[account.account_code],
      itemAmountThousandYen: items,
      isPass:
        details === expected &&
        sections === expected &&
        items === expected,
    };
  });

  const configuredExpected = safeSum(
    config.accounts.map(
      (account) =>
        account.revenue?.expected_amount_thousand_yen ??
        account.expected_amount_thousand_yen,
    ),
    "config expected",
  );
  const detailTotal = safeSum(
    inputs.details.map((row) => row.current_amount_thousand_yen),
    "details current",
  );
  const sectionTotal = safeSum(
    inputs.sections.map((row) => row.current_amount_thousand_yen),
    "sections current",
  );
  const itemTotal = safeSum(
    inputs.items.map((row) => row.current_amount_thousand_yen),
    "items current",
  );
  for (const [sourceFile, actual] of [
    ["config/budget-accounts.json", configuredExpected],
    ["budget_revenue_details.csv", detailTotal],
    ["budget_revenue_sections.csv", sectionTotal],
    ["budget_revenue_items.csv", itemTotal],
  ] as const) {
    if (actual !== EXPECTED_BUDGET_REVENUE_TOTAL) {
      errors.push(
        amountMismatchDraft(
          "overall_total_mismatch",
          `${sourceFile}の全会計合計が期待値と一致しません。`,
          EXPECTED_BUDGET_REVENUE_TOTAL,
          actual,
          { source_file: sourceFile },
        ),
      );
    }
  }

  const detailsGeneral = safeSum(
    inputs.details
      .filter(
        (row) =>
          row.account_code === "general" &&
          row.funding_nature === "general",
      )
      .map((row) => row.current_amount_thousand_yen),
    "details general revenue",
  );
  const detailsSpecific = safeSum(
    inputs.details
      .filter(
        (row) =>
          row.account_code === "general" &&
          row.funding_nature === "specific",
      )
      .map((row) => row.current_amount_thousand_yen),
    "details specific revenue",
  );
  const sectionsGeneral = safeSum(
    inputs.sections
      .filter((row) => row.account_code === "general")
      .map((row) => row.general_revenue_thousand_yen),
    "sections general revenue",
  );
  const sectionsSpecific = safeSum(
    inputs.sections
      .filter((row) => row.account_code === "general")
      .map((row) => row.specific_revenue_thousand_yen),
    "sections specific revenue",
  );
  const itemsGeneral = safeSum(
    inputs.items
      .filter((row) => row.account_code === "general")
      .map((row) => row.general_revenue_thousand_yen),
    "items general revenue",
  );
  const itemsSpecific = safeSum(
    inputs.items
      .filter((row) => row.account_code === "general")
      .map((row) => row.specific_revenue_thousand_yen),
    "items specific revenue",
  );
  for (const [label, sourceFile, actual, expected] of [
    [
      "一般会計の一般財源",
      "budget_revenue_details.csv",
      detailsGeneral,
      EXPECTED_GENERAL_REVENUE_TOTAL,
    ],
    [
      "一般会計の一般財源",
      "budget_revenue_sections.csv",
      sectionsGeneral,
      EXPECTED_GENERAL_REVENUE_TOTAL,
    ],
    [
      "一般会計の一般財源",
      "budget_revenue_items.csv",
      itemsGeneral,
      EXPECTED_GENERAL_REVENUE_TOTAL,
    ],
    [
      "一般会計の特定財源",
      "budget_revenue_details.csv",
      detailsSpecific,
      EXPECTED_SPECIFIC_REVENUE_TOTAL,
    ],
    [
      "一般会計の特定財源",
      "budget_revenue_sections.csv",
      sectionsSpecific,
      EXPECTED_SPECIFIC_REVENUE_TOTAL,
    ],
    [
      "一般会計の特定財源",
      "budget_revenue_items.csv",
      itemsSpecific,
      EXPECTED_SPECIFIC_REVENUE_TOTAL,
    ],
  ] as const) {
    if (actual !== expected) {
      errors.push(
        amountMismatchDraft(
          "general_funding_total_mismatch",
          `${sourceFile}の${label}が期待値と一致しません。`,
          expected,
          actual,
          {
            account_code: "general",
            source_file: sourceFile,
          },
        ),
      );
    }
  }

  const schoolLunchDetails = inputs.details.filter(
    (row) => row.account_code === "school_lunch_fee",
  );
  const nonZeroSchoolLunchDetails = schoolLunchDetails.filter(
    (row) => row.current_amount_thousand_yen !== 0,
  );
  if (
    schoolLunchDetails.length !== EXPECTED_SCHOOL_LUNCH_DETAIL_COUNT
  ) {
    errors.push(
      errorDraft(
        "school_lunch_row_count_mismatch",
        `学校給食費会計の明細行数が一致しません: ` +
          `${schoolLunchDetails.length} != ` +
          EXPECTED_SCHOOL_LUNCH_DETAIL_COUNT,
        {
          account_code: "school_lunch_fee",
          source_file: "budget_revenue_details.csv",
        },
      ),
    );
  }
  for (const detail of nonZeroSchoolLunchDetails) {
    errors.push(
      amountMismatchDraft(
        "school_lunch_nonzero_amount",
        "学校給食費会計の歳入明細が0円ではありません。",
        0,
        detail.current_amount_thousand_yen,
        {
          account_code: detail.account_code,
          revenue_item_key: detail.revenue_item_key,
          revenue_section_id: detail.revenue_section_id,
          revenue_detail_id: detail.revenue_detail_id,
          source_file: detail.source_file,
          source_row_number: detail.source_row_number,
        },
      ),
    );
  }

  const sectionStatusCounts = countStatuses(
    inputs.sections,
    BUDGET_REVENUE_SECTION_VALIDATION_STATUSES,
    (row) => row.validation_status,
  );
  const itemStatusCounts = countStatuses(
    inputs.items,
    BUDGET_REVENUE_ITEM_VALIDATION_STATUSES,
    (row) => row.validation_status,
  );
  for (const section of inputs.sections) {
    if (!section.validation_status.startsWith("error_")) {
      continue;
    }
    errors.push(
      errorDraft(
        "error_validation_status",
        `歳入節にerror系validation_statusがあります: ` +
          section.validation_status,
        {
          account_code: section.account_code,
          revenue_item_key: section.revenue_item_key,
          revenue_section_id: section.revenue_section_id,
          source_file: "budget_revenue_sections.csv",
        },
      ),
    );
  }
  for (const item of inputs.items) {
    if (!item.validation_status.startsWith("error_")) {
      continue;
    }
    errors.push(
      errorDraft(
        "error_validation_status",
        `歳入目にerror系validation_statusがあります: ` +
          item.validation_status,
        {
          account_code: item.account_code,
          revenue_item_key: item.revenue_item_key,
          source_file: "budget_revenue_items.csv",
        },
      ),
    );
  }

  const sourceTraceability = addSourceTraceabilityErrors(
    errors,
    inputs,
    config,
  );
  const finalizedErrors = errors.map((error, index) => ({
    error_id: `rve_${String(index + 1).padStart(4, "0")}`,
    ...error,
  }));
  const errorStatusTotal =
    (sectionStatusCounts.error_amount_mismatch ?? 0) +
    (itemStatusCounts.error_section_mismatch ?? 0) +
    (itemStatusCounts.error_amount_mismatch ?? 0);

  return {
    rowCounts: {
      details: inputs.details.length,
      sections: inputs.sections.length,
      items: inputs.items.length,
    },
    uniqueIdCounts: {
      revenueDetailId: countUnique(
        inputs.details,
        (row) => row.revenue_detail_id,
      ),
      revenueSectionId: countUnique(
        inputs.sections,
        (row) => row.revenue_section_id,
      ),
      revenueItemKey: countUnique(
        inputs.items,
        (row) => row.revenue_item_key,
      ),
    },
    totals: {
      details: detailTotal,
      sections: sectionTotal,
      items: itemTotal,
      configuredExpected,
      expected: EXPECTED_BUDGET_REVENUE_TOTAL,
    },
    generalFundingTotals: {
      detailsGeneral,
      detailsSpecific,
      sectionsGeneral,
      sectionsSpecific,
      itemsGeneral,
      itemsSpecific,
    },
    statusCounts: {
      sections: sectionStatusCounts,
      items: itemStatusCounts,
      errorTotal: errorStatusTotal,
    },
    sourceTraceability,
    aggregationChecks: {
      detailsToSectionsMismatchCount,
      detailsToItemsMismatchCount,
      sectionsToItemsMismatchCount,
    },
    schoolLunch: {
      detailRowCount: schoolLunchDetails.length,
      nonZeroDetailRowCount: nonZeroSchoolLunchDetails.length,
    },
    accountSummaries,
    errors: finalizedErrors,
    isPass: finalizedErrors.length === 0,
  };
}

export function serializeRevenueValidationErrors(
  errors: RevenueValidationError[],
): string {
  return stringify(errors, {
    columns: [...REVENUE_VALIDATION_ERROR_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function passFail(value: boolean): "PASS" | "FAIL" {
  return value ? "PASS" : "FAIL";
}

export function renderRevenueValidationReport(
  result: BudgetRevenueValidationResult,
  files: RevenueValidationReportFiles,
): string {
  const errorTypeCounts = new Map<string, number>();
  for (const error of result.errors) {
    errorTypeCounts.set(
      error.error_type,
      (errorTypeCounts.get(error.error_type) ?? 0) + 1,
    );
  }
  const errorCount = (...errorTypes: string[]): number =>
    errorTypes.reduce(
      (count, errorType) => count + (errorTypeCounts.get(errorType) ?? 0),
      0,
    );
  const checklist = [
    ["1", "detailsが2,192行", result.rowCounts.details === 2_192],
    ["2", "sectionsが650行", result.rowCounts.sections === 650],
    ["3", "itemsが175行", result.rowCounts.items === 175],
    [
      "4",
      "各IDが一意",
      result.uniqueIdCounts.revenueDetailId === result.rowCounts.details &&
        result.uniqueIdCounts.revenueSectionId ===
          result.rowCounts.sections &&
        result.uniqueIdCounts.revenueItemKey === result.rowCounts.items,
    ],
    ["5", "キー形式が正しい", errorCount("invalid_revenue_key_format") === 0],
    ["6", "details全行でcurrent=allocated+unallocated", errorCount("detail_amount_mismatch") === 0],
    [
      "7",
      "detailsからsectionsへの集約が一致",
      result.aggregationChecks.detailsToSectionsMismatchCount === 0,
    ],
    [
      "8",
      "detailsからitemsへの集約が一致",
      result.aggregationChecks.detailsToItemsMismatchCount === 0,
    ],
    [
      "9",
      "sectionsからitemsへの集約が一致",
      result.aggregationChecks.sectionsToItemsMismatchCount === 0,
    ],
    [
      "10",
      "会計別総額がconfigの歳入期待値と一致",
      result.accountSummaries.every((account) => account.isPass),
    ],
    [
      "11",
      "全会計合計が621,033,664",
      result.totals.configuredExpected === result.totals.expected &&
        result.totals.details === result.totals.expected &&
        result.totals.sections === result.totals.expected &&
        result.totals.items === result.totals.expected,
    ],
    [
      "12",
      "一般会計の一般財源が279,402,113",
      result.generalFundingTotals.detailsGeneral ===
        EXPECTED_GENERAL_REVENUE_TOTAL &&
        result.generalFundingTotals.sectionsGeneral ===
          EXPECTED_GENERAL_REVENUE_TOTAL &&
        result.generalFundingTotals.itemsGeneral ===
          EXPECTED_GENERAL_REVENUE_TOTAL,
    ],
    [
      "13",
      "一般会計の特定財源が151,950,897",
      result.generalFundingTotals.detailsSpecific ===
        EXPECTED_SPECIFIC_REVENUE_TOTAL &&
        result.generalFundingTotals.sectionsSpecific ===
          EXPECTED_SPECIFIC_REVENUE_TOTAL &&
        result.generalFundingTotals.itemsSpecific ===
          EXPECTED_SPECIFIC_REVENUE_TOTAL,
    ],
    [
      "14",
      "source_row_numberから公式CSVを復元可能",
      result.sourceTraceability.recoveredSourceRows ===
        result.sourceTraceability.expectedSourceRows &&
        result.sourceTraceability.fullyMatchedSourceRows ===
          result.sourceTraceability.expectedSourceRows,
    ],
    [
      "15",
      "source_row_numberに重複・欠落がない",
      result.sourceTraceability.duplicateSourceRowReferences === 0 &&
        result.sourceTraceability.missingSourceRows === 0,
    ],
    [
      "16",
      "財源区分名称とfunding_natureのルールが正しい",
      errorCount("funding_nature_mismatch") === 0,
    ],
    [
      "17",
      "学校給食費会計の4行がすべて0円",
      result.schoolLunch.detailRowCount ===
        EXPECTED_SCHOOL_LUNCH_DETAIL_COUNT &&
        result.schoolLunch.nonZeroDetailRowCount === 0,
    ],
    [
      "18",
      "error系validation_statusが0件",
      result.statusCounts.errorTotal === 0,
    ],
  ] as const;

  const lines = [
    "# 世田谷区令和8年度当初予算 歳入CSVデータ検証レポート",
    "",
    "- 対象: 公式歳入CSV由来のdetails・sections・items",
    "- 金額単位: 千円",
    "- PDF処理: 対象外",
    "",
    "## 最終判定",
    "",
    `**${result.isPass ? "PASS" : "FAIL"}**`,
    "",
    `検出エラーは ${formatNumber(result.errors.length)} 件。`,
    "",
    "## 検証項目",
    "",
    "| No. | 検証 | 判定 |",
    "| ---: | --- | --- |",
    ...checklist.map(
      ([number, label, isPass]) =>
        `| ${number} | ${label} | ${passFail(isPass)} |`,
    ),
    "",
    "## 入力ファイル一覧",
    "",
    "| ファイル | 用途 |",
    "| --- | --- |",
    `| \`${files.raw}\` | 公式歳入CSV・元行復元 |`,
    `| \`${files.details}\` | 歳入明細 |`,
    `| \`${files.sections}\` | 歳入節集約 |`,
    `| \`${files.items}\` | 歳入目マスタ |`,
    `| \`${files.config}\` | 会計定義・期待額 |`,
    "",
    "## 行数・ID一意性",
    "",
    "| 対象 | 期待行数 | 実際行数 | 一意ID数 | 判定 |",
    "| --- | ---: | ---: | ---: | --- |",
    `| details | 2,192 | ${formatNumber(result.rowCounts.details)} | ${formatNumber(result.uniqueIdCounts.revenueDetailId)} | ${passFail(result.rowCounts.details === 2_192 && result.uniqueIdCounts.revenueDetailId === result.rowCounts.details)} |`,
    `| sections | 650 | ${formatNumber(result.rowCounts.sections)} | ${formatNumber(result.uniqueIdCounts.revenueSectionId)} | ${passFail(result.rowCounts.sections === 650 && result.uniqueIdCounts.revenueSectionId === result.rowCounts.sections)} |`,
    `| items | 175 | ${formatNumber(result.rowCounts.items)} | ${formatNumber(result.uniqueIdCounts.revenueItemKey)} | ${passFail(result.rowCounts.items === 175 && result.uniqueIdCounts.revenueItemKey === result.rowCounts.items)} |`,
    "",
    "## 会計別金額",
    "",
    "| account_code | 期待額 | details | sections | items | 判定 |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...result.accountSummaries.map(
      (account) =>
        `| \`${account.accountCode}\` | ${formatNumber(account.expectedAmountThousandYen)} | ${formatNumber(account.detailAmountThousandYen)} | ${formatNumber(account.sectionAmountThousandYen)} | ${formatNumber(account.itemAmountThousandYen)} | ${passFail(account.isPass)} |`,
    ),
    "",
    "## 全会計合計",
    "",
    "| 対象 | 期待額 | 実績額 | 差額（期待−実績） | 判定 |",
    "| --- | ---: | ---: | ---: | --- |",
    `| config | ${formatNumber(result.totals.expected)} | ${formatNumber(result.totals.configuredExpected)} | ${formatNumber(result.totals.expected - result.totals.configuredExpected)} | ${passFail(result.totals.configuredExpected === result.totals.expected)} |`,
    `| details | ${formatNumber(result.totals.expected)} | ${formatNumber(result.totals.details)} | ${formatNumber(result.totals.expected - result.totals.details)} | ${passFail(result.totals.details === result.totals.expected)} |`,
    `| sections | ${formatNumber(result.totals.expected)} | ${formatNumber(result.totals.sections)} | ${formatNumber(result.totals.expected - result.totals.sections)} | ${passFail(result.totals.sections === result.totals.expected)} |`,
    `| items | ${formatNumber(result.totals.expected)} | ${formatNumber(result.totals.items)} | ${formatNumber(result.totals.expected - result.totals.items)} | ${passFail(result.totals.items === result.totals.expected)} |`,
    "",
    "## 一般会計の財源区分",
    "",
    "| データ | 一般財源 | 特定財源 | 判定 |",
    "| --- | ---: | ---: | --- |",
    `| details | ${formatNumber(result.generalFundingTotals.detailsGeneral)} | ${formatNumber(result.generalFundingTotals.detailsSpecific)} | ${passFail(result.generalFundingTotals.detailsGeneral === EXPECTED_GENERAL_REVENUE_TOTAL && result.generalFundingTotals.detailsSpecific === EXPECTED_SPECIFIC_REVENUE_TOTAL)} |`,
    `| sections | ${formatNumber(result.generalFundingTotals.sectionsGeneral)} | ${formatNumber(result.generalFundingTotals.sectionsSpecific)} | ${passFail(result.generalFundingTotals.sectionsGeneral === EXPECTED_GENERAL_REVENUE_TOTAL && result.generalFundingTotals.sectionsSpecific === EXPECTED_SPECIFIC_REVENUE_TOTAL)} |`,
    `| items | ${formatNumber(result.generalFundingTotals.itemsGeneral)} | ${formatNumber(result.generalFundingTotals.itemsSpecific)} | ${passFail(result.generalFundingTotals.itemsGeneral === EXPECTED_GENERAL_REVENUE_TOTAL && result.generalFundingTotals.itemsSpecific === EXPECTED_SPECIFIC_REVENUE_TOTAL)} |`,
    "",
    "## 集約突合",
    "",
    "| 検証 | 不一致件数 | 判定 |",
    "| --- | ---: | --- |",
    `| details → sections | ${formatNumber(result.aggregationChecks.detailsToSectionsMismatchCount)} | ${passFail(result.aggregationChecks.detailsToSectionsMismatchCount === 0)} |`,
    `| details → items | ${formatNumber(result.aggregationChecks.detailsToItemsMismatchCount)} | ${passFail(result.aggregationChecks.detailsToItemsMismatchCount === 0)} |`,
    `| sections → items | ${formatNumber(result.aggregationChecks.sectionsToItemsMismatchCount)} | ${passFail(result.aggregationChecks.sectionsToItemsMismatchCount === 0)} |`,
    "",
    "## source_row_number追跡",
    "",
    "| 項目 | 件数 |",
    "| --- | ---: |",
    `| 公式CSV対象行 | ${formatNumber(result.sourceTraceability.expectedSourceRows)} |`,
    `| details参照行 | ${formatNumber(result.sourceTraceability.referencedSourceRows)} |`,
    `| 一意な参照行 | ${formatNumber(result.sourceTraceability.uniqueReferencedSourceRows)} |`,
    `| 復元可能行 | ${formatNumber(result.sourceTraceability.recoveredSourceRows)} |`,
    `| 全列一致行 | ${formatNumber(result.sourceTraceability.fullyMatchedSourceRows)} |`,
    `| 欠落行 | ${formatNumber(result.sourceTraceability.missingSourceRows)} |`,
    `| 重複参照 | ${formatNumber(result.sourceTraceability.duplicateSourceRowReferences)} |`,
    "",
    "## validation_status",
    "",
    "| データ | status | 件数 |",
    "| --- | --- | ---: |",
    ...Object.entries(result.statusCounts.sections).map(
      ([status, count]) =>
        `| sections | \`${status}\` | ${formatNumber(count)} |`,
    ),
    ...Object.entries(result.statusCounts.items).map(
      ([status, count]) =>
        `| items | \`${status}\` | ${formatNumber(count)} |`,
    ),
    "",
    "## 学校給食費会計",
    "",
    `- 明細行数: ${formatNumber(result.schoolLunch.detailRowCount)}件`,
    `- 0円でない明細: ${formatNumber(result.schoolLunch.nonZeroDetailRowCount)}件`,
    `- 判定: ${passFail(result.schoolLunch.detailRowCount === EXPECTED_SCHOOL_LUNCH_DETAIL_COUNT && result.schoolLunch.nonZeroDetailRowCount === 0)}`,
    "",
    "## エラー",
    "",
    `エラー件数: ${formatNumber(result.errors.length)}件`,
    "",
  ];

  if (result.errors.length === 0) {
    lines.push(
      `\`${files.errors}\` はヘッダーのみ。`,
      "",
      "CSV由来の歳入3テーブルはPASS。PDF処理へ進むための前提を満たしている。",
      "",
    );
  } else {
    lines.push(
      "| error_type | 件数 |",
      "| --- | ---: |",
      ...[...errorTypeCounts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(
          ([errorType, count]) =>
            `| \`${errorType}\` | ${formatNumber(count)} |`,
        ),
      "",
      "CSV由来の歳入3テーブルはFAIL。エラーを解消するまでPDF処理へ進まない。",
      "",
    );
  }

  return `${lines.join("\n")}\n`;
}
