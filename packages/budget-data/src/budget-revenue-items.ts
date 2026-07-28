import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { parseThousandYenAmount } from "./budget-programs";
import type { FundingNature } from "./budget-revenue-details";
import {
  BUDGET_REVENUE_SECTION_COLUMNS,
  BUDGET_REVENUE_SECTION_VALIDATION_STATUSES,
  type BudgetRevenueSection,
  type BudgetRevenueSectionSourceDetail,
  type BudgetRevenueSectionValidationStatus,
} from "./budget-revenue-sections";

export const EXPECTED_BUDGET_REVENUE_ITEM_ROW_COUNT = 175;

export const EXPECTED_BUDGET_REVENUE_ITEM_ACCOUNT_COUNTS = {
  general: 116,
  national_health_insurance: 16,
  latter_stage_elderly_healthcare: 10,
  long_term_care_insurance: 29,
  school_lunch_fee: 4,
} as const;

export const BUDGET_REVENUE_ITEM_VALIDATION_STATUSES = [
  "ok",
  "ok_zero_amount",
  "error_section_mismatch",
  "error_amount_mismatch",
] as const;

export type BudgetRevenueItemValidationStatus =
  (typeof BUDGET_REVENUE_ITEM_VALIDATION_STATUSES)[number];

export const BUDGET_REVENUE_ITEM_COLUMNS = [
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
  "section_count",
  "detail_count",
  "validation_status",
  "source_type",
] as const;

const ITEM_METADATA_FIELDS = [
  "fiscalYear",
  "accountCode",
  "accountName",
  "budgetSide",
  "kanCode",
  "kanName",
  "kouCode",
  "kouName",
  "mokuCode",
  "mokuName",
] as const;

const ITEM_AMOUNT_FIELDS = [
  "previousAmountThousandYen",
  "currentAmountThousandYen",
  "allocatedAmountThousandYen",
  "unallocatedAmountThousandYen",
  "generalRevenueThousandYen",
  "specificRevenueThousandYen",
  "specialAccountRevenueThousandYen",
] as const;

interface RevenueItemDimensions {
  revenueItemKey: string;
  fiscalYear: number;
  accountCode: string;
  accountName: string;
  budgetSide: "revenue";
  kanCode: string;
  kanName: string;
  kouCode: string;
  kouName: string;
  mokuCode: string;
  mokuName: string;
}

interface RevenueItemAmounts {
  previousAmountThousandYen: number;
  currentAmountThousandYen: number;
  allocatedAmountThousandYen: number;
  unallocatedAmountThousandYen: number;
  generalRevenueThousandYen: number;
  specificRevenueThousandYen: number;
  specialAccountRevenueThousandYen: number;
}

interface DetailItemAggregate {
  dimensions: RevenueItemDimensions;
  amounts: RevenueItemAmounts;
  detailCount: number;
}

interface SectionItemAggregate {
  dimensions: RevenueItemDimensions;
  amounts: RevenueItemAmounts;
  sectionCount: number;
  detailCount: number;
}

export interface BudgetRevenueItem {
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
  previous_amount_thousand_yen: number;
  current_amount_thousand_yen: number;
  diff_amount_thousand_yen: number;
  allocated_amount_thousand_yen: number;
  unallocated_amount_thousand_yen: number;
  general_revenue_thousand_yen: number;
  specific_revenue_thousand_yen: number;
  special_account_revenue_thousand_yen: number;
  section_count: number;
  detail_count: number;
  validation_status: BudgetRevenueItemValidationStatus;
  source_type: "derived";
}

export interface BudgetRevenueItemValidation {
  rowCount: number;
  uniqueRevenueItemKeyCount: number;
  sourceDetailRowCount: number;
  sourceSectionRowCount: number;
  detailCountTotal: number;
  sectionCountTotal: number;
  reconciledItemCount: number;
  detailsCurrentAmountTotalThousandYen: number;
  sectionsCurrentAmountTotalThousandYen: number;
  itemsCurrentAmountTotalThousandYen: number;
  accountItemCounts: Record<string, number>;
  accountCurrentAmountTotalsThousandYen: Record<string, number>;
  accountGeneralRevenueTotalsThousandYen: Record<string, number>;
  accountSpecificRevenueTotalsThousandYen: Record<string, number>;
  accountSpecialRevenueTotalsThousandYen: Record<string, number>;
  statusCounts: Record<BudgetRevenueItemValidationStatus, number>;
  errorStatusCount: number;
  isPass: boolean;
}

export interface SerializedBudgetRevenueItemValidation {
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

function assertTwoDigitCode(value: string, fieldName: string): string {
  if (!/^\d{2}$/.test(value)) {
    throw new Error(`${fieldName}が2桁コードではありません: ${value}`);
  }
  return value;
}

function parseSectionValidationStatus(
  value: string,
  fieldName: string,
): BudgetRevenueSectionValidationStatus {
  if (
    !BUDGET_REVENUE_SECTION_VALIDATION_STATUSES.includes(
      value as BudgetRevenueSectionValidationStatus,
    )
  ) {
    throw new Error(`${fieldName}が不正です: ${value}`);
  }
  return value as BudgetRevenueSectionValidationStatus;
}

function expectedSectionValidationStatus(
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

function parseRevenueSectionRow(
  row: Record<string, string>,
  rowNumber: number,
): BudgetRevenueSection {
  const prefix = `budget_revenue_sections.csv row ${rowNumber}`;
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
  if (row.source_type !== "derived") {
    throw new Error(
      `${prefix}.source_typeがderivedではありません: ` +
        row.source_type,
    );
  }

  const kanCode = assertTwoDigitCode(
    row.kan_code,
    `${prefix}.kan_code`,
  );
  const kouCode = assertTwoDigitCode(
    row.kou_code,
    `${prefix}.kou_code`,
  );
  const mokuCode = assertTwoDigitCode(
    row.moku_code,
    `${prefix}.moku_code`,
  );
  const setsuCode = assertTwoDigitCode(
    row.setsu_code,
    `${prefix}.setsu_code`,
  );
  const revenueItemKey = requiredText(
    row.revenue_item_key,
    `${prefix}.revenue_item_key`,
  );
  const revenueSectionId = requiredText(
    row.revenue_section_id,
    `${prefix}.revenue_section_id`,
  );
  const expectedItemKey =
    `${fiscalYear}_${accountCode}_revenue_` +
    `${kanCode}_${kouCode}_${mokuCode}`;
  const expectedSectionId = `rs_${expectedItemKey}_${setsuCode}`;
  if (
    revenueItemKey !== expectedItemKey ||
    revenueSectionId !== expectedSectionId
  ) {
    throw new Error(
      `${prefix}の歳入IDと階層コードが一致しません: ` +
        revenueSectionId,
    );
  }

  const previousAmount = parseThousandYenAmount(
    row.previous_amount_thousand_yen,
    `${prefix}.previous_amount_thousand_yen`,
  );
  const currentAmount = parseThousandYenAmount(
    row.current_amount_thousand_yen,
    `${prefix}.current_amount_thousand_yen`,
  );
  const diffAmount = parseThousandYenAmount(
    row.diff_amount_thousand_yen,
    `${prefix}.diff_amount_thousand_yen`,
  );
  const allocatedAmount = parseThousandYenAmount(
    row.allocated_amount_thousand_yen,
    `${prefix}.allocated_amount_thousand_yen`,
  );
  const unallocatedAmount = parseThousandYenAmount(
    row.unallocated_amount_thousand_yen,
    `${prefix}.unallocated_amount_thousand_yen`,
  );
  const generalRevenue = parseThousandYenAmount(
    row.general_revenue_thousand_yen,
    `${prefix}.general_revenue_thousand_yen`,
  );
  const specificRevenue = parseThousandYenAmount(
    row.specific_revenue_thousand_yen,
    `${prefix}.specific_revenue_thousand_yen`,
  );
  const specialAccountRevenue = parseThousandYenAmount(
    row.special_account_revenue_thousand_yen,
    `${prefix}.special_account_revenue_thousand_yen`,
  );
  const validationStatus = parseSectionValidationStatus(
    row.validation_status,
    `${prefix}.validation_status`,
  );

  if (diffAmount !== currentAmount - previousAmount) {
    throw new Error(`${prefix}.diff_amount_thousand_yenが不正です。`);
  }
  if (
    validationStatus !==
    expectedSectionValidationStatus(
      currentAmount,
      allocatedAmount,
      unallocatedAmount,
    )
  ) {
    throw new Error(`${prefix}.validation_statusが金額と不一致です。`);
  }
  if (
    accountCode === "general" &&
    (generalRevenue + specificRevenue !== currentAmount ||
      specialAccountRevenue !== 0)
  ) {
    throw new Error(`${prefix}の一般会計財源集計が不正です。`);
  }
  if (
    accountCode !== "general" &&
    (generalRevenue !== 0 ||
      specificRevenue !== 0 ||
      specialAccountRevenue !== currentAmount)
  ) {
    throw new Error(`${prefix}の特別会計財源集計が不正です。`);
  }

  return {
    revenue_section_id: revenueSectionId,
    revenue_item_key: revenueItemKey,
    fiscal_year: fiscalYear,
    account_code: accountCode,
    account_name: requiredText(
      row.account_name,
      `${prefix}.account_name`,
    ),
    budget_side: "revenue",
    kan_code: kanCode,
    kan_name: requiredText(row.kan_name, `${prefix}.kan_name`),
    kou_code: kouCode,
    kou_name: requiredText(row.kou_name, `${prefix}.kou_name`),
    moku_code: mokuCode,
    moku_name: requiredText(row.moku_name, `${prefix}.moku_name`),
    setsu_code: setsuCode,
    setsu_name: requiredText(
      row.setsu_name,
      `${prefix}.setsu_name`,
    ),
    previous_amount_thousand_yen: previousAmount,
    current_amount_thousand_yen: currentAmount,
    diff_amount_thousand_yen: diffAmount,
    allocated_amount_thousand_yen: allocatedAmount,
    unallocated_amount_thousand_yen: unallocatedAmount,
    general_revenue_thousand_yen: generalRevenue,
    specific_revenue_thousand_yen: specificRevenue,
    special_account_revenue_thousand_yen: specialAccountRevenue,
    detail_count: parseNonNegativeInteger(
      row.detail_count,
      `${prefix}.detail_count`,
    ),
    validation_status: validationStatus,
    source_type: "derived",
  };
}

export function parseBudgetRevenueSectionRows(
  csvText: string,
): BudgetRevenueSection[] {
  const rows = parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;

  if (rows.length === 0) {
    throw new Error("budget_revenue_sections.csvにデータ行がありません。");
  }
  const sourceColumns = Object.keys(rows[0]);
  if (
    sourceColumns.join(",") !== BUDGET_REVENUE_SECTION_COLUMNS.join(",")
  ) {
    throw new Error(
      "budget_revenue_sections.csvの25列スキーマが一致しません。",
    );
  }

  return rows.map((row, index) => parseRevenueSectionRow(row, index + 1));
}

function emptyAmounts(): RevenueItemAmounts {
  return {
    previousAmountThousandYen: 0,
    currentAmountThousandYen: 0,
    allocatedAmountThousandYen: 0,
    unallocatedAmountThousandYen: 0,
    generalRevenueThousandYen: 0,
    specificRevenueThousandYen: 0,
    specialAccountRevenueThousandYen: 0,
  };
}

function assertSafeSum(
  current: number,
  added: number,
  fieldName: string,
  revenueItemKey: string,
): number {
  const total = current + added;
  if (!Number.isSafeInteger(total)) {
    throw new Error(
      `${fieldName}の集計額が安全な整数範囲を超えました: ` +
        revenueItemKey,
    );
  }
  return total;
}

function dimensionsFromDetail(
  detail: BudgetRevenueSectionSourceDetail,
): RevenueItemDimensions {
  const expectedItemKey =
    `${detail.fiscal_year}_${detail.account_code}_revenue_` +
    `${detail.kan_code}_${detail.kou_code}_${detail.moku_code}`;
  if (detail.revenue_item_key !== expectedItemKey) {
    throw new Error(
      `歳入明細のrevenue_item_keyと階層コードが一致しません: ` +
        detail.revenue_item_key,
    );
  }
  return {
    revenueItemKey: detail.revenue_item_key,
    fiscalYear: detail.fiscal_year,
    accountCode: detail.account_code,
    accountName: detail.account_name,
    budgetSide: detail.budget_side,
    kanCode: detail.kan_code,
    kanName: detail.kan_name,
    kouCode: detail.kou_code,
    kouName: detail.kou_name,
    mokuCode: detail.moku_code,
    mokuName: detail.moku_name,
  };
}

function dimensionsFromSection(
  section: BudgetRevenueSection,
): RevenueItemDimensions {
  const expectedItemKey =
    `${section.fiscal_year}_${section.account_code}_revenue_` +
    `${section.kan_code}_${section.kou_code}_${section.moku_code}`;
  if (section.revenue_item_key !== expectedItemKey) {
    throw new Error(
      `歳入節のrevenue_item_keyと階層コードが一致しません: ` +
        section.revenue_item_key,
    );
  }
  return {
    revenueItemKey: section.revenue_item_key,
    fiscalYear: section.fiscal_year,
    accountCode: section.account_code,
    accountName: section.account_name,
    budgetSide: section.budget_side,
    kanCode: section.kan_code,
    kanName: section.kan_name,
    kouCode: section.kou_code,
    kouName: section.kou_name,
    mokuCode: section.moku_code,
    mokuName: section.moku_name,
  };
}

function assertDimensionsMatch(
  expected: RevenueItemDimensions,
  current: RevenueItemDimensions,
  sourceName: string,
): void {
  for (const field of ITEM_METADATA_FIELDS) {
    if (current[field] !== expected[field]) {
      throw new Error(
        `${sourceName}内で同一revenue_item_keyの${field}が` +
          `一致しません: ${expected.revenueItemKey}`,
      );
    }
  }
}

function addDetailFunding(
  aggregate: DetailItemAggregate,
  detail: BudgetRevenueSectionSourceDetail,
): void {
  const key = aggregate.dimensions.revenueItemKey;
  const nature: FundingNature = detail.funding_nature;
  if (aggregate.dimensions.accountCode === "general") {
    if (nature === "special_account") {
      throw new Error(
        `一般会計にspecial_accountの財源分類があります: ` +
          detail.revenue_detail_id,
      );
    }
    const field =
      nature === "general"
        ? "generalRevenueThousandYen"
        : "specificRevenueThousandYen";
    aggregate.amounts[field] = assertSafeSum(
      aggregate.amounts[field],
      detail.current_amount_thousand_yen,
      field,
      key,
    );
    return;
  }
  if (nature !== "special_account") {
    throw new Error(
      `特別会計にspecial_account以外の財源分類があります: ` +
        detail.revenue_detail_id,
    );
  }
  aggregate.amounts.specialAccountRevenueThousandYen = assertSafeSum(
    aggregate.amounts.specialAccountRevenueThousandYen,
    detail.current_amount_thousand_yen,
    "specialAccountRevenueThousandYen",
    key,
  );
}

function aggregateDetails(
  details: BudgetRevenueSectionSourceDetail[],
): Map<string, DetailItemAggregate> {
  if (details.length === 0) {
    throw new Error("集約対象の歳入明細がありません。");
  }
  const detailIds = new Set<string>();
  const aggregates = new Map<string, DetailItemAggregate>();

  for (const detail of details) {
    if (detailIds.has(detail.revenue_detail_id)) {
      throw new Error(
        `revenue_detail_idが重複しています: ` +
          detail.revenue_detail_id,
      );
    }
    detailIds.add(detail.revenue_detail_id);
    const dimensions = dimensionsFromDetail(detail);
    let aggregate = aggregates.get(dimensions.revenueItemKey);
    if (!aggregate) {
      aggregate = {
        dimensions,
        amounts: emptyAmounts(),
        detailCount: 0,
      };
      aggregates.set(dimensions.revenueItemKey, aggregate);
    } else {
      assertDimensionsMatch(
        aggregate.dimensions,
        dimensions,
        "budget_revenue_details.csv",
      );
    }

    const key = dimensions.revenueItemKey;
    aggregate.amounts.previousAmountThousandYen = assertSafeSum(
      aggregate.amounts.previousAmountThousandYen,
      detail.previous_amount_thousand_yen,
      "previousAmountThousandYen",
      key,
    );
    aggregate.amounts.currentAmountThousandYen = assertSafeSum(
      aggregate.amounts.currentAmountThousandYen,
      detail.current_amount_thousand_yen,
      "currentAmountThousandYen",
      key,
    );
    aggregate.amounts.allocatedAmountThousandYen = assertSafeSum(
      aggregate.amounts.allocatedAmountThousandYen,
      detail.allocated_amount_thousand_yen,
      "allocatedAmountThousandYen",
      key,
    );
    aggregate.amounts.unallocatedAmountThousandYen = assertSafeSum(
      aggregate.amounts.unallocatedAmountThousandYen,
      detail.unallocated_amount_thousand_yen,
      "unallocatedAmountThousandYen",
      key,
    );
    addDetailFunding(aggregate, detail);
    aggregate.detailCount += 1;
  }

  return aggregates;
}

function aggregateSections(
  sections: BudgetRevenueSection[],
): Map<string, SectionItemAggregate> {
  const sectionIds = new Set<string>();
  const aggregates = new Map<string, SectionItemAggregate>();

  for (const section of sections) {
    if (sectionIds.has(section.revenue_section_id)) {
      throw new Error(
        `revenue_section_idが重複しています: ` +
          section.revenue_section_id,
      );
    }
    sectionIds.add(section.revenue_section_id);
    const dimensions = dimensionsFromSection(section);
    let aggregate = aggregates.get(dimensions.revenueItemKey);
    if (!aggregate) {
      aggregate = {
        dimensions,
        amounts: emptyAmounts(),
        sectionCount: 0,
        detailCount: 0,
      };
      aggregates.set(dimensions.revenueItemKey, aggregate);
    } else {
      assertDimensionsMatch(
        aggregate.dimensions,
        dimensions,
        "budget_revenue_sections.csv",
      );
    }

    const key = dimensions.revenueItemKey;
    const sourceAmounts: RevenueItemAmounts = {
      previousAmountThousandYen:
        section.previous_amount_thousand_yen,
      currentAmountThousandYen: section.current_amount_thousand_yen,
      allocatedAmountThousandYen:
        section.allocated_amount_thousand_yen,
      unallocatedAmountThousandYen:
        section.unallocated_amount_thousand_yen,
      generalRevenueThousandYen:
        section.general_revenue_thousand_yen,
      specificRevenueThousandYen:
        section.specific_revenue_thousand_yen,
      specialAccountRevenueThousandYen:
        section.special_account_revenue_thousand_yen,
    };
    for (const field of ITEM_AMOUNT_FIELDS) {
      aggregate.amounts[field] = assertSafeSum(
        aggregate.amounts[field],
        sourceAmounts[field],
        field,
        key,
      );
    }
    aggregate.sectionCount += 1;
    aggregate.detailCount += section.detail_count;
  }

  return aggregates;
}

function aggregatesMatch(
  details: DetailItemAggregate,
  sections: SectionItemAggregate | undefined,
): boolean {
  if (!sections || details.detailCount !== sections.detailCount) {
    return false;
  }
  return ITEM_AMOUNT_FIELDS.every(
    (field) => details.amounts[field] === sections.amounts[field],
  );
}

function determineValidationStatus(
  details: DetailItemAggregate,
  sections: SectionItemAggregate | undefined,
): BudgetRevenueItemValidationStatus {
  if (!aggregatesMatch(details, sections)) {
    return "error_section_mismatch";
  }
  const current = details.amounts.currentAmountThousandYen;
  if (
    current !==
    details.amounts.allocatedAmountThousandYen +
      details.amounts.unallocatedAmountThousandYen
  ) {
    return "error_amount_mismatch";
  }
  if (
    current === 0 &&
    sections?.amounts.currentAmountThousandYen === 0
  ) {
    return "ok_zero_amount";
  }
  if (current > 0) {
    return "ok";
  }
  return "error_amount_mismatch";
}

export function transformBudgetRevenueItems(
  details: BudgetRevenueSectionSourceDetail[],
  sections: BudgetRevenueSection[],
): BudgetRevenueItem[] {
  const detailAggregates = aggregateDetails(details);
  const sectionAggregates = aggregateSections(sections);
  const extraSectionKeys = [...sectionAggregates.keys()].filter(
    (key) => !detailAggregates.has(key),
  );
  if (extraSectionKeys.length > 0) {
    throw new Error(
      `budget_revenue_details.csvに存在しないrevenue_item_keyが` +
        `sections側にあります: ${extraSectionKeys.slice(0, 5).join(", ")}`,
    );
  }

  return [...detailAggregates.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([revenueItemKey, detailAggregate]) => {
      const sectionAggregate = sectionAggregates.get(revenueItemKey);
      if (sectionAggregate) {
        assertDimensionsMatch(
          detailAggregate.dimensions,
          sectionAggregate.dimensions,
          "detailsとsections",
        );
      }
      const dimensions = detailAggregate.dimensions;
      const amounts = detailAggregate.amounts;
      const diffAmount = assertSafeSum(
        amounts.currentAmountThousandYen,
        -amounts.previousAmountThousandYen,
        "diffAmountThousandYen",
        revenueItemKey,
      );

      return {
        revenue_item_key: revenueItemKey,
        fiscal_year: dimensions.fiscalYear,
        account_code: dimensions.accountCode,
        account_name: dimensions.accountName,
        budget_side: "revenue",
        kan_code: dimensions.kanCode,
        kan_name: dimensions.kanName,
        kou_code: dimensions.kouCode,
        kou_name: dimensions.kouName,
        moku_code: dimensions.mokuCode,
        moku_name: dimensions.mokuName,
        previous_amount_thousand_yen:
          amounts.previousAmountThousandYen,
        current_amount_thousand_yen: amounts.currentAmountThousandYen,
        diff_amount_thousand_yen: diffAmount,
        allocated_amount_thousand_yen:
          amounts.allocatedAmountThousandYen,
        unallocated_amount_thousand_yen:
          amounts.unallocatedAmountThousandYen,
        general_revenue_thousand_yen:
          amounts.generalRevenueThousandYen,
        specific_revenue_thousand_yen:
          amounts.specificRevenueThousandYen,
        special_account_revenue_thousand_yen:
          amounts.specialAccountRevenueThousandYen,
        section_count: sectionAggregate?.sectionCount ?? 0,
        detail_count: detailAggregate.detailCount,
        validation_status: determineValidationStatus(
          detailAggregate,
          sectionAggregate,
        ),
        source_type: "derived",
      };
    });
}

export function validateBudgetRevenueItems(
  items: BudgetRevenueItem[],
  details: BudgetRevenueSectionSourceDetail[],
  sections: BudgetRevenueSection[],
): BudgetRevenueItemValidation {
  if (items.length === 0) {
    throw new Error("検証対象の歳入目データがありません。");
  }

  const expectedItems = new Map(
    transformBudgetRevenueItems(details, sections).map((item) => [
      item.revenue_item_key,
      item,
    ]),
  );
  const itemKeys = new Set<string>();
  const accountItemCounts: Record<string, number> = {};
  const accountCurrentTotals: Record<string, number> = {};
  const accountGeneralTotals: Record<string, number> = {};
  const accountSpecificTotals: Record<string, number> = {};
  const accountSpecialTotals: Record<string, number> = {};
  const statusCounts = Object.fromEntries(
    BUDGET_REVENUE_ITEM_VALIDATION_STATUSES.map((status) => [
      status,
      0,
    ]),
  ) as Record<BudgetRevenueItemValidationStatus, number>;
  let detailCountTotal = 0;
  let sectionCountTotal = 0;
  let reconciledItemCount = 0;
  let itemsCurrentAmountTotal = 0;

  for (const item of items) {
    if (itemKeys.has(item.revenue_item_key)) {
      throw new Error(
        `revenue_item_keyが重複しています: ${item.revenue_item_key}`,
      );
    }
    itemKeys.add(item.revenue_item_key);
    const expected = expectedItems.get(item.revenue_item_key);
    if (!expected) {
      throw new Error(
        `入力明細に存在しないrevenue_item_keyです: ` +
          item.revenue_item_key,
      );
    }

    const current = item as unknown as Record<string, string | number>;
    const expectedRecord = expected as unknown as Record<
      string,
      string | number
    >;
    for (const column of BUDGET_REVENUE_ITEM_COLUMNS) {
      if (String(current[column]) !== String(expectedRecord[column])) {
        throw new Error(
          `歳入目の集約値が入力と一致しません: ` +
            `${item.revenue_item_key}.${column}`,
        );
      }
    }

    detailCountTotal += item.detail_count;
    sectionCountTotal += item.section_count;
    if (
      item.validation_status === "ok" ||
      item.validation_status === "ok_zero_amount"
    ) {
      reconciledItemCount += 1;
    }
    itemsCurrentAmountTotal = assertSafeSum(
      itemsCurrentAmountTotal,
      item.current_amount_thousand_yen,
      "itemsCurrentAmountTotalThousandYen",
      item.revenue_item_key,
    );
    accountItemCounts[item.account_code] =
      (accountItemCounts[item.account_code] ?? 0) + 1;
    accountCurrentTotals[item.account_code] =
      (accountCurrentTotals[item.account_code] ?? 0) +
      item.current_amount_thousand_yen;
    accountGeneralTotals[item.account_code] =
      (accountGeneralTotals[item.account_code] ?? 0) +
      item.general_revenue_thousand_yen;
    accountSpecificTotals[item.account_code] =
      (accountSpecificTotals[item.account_code] ?? 0) +
      item.specific_revenue_thousand_yen;
    accountSpecialTotals[item.account_code] =
      (accountSpecialTotals[item.account_code] ?? 0) +
      item.special_account_revenue_thousand_yen;
    statusCounts[item.validation_status] += 1;
  }

  if (itemKeys.size !== expectedItems.size) {
    throw new Error(
      `revenue_item_key集合が入力明細と一致しません: ` +
        `${itemKeys.size} != ${expectedItems.size}`,
    );
  }

  const detailsCurrentTotal = details.reduce(
    (total, detail) =>
      assertSafeSum(
        total,
        detail.current_amount_thousand_yen,
        "detailsCurrentAmountTotalThousandYen",
        detail.revenue_item_key,
      ),
    0,
  );
  const sectionsCurrentTotal = sections.reduce(
    (total, section) =>
      assertSafeSum(
        total,
        section.current_amount_thousand_yen,
        "sectionsCurrentAmountTotalThousandYen",
        section.revenue_item_key,
      ),
    0,
  );
  const errorStatusCount =
    statusCounts.error_section_mismatch +
    statusCounts.error_amount_mismatch;

  return {
    rowCount: items.length,
    uniqueRevenueItemKeyCount: itemKeys.size,
    sourceDetailRowCount: details.length,
    sourceSectionRowCount: sections.length,
    detailCountTotal,
    sectionCountTotal,
    reconciledItemCount,
    detailsCurrentAmountTotalThousandYen: detailsCurrentTotal,
    sectionsCurrentAmountTotalThousandYen: sectionsCurrentTotal,
    itemsCurrentAmountTotalThousandYen: itemsCurrentAmountTotal,
    accountItemCounts,
    accountCurrentAmountTotalsThousandYen: accountCurrentTotals,
    accountGeneralRevenueTotalsThousandYen: accountGeneralTotals,
    accountSpecificRevenueTotalsThousandYen: accountSpecificTotals,
    accountSpecialRevenueTotalsThousandYen: accountSpecialTotals,
    statusCounts,
    errorStatusCount,
    isPass:
      items.length === expectedItems.size &&
      detailCountTotal === details.length &&
      sectionCountTotal === sections.length &&
      reconciledItemCount === items.length &&
      detailsCurrentTotal === sectionsCurrentTotal &&
      detailsCurrentTotal === itemsCurrentAmountTotal &&
      errorStatusCount === 0,
  };
}

export function serializeBudgetRevenueItems(
  items: BudgetRevenueItem[],
): string {
  return stringify(items, {
    columns: [...BUDGET_REVENUE_ITEM_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

export function validateSerializedBudgetRevenueItems(
  csvText: string,
  items: BudgetRevenueItem[],
): SerializedBudgetRevenueItemValidation {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length === 0) {
    throw new Error("一時出力したbudget_revenue_items.csvが空です。");
  }
  if (
    records[0].join(",") !== BUDGET_REVENUE_ITEM_COLUMNS.join(",")
  ) {
    throw new Error(
      "一時出力したbudget_revenue_items.csvの列が不正です。",
    );
  }
  if (records.length - 1 !== items.length) {
    throw new Error(
      `一時出力したbudget_revenue_items.csvの行数が不正です: ` +
        `${records.length - 1} != ${items.length}`,
    );
  }

  for (let rowIndex = 0; rowIndex < items.length; rowIndex += 1) {
    const current = items[rowIndex] as unknown as Record<
      string,
      string | number
    >;
    const serialized = records[rowIndex + 1];
    for (
      let columnIndex = 0;
      columnIndex < BUDGET_REVENUE_ITEM_COLUMNS.length;
      columnIndex += 1
    ) {
      const column = BUDGET_REVENUE_ITEM_COLUMNS[columnIndex];
      if (serialized[columnIndex] !== String(current[column])) {
        throw new Error(
          `一時出力の再読込比較に失敗しました: ` +
            `row=${rowIndex + 1}, column=${column}`,
        );
      }
    }
  }

  return {
    rowCount: items.length,
    columnCount: BUDGET_REVENUE_ITEM_COLUMNS.length,
  };
}
