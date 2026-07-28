import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import {
  parseBudgetProgramIdentitySourceGroups,
  type BudgetProgramIdentitySourceGroup,
} from "./budget-program-identities";
import type { BudgetRevenueDetail } from "./budget-revenue-details";
import {
  parseBudgetRevenueSectionRows,
  type BudgetRevenueItem,
} from "./budget-revenue-items";
import type { BudgetRevenueSection } from "./budget-revenue-sections";
import {
  parseRevenueValidationDetails,
  parseRevenueValidationItems,
} from "./budget-revenue-validation";
import {
  parseDepartmentNameMap,
  type DepartmentNameMapping,
} from "./department-name-map";
import {
  parseBudgetRevenueAllocationsForIdentityResolution,
  type IdentityResolvedBudgetRevenueAllocation,
} from "./revenue-allocation-identity-resolution";

export const EXPECTED_PUBLIC_BUDGET_REVENUE_DETAIL_ROW_COUNT = 2_192;
export const EXPECTED_PUBLIC_BUDGET_REVENUE_SECTION_ROW_COUNT = 650;
export const EXPECTED_PUBLIC_BUDGET_REVENUE_ITEM_ROW_COUNT = 175;
export const EXPECTED_PUBLIC_BUDGET_REVENUE_ALLOCATION_ROW_COUNT =
  1_948;
export const EXPECTED_PUBLIC_BUDGET_REVENUE_TOTAL_THOUSAND_YEN =
  621_033_664;
export const EXPECTED_PUBLIC_ZERO_REVENUE_DETAIL_COUNT = 226;
export const EXPECTED_PUBLIC_ZERO_REVENUE_ITEM_COUNT = 9;
export const EXPECTED_PUBLIC_RELATED_REVENUE_DETAIL_COUNT = 1_915;
export const EXPECTED_PUBLIC_EXACT_GROUP_ALLOCATION_COUNT = 1_909;
export const EXPECTED_PUBLIC_IDENTITY_ALLOCATION_COUNT = 39;

export const EXPECTED_PUBLIC_BUDGET_REVENUE_ACCOUNT_TOTALS = {
  general: 431_353_010,
  national_health_insurance: 84_206_905,
  latter_stage_elderly_healthcare: 29_414_796,
  long_term_care_insurance: 76_058_953,
  school_lunch_fee: 0,
} as const;

export const PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS = [
  "revenue_detail_id",
  "revenue_section_id",
  "revenue_item_key",
  "fiscal_year",
  "account_code",
  "account_name",
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
  "department_display_name",
  "source_funding_category_name",
  "funding_nature",
  "previous_amount_thousand_yen",
  "current_amount_thousand_yen",
  "diff_amount_thousand_yen",
  "is_zero_amount",
  "related_program_count",
  "source_file",
  "source_row_number",
] as const;

export const FORBIDDEN_PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS = [
  "requested_amount_thousand_yen",
  "estimated_amount_thousand_yen",
  "allocated_amount_thousand_yen",
  "unallocated_amount_thousand_yen",
  "request_content",
  "assessment_content",
  "department_code",
  "department_name",
  "source_revenue_number",
  "source_revenue_number_name",
  "source_funding_category_code",
  "allocation_amount_thousand_yen",
] as const;

export const BUDGET_REVENUE_AI_CONSTRAINTS = [
  "このデータは令和8年度当初予算であり、実際に収入された金額や決算額ではありません。",
  "budget_revenue_allocationsは歳入細節と歳出予算事業の関連を示しますが、事業ごとの配分額は示しません。",
  "1つの歳入細節が複数事業に関連する場合があります。歳入額を各事業へ複製してはいけません。",
  "関連する歳入があることと、その歳入全額が当該事業に充当されることは同義ではありません。",
] as const;

export const BUDGET_REVENUE_AI_REASON_CODES = [
  "ACTUAL_REVENUE_NOT_AVAILABLE",
  "REVENUE_SETTLEMENT_NOT_AVAILABLE",
  "REVENUE_ALLOCATION_AMOUNT_NOT_AVAILABLE",
  "CONTRACT_DATA_NOT_AVAILABLE",
  "VENDOR_DATA_NOT_AVAILABLE",
] as const;

export type BudgetRevenueAiReasonCode =
  (typeof BUDGET_REVENUE_AI_REASON_CODES)[number];
export type PublicBudgetRevenueValidationStatus =
  | "ok"
  | "ok_zero_amount";
export type PublicFundingNature =
  | "general"
  | "specific"
  | "special_account";
export type RevenueSourceDisplayMode =
  | "general_and_specific"
  | "source_categories";

export interface PublicBudgetRevenueDetail {
  revenue_detail_id: string;
  revenue_section_id: string;
  revenue_item_key: string;
  fiscal_year: number;
  account_code: string;
  account_name: string;
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
  department_display_name: string;
  source_funding_category_name: string;
  funding_nature: PublicFundingNature;
  previous_amount_thousand_yen: number;
  current_amount_thousand_yen: number;
  diff_amount_thousand_yen: number;
  is_zero_amount: boolean;
  related_program_count: number;
  source_file: string;
  source_row_number: number;
}

export interface PublicRevenueOfficialCsvSourceReference {
  sourceType: "official_csv";
  sourceFile: string;
  sourceRowNumber: number;
}

export interface PublicRevenueOfficialPdfSourceReference {
  sourceType: "official_pdf";
  sourceFile: string;
  pdfPage: number;
  budgetBookPage: number;
}

export interface PublicRevenueDerivedSourceReference {
  sourceType: "derived";
}

export type PublicBudgetRevenueSourceReference =
  | PublicRevenueOfficialCsvSourceReference
  | PublicRevenueOfficialPdfSourceReference
  | PublicRevenueDerivedSourceReference;

export interface PublicBudgetRevenueItemSection {
  revenueSectionId: string;
  setsu: {
    code: string;
    name: string;
  };
  previousAmountThousandYen: number;
  currentAmountThousandYen: number;
  diffAmountThousandYen: number;
  detailCount: number;
  validationStatus: PublicBudgetRevenueValidationStatus;
  sourceReference: PublicRevenueDerivedSourceReference;
}

export interface PublicBudgetRevenueItemDetail {
  revenueDetailId: string;
  revenueSectionId: string;
  setsu: {
    code: string;
    name: string;
  };
  saisetsu: {
    code: string;
    name: string;
  };
  departmentDisplayName: string | null;
  sourceFundingCategoryName: string;
  fundingNature: PublicFundingNature;
  previousAmountThousandYen: number;
  currentAmountThousandYen: number;
  diffAmountThousandYen: number;
  isZeroAmount: boolean;
  relatedProgramCount: number;
  sourceReference: PublicRevenueOfficialCsvSourceReference;
}

export interface PublicBudgetRevenueComposition {
  generalRevenueThousandYen: number;
  specificRevenueThousandYen: number;
  specialAccountRevenueThousandYen: number;
}

export interface PublicBudgetRevenueSourceDisplayEntry {
  label: string;
  amountThousandYen: number;
}

export interface PublicBudgetRevenueSourceDisplay {
  mode: RevenueSourceDisplayMode;
  entries: PublicBudgetRevenueSourceDisplayEntry[];
}

export interface PublicBudgetRevenueDataAvailability {
  actualRevenue: "not_available";
  settlement: "not_available";
  allocationAmounts: "not_available";
}

export interface PublicBudgetRevenueItem {
  revenueItemKey: string;
  fiscalYear: number;
  accountCode: string;
  accountName: string;
  kan: {
    code: string;
    name: string;
  };
  kou: {
    code: string;
    name: string;
  };
  moku: {
    code: string;
    name: string;
  };
  previousAmountThousandYen: number;
  currentAmountThousandYen: number;
  diffAmountThousandYen: number;
  revenueComposition: PublicBudgetRevenueComposition;
  revenueSourceDisplay: PublicBudgetRevenueSourceDisplay;
  sections: PublicBudgetRevenueItemSection[];
  details: PublicBudgetRevenueItemDetail[];
  dataAvailability: PublicBudgetRevenueDataAvailability;
  sourceReferences: PublicBudgetRevenueSourceReference[];
}

export interface PublicBudgetRevenueAllocation {
  allocationLinkId: string;
  revenueDetailId: string;
  targetBudgetProgramGroupId: string | null;
  targetBudgetProgramIdentityId: string;
  targetBudgetItemKey: string;
  targetAccountCode: string;
  targetProgramName: string;
  targetBudgetBookPage: number;
  targetResolutionLevel: "exact_group" | "public_identity";
  candidateTargetGroupCount: number;
  relationType: "allocated_to_program";
  allocationAmountThousandYen: null;
  amountAttributionStatus: "not_available";
  sourceReference: PublicRevenueOfficialPdfSourceReference;
}

export interface PublicBudgetRevenueReadModel {
  details: PublicBudgetRevenueDetail[];
  revenueItems: PublicBudgetRevenueItem[];
  allocations: PublicBudgetRevenueAllocation[];
}

export interface SearchPublicBudgetRevenuesOptions {
  details: readonly PublicBudgetRevenueDetail[];
  includeZeroAmount?: boolean;
  accountCode?: string;
  revenueItemKey?: string;
  fundingNature?: PublicFundingNature;
  sourceFundingCategoryName?: string;
  limit?: number;
}

export interface RelatedRevenueForBudgetProgram {
  revenue: PublicBudgetRevenueDetail;
  relation: PublicBudgetRevenueAllocation;
}

export interface BudgetRevenueAiQueryResult {
  query: string;
  revenueDetails: readonly PublicBudgetRevenueDetail[];
  revenueItems: readonly PublicBudgetRevenueItem[];
  allocations: readonly PublicBudgetRevenueAllocation[];
}

export interface BudgetRevenueAiAnswerableContext {
  answerable: true;
  context: {
    query: string;
    constraints: typeof BUDGET_REVENUE_AI_CONSTRAINTS;
    revenueDetails: readonly PublicBudgetRevenueDetail[];
    revenueItems: readonly PublicBudgetRevenueItem[];
    allocations: readonly PublicBudgetRevenueAllocation[];
  };
}

export interface BudgetRevenueAiUnanswerableResult {
  answerable: false;
  reasonCode: BudgetRevenueAiReasonCode;
  message: string;
}

export type BudgetRevenueAiContextResult =
  | BudgetRevenueAiAnswerableContext
  | BudgetRevenueAiUnanswerableResult;

export interface PublicBudgetRevenueValidation {
  detailRowCount: number;
  itemRowCount: number;
  nestedSectionRowCount: number;
  nestedDetailRowCount: number;
  allocationRowCount: number;
  uniqueRevenueDetailIdCount: number;
  uniqueRevenueItemKeyCount: number;
  uniqueRevenueSectionIdCount: number;
  uniqueAllocationLinkIdCount: number;
  zeroAmountDetailCount: number;
  zeroAmountItemCount: number;
  relatedRevenueDetailCount: number;
  exactGroupAllocationCount: number;
  publicIdentityAllocationCount: number;
  nonNullAllocationAmountCount: number;
  detailCurrentTotalThousandYen: number;
  itemCurrentTotalThousandYen: number;
  sectionCurrentTotalThousandYen: number;
  accountDetailTotalsThousandYen: Record<string, number>;
  accountItemTotalsThousandYen: Record<string, number>;
  blankDepartmentDisplayNameCount: number;
}

const DATA_AVAILABILITY: PublicBudgetRevenueDataAvailability = {
  actualRevenue: "not_available",
  settlement: "not_available",
  allocationAmounts: "not_available",
};

const REASON_MESSAGES: Record<BudgetRevenueAiReasonCode, string> = {
  ACTUAL_REVENUE_NOT_AVAILABLE:
    "実際に収入された金額は、当初予算データには含まれていません。",
  REVENUE_SETTLEMENT_NOT_AVAILABLE:
    "歳入の決算額・収入済額・未収額は、当初予算データには含まれていません。",
  REVENUE_ALLOCATION_AMOUNT_NOT_AVAILABLE:
    "歳入細節と事業の関連は確認できますが、事業ごとの配分額は公開資料から特定できません。",
  CONTRACT_DATA_NOT_AVAILABLE:
    "契約額・契約情報は、当初予算の歳入データには含まれていません。",
  VENDOR_DATA_NOT_AVAILABLE:
    "事業者名・契約先・支払先は、当初予算の歳入データには含まれていません。",
};

function parseInteger(
  value: string,
  fieldName: string,
  options: { positive?: boolean; nonNegative?: boolean } = {},
): number {
  if (!/^-?\d+$/.test(value.trim())) {
    throw new Error(`${fieldName}が整数ではありません: ${value}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${fieldName}が安全な整数範囲外です。`);
  }
  if (options.positive && parsed <= 0) {
    throw new Error(`${fieldName}が正の整数ではありません。`);
  }
  if (options.nonNegative && parsed < 0) {
    throw new Error(`${fieldName}が0以上ではありません。`);
  }
  return parsed;
}

function safeAdd(left: number, right: number, fieldName: string): number {
  const value = left + right;
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${fieldName}が安全な整数範囲外です。`);
  }
  return value;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/\s+/g, " ")
    .trim();
}

function groupBy<T>(
  values: readonly T[],
  getKey: (value: T) => string,
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const value of values) {
    const key = getKey(value);
    const rows = result.get(key) ?? [];
    rows.push(value);
    result.set(key, rows);
  }
  return result;
}

function assertUnique(
  values: readonly string[],
  fieldName: string,
): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${fieldName}が一意ではありません。`);
  }
}

function parsePublicValidationStatus(
  value: string,
  fieldName: string,
): PublicBudgetRevenueValidationStatus {
  if (value === "ok" || value === "ok_zero_amount") {
    return value;
  }
  throw new Error(`${fieldName}が公開可能なstatusではありません: ${value}`);
}

function officialCsvReference(
  detail: Pick<
    PublicBudgetRevenueDetail,
    "source_file" | "source_row_number"
  >,
): PublicRevenueOfficialCsvSourceReference {
  return {
    sourceType: "official_csv",
    sourceFile: detail.source_file,
    sourceRowNumber: detail.source_row_number,
  };
}

function sourceReferenceKey(
  sourceReference: PublicBudgetRevenueSourceReference,
): string {
  if (sourceReference.sourceType === "derived") {
    return "derived";
  }
  if (sourceReference.sourceType === "official_csv") {
    return [
      sourceReference.sourceType,
      sourceReference.sourceFile,
      sourceReference.sourceRowNumber,
    ].join(":");
  }
  return [
    sourceReference.sourceType,
    sourceReference.sourceFile,
    sourceReference.pdfPage,
    sourceReference.budgetBookPage,
  ].join(":");
}

function deduplicateSourceReferences(
  values: readonly PublicBudgetRevenueSourceReference[],
): PublicBudgetRevenueSourceReference[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = sourceReferenceKey(value);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildDepartmentMap(
  departmentMapCsv: string | undefined,
): Map<string, DepartmentNameMapping> {
  if (!departmentMapCsv || departmentMapCsv.trim().length === 0) {
    return new Map();
  }
  return new Map(
    parseDepartmentNameMap(departmentMapCsv).map((mapping) => [
      mapping.department_name_raw.normalize("NFC"),
      mapping,
    ]),
  );
}

function publicDepartmentDisplayName(
  rawDepartmentName: string,
  mappings: ReadonlyMap<string, DepartmentNameMapping>,
): string {
  const mapping = mappings.get(rawDepartmentName.normalize("NFC"));
  if (!mapping || mapping.mapping_status === "needs_review") {
    return "";
  }
  return mapping.department_display_name;
}

function buildPublicAllocations(
  allocations: readonly IdentityResolvedBudgetRevenueAllocation[],
  groups: readonly BudgetProgramIdentitySourceGroup[],
): PublicBudgetRevenueAllocation[] {
  const groupsById = new Map(
    groups.map((group) => [group.budget_program_group_id, group]),
  );
  assertUnique(
    allocations.map((row) => row.allocation_link_id),
    "allocation_link_id",
  );

  return allocations.map((allocation, index) => {
    const prefix = `budget_revenue_allocations.csv row ${index + 1}`;
    if (allocation.target_match_status !== "matched") {
      throw new Error(
        `${prefix}.target_match_statusがmatchedではありません。`,
      );
    }
    if (
      allocation.amount_attribution_status !== "not_available" ||
      allocation.allocation_amount_thousand_yen !== ""
    ) {
      throw new Error(`${prefix}に公開不能な配分額があります。`);
    }
    if (!allocation.target_budget_program_identity_id) {
      throw new Error(
        `${prefix}.target_budget_program_identity_idが空です。`,
      );
    }

    let targetBudgetProgramGroupId: string | null = null;
    let targetProgramName = allocation.matched_budget_program_name;
    if (allocation.target_resolution_level === "exact_group") {
      if (!allocation.target_budget_program_group_id) {
        throw new Error(`${prefix}のexact_groupにgroup IDがありません。`);
      }
      const group = groupsById.get(
        allocation.target_budget_program_group_id,
      );
      if (!group) {
        throw new Error(
          `${prefix}のgroup IDがbudget_program_groups.csvにありません。`,
        );
      }
      if (
        group.budget_item_key !== allocation.target_budget_item_key ||
        group.account_code !== allocation.target_account_code
      ) {
        throw new Error(`${prefix}のgroupとtarget metadataが不一致です。`);
      }
      targetBudgetProgramGroupId =
        allocation.target_budget_program_group_id;
      targetProgramName = group.budget_program_name;
    } else if (
      allocation.target_resolution_level === "public_identity"
    ) {
      if (
        allocation.target_budget_program_group_id !== "" ||
        parseInteger(
          allocation.candidate_target_group_count,
          `${prefix}.candidate_target_group_count`,
          { positive: true },
        ) < 2
      ) {
        throw new Error(
          `${prefix}のpublic_identity解決状態が不正です。`,
        );
      }
    } else {
      throw new Error(
        `${prefix}.target_resolution_levelが不正です。`,
      );
    }

    return {
      allocationLinkId: allocation.allocation_link_id,
      revenueDetailId: allocation.revenue_detail_id,
      targetBudgetProgramGroupId,
      targetBudgetProgramIdentityId:
        allocation.target_budget_program_identity_id,
      targetBudgetItemKey: allocation.target_budget_item_key,
      targetAccountCode: allocation.target_account_code,
      targetProgramName:
        targetProgramName || allocation.pdf_target_program_name,
      targetBudgetBookPage: parseInteger(
        allocation.target_budget_book_page,
        `${prefix}.target_budget_book_page`,
        { positive: true },
      ),
      targetResolutionLevel: allocation.target_resolution_level,
      candidateTargetGroupCount: parseInteger(
        allocation.candidate_target_group_count,
        `${prefix}.candidate_target_group_count`,
        { positive: true },
      ),
      relationType: "allocated_to_program",
      allocationAmountThousandYen: null,
      amountAttributionStatus: "not_available",
      sourceReference: {
        sourceType: "official_pdf",
        sourceFile: allocation.source_file,
        pdfPage: parseInteger(
          allocation.source_pdf_page,
          `${prefix}.source_pdf_page`,
          { positive: true },
        ),
        budgetBookPage: parseInteger(
          allocation.source_budget_book_page,
          `${prefix}.source_budget_book_page`,
          { positive: true },
        ),
      },
    };
  });
}

function buildPublicDetails(
  details: readonly BudgetRevenueDetail[],
  allocations: readonly PublicBudgetRevenueAllocation[],
  departmentMappings: ReadonlyMap<string, DepartmentNameMapping>,
): PublicBudgetRevenueDetail[] {
  const allocationCounts = new Map<string, number>();
  for (const allocation of allocations) {
    allocationCounts.set(
      allocation.revenueDetailId,
      (allocationCounts.get(allocation.revenueDetailId) ?? 0) + 1,
    );
  }
  const detailIds = new Set(
    details.map((detail) => detail.revenue_detail_id),
  );
  for (const allocation of allocations) {
    if (!detailIds.has(allocation.revenueDetailId)) {
      throw new Error(
        `公開allocationのrevenue_detail_idが存在しません: ` +
          allocation.revenueDetailId,
      );
    }
  }

  return details.map((detail) => ({
    revenue_detail_id: detail.revenue_detail_id,
    revenue_section_id: detail.revenue_section_id,
    revenue_item_key: detail.revenue_item_key,
    fiscal_year: detail.fiscal_year,
    account_code: detail.account_code,
    account_name: detail.account_name,
    kan_code: detail.kan_code,
    kan_name: detail.kan_name,
    kou_code: detail.kou_code,
    kou_name: detail.kou_name,
    moku_code: detail.moku_code,
    moku_name: detail.moku_name,
    setsu_code: detail.setsu_code,
    setsu_name: detail.setsu_name,
    saisetsu_code: detail.saisetsu_code,
    saisetsu_name: detail.saisetsu_name,
    department_display_name: publicDepartmentDisplayName(
      detail.department_name,
      departmentMappings,
    ),
    source_funding_category_name:
      detail.source_funding_category_name,
    funding_nature: detail.funding_nature,
    previous_amount_thousand_yen:
      detail.previous_amount_thousand_yen,
    current_amount_thousand_yen:
      detail.current_amount_thousand_yen,
    diff_amount_thousand_yen:
      detail.current_amount_thousand_yen -
      detail.previous_amount_thousand_yen,
    is_zero_amount: detail.is_zero_amount,
    related_program_count:
      allocationCounts.get(detail.revenue_detail_id) ?? 0,
    source_file: detail.source_file,
    source_row_number: detail.source_row_number,
  }));
}

function buildRevenueSourceDisplay(
  item: BudgetRevenueItem,
  details: readonly PublicBudgetRevenueDetail[],
): PublicBudgetRevenueSourceDisplay {
  if (item.account_code === "general") {
    return {
      mode: "general_and_specific",
      entries: [
        {
          label: "一般財源",
          amountThousandYen: item.general_revenue_thousand_yen,
        },
        {
          label: "特定財源",
          amountThousandYen: item.specific_revenue_thousand_yen,
        },
      ],
    };
  }

  const totals = new Map<string, number>();
  for (const detail of details) {
    totals.set(
      detail.source_funding_category_name,
      safeAdd(
        totals.get(detail.source_funding_category_name) ?? 0,
        detail.current_amount_thousand_yen,
        `${item.revenue_item_key}.source category total`,
      ),
    );
  }
  return {
    mode: "source_categories",
    entries: [...totals.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "ja"))
      .map(([label, amountThousandYen]) => ({
        label,
        amountThousandYen,
      })),
  };
}

function buildPublicRevenueItems(
  coreItems: readonly BudgetRevenueItem[],
  coreSections: readonly BudgetRevenueSection[],
  details: readonly PublicBudgetRevenueDetail[],
): PublicBudgetRevenueItem[] {
  const detailsByItem = groupBy(
    details,
    (detail) => detail.revenue_item_key,
  );
  const sectionsByItem = groupBy(
    coreSections,
    (section) => section.revenue_item_key,
  );
  const itemKeys = new Set(
    coreItems.map((item) => item.revenue_item_key),
  );
  for (const key of detailsByItem.keys()) {
    if (!itemKeys.has(key)) {
      throw new Error(`budget_revenue_items.csvにないdetailです: ${key}`);
    }
  }
  for (const key of sectionsByItem.keys()) {
    if (!itemKeys.has(key)) {
      throw new Error(`budget_revenue_items.csvにないsectionです: ${key}`);
    }
  }

  return coreItems.map((item) => {
    const itemDetails = detailsByItem.get(item.revenue_item_key) ?? [];
    const itemSections =
      sectionsByItem.get(item.revenue_item_key) ?? [];
    const status = parsePublicValidationStatus(
      item.validation_status,
      `${item.revenue_item_key}.validation_status`,
    );
    if (
      itemDetails.length !== item.detail_count ||
      itemSections.length !== item.section_count
    ) {
      throw new Error(`${item.revenue_item_key}の内包行数が不一致です。`);
    }
    const detailPreviousTotal = itemDetails.reduce(
      (total, detail) =>
        safeAdd(
          total,
          detail.previous_amount_thousand_yen,
          `${item.revenue_item_key}.detail previous total`,
        ),
      0,
    );
    const detailCurrentTotal = itemDetails.reduce(
      (total, detail) =>
        safeAdd(
          total,
          detail.current_amount_thousand_yen,
          `${item.revenue_item_key}.detail current total`,
        ),
      0,
    );
    const sectionCurrentTotal = itemSections.reduce(
      (total, section) =>
        safeAdd(
          total,
          section.current_amount_thousand_yen,
          `${item.revenue_item_key}.section current total`,
        ),
      0,
    );
    if (
      detailPreviousTotal !== item.previous_amount_thousand_yen ||
      detailCurrentTotal !== item.current_amount_thousand_yen ||
      sectionCurrentTotal !== item.current_amount_thousand_yen ||
      item.diff_amount_thousand_yen !==
        item.current_amount_thousand_yen -
          item.previous_amount_thousand_yen
    ) {
      throw new Error(`${item.revenue_item_key}の金額集約が不一致です。`);
    }
    if (
      (status === "ok" && item.current_amount_thousand_yen <= 0) ||
      (status === "ok_zero_amount" &&
        item.current_amount_thousand_yen !== 0)
    ) {
      throw new Error(`${item.revenue_item_key}のstatusと金額が不整合です。`);
    }

    const revenueComposition: PublicBudgetRevenueComposition = {
      generalRevenueThousandYen:
        item.general_revenue_thousand_yen,
      specificRevenueThousandYen:
        item.specific_revenue_thousand_yen,
      specialAccountRevenueThousandYen:
        item.special_account_revenue_thousand_yen,
    };
    if (item.account_code === "general") {
      if (
        revenueComposition.specialAccountRevenueThousandYen !== 0 ||
        revenueComposition.generalRevenueThousandYen +
          revenueComposition.specificRevenueThousandYen !==
          item.current_amount_thousand_yen
      ) {
        throw new Error(
          `${item.revenue_item_key}の一般会計財源構成が不正です。`,
        );
      }
    } else if (
      revenueComposition.generalRevenueThousandYen !== 0 ||
      revenueComposition.specificRevenueThousandYen !== 0 ||
      revenueComposition.specialAccountRevenueThousandYen !==
        item.current_amount_thousand_yen
    ) {
      throw new Error(
        `${item.revenue_item_key}の特別会計財源構成が不正です。`,
      );
    }

    const publicSections: PublicBudgetRevenueItemSection[] =
      itemSections.map((section) => ({
        revenueSectionId: section.revenue_section_id,
        setsu: {
          code: section.setsu_code,
          name: section.setsu_name,
        },
        previousAmountThousandYen:
          section.previous_amount_thousand_yen,
        currentAmountThousandYen:
          section.current_amount_thousand_yen,
        diffAmountThousandYen:
          section.diff_amount_thousand_yen,
        detailCount: section.detail_count,
        validationStatus: parsePublicValidationStatus(
          section.validation_status,
          `${section.revenue_section_id}.validation_status`,
        ),
        sourceReference: { sourceType: "derived" },
      }));
    const publicDetails: PublicBudgetRevenueItemDetail[] =
      itemDetails.map((detail) => ({
        revenueDetailId: detail.revenue_detail_id,
        revenueSectionId: detail.revenue_section_id,
        setsu: {
          code: detail.setsu_code,
          name: detail.setsu_name,
        },
        saisetsu: {
          code: detail.saisetsu_code,
          name: detail.saisetsu_name,
        },
        departmentDisplayName:
          detail.department_display_name || null,
        sourceFundingCategoryName:
          detail.source_funding_category_name,
        fundingNature: detail.funding_nature,
        previousAmountThousandYen:
          detail.previous_amount_thousand_yen,
        currentAmountThousandYen:
          detail.current_amount_thousand_yen,
        diffAmountThousandYen:
          detail.diff_amount_thousand_yen,
        isZeroAmount: detail.is_zero_amount,
        relatedProgramCount: detail.related_program_count,
        sourceReference: officialCsvReference(detail),
      }));
    const revenueSourceDisplay = buildRevenueSourceDisplay(
      item,
      itemDetails,
    );
    const displayTotal = revenueSourceDisplay.entries.reduce(
      (total, entry) =>
        safeAdd(
          total,
          entry.amountThousandYen,
          `${item.revenue_item_key}.display total`,
        ),
      0,
    );
    if (displayTotal !== item.current_amount_thousand_yen) {
      throw new Error(
        `${item.revenue_item_key}の表示用歳入源合計が不一致です。`,
      );
    }

    return {
      revenueItemKey: item.revenue_item_key,
      fiscalYear: item.fiscal_year,
      accountCode: item.account_code,
      accountName: item.account_name,
      kan: { code: item.kan_code, name: item.kan_name },
      kou: { code: item.kou_code, name: item.kou_name },
      moku: { code: item.moku_code, name: item.moku_name },
      previousAmountThousandYen:
        item.previous_amount_thousand_yen,
      currentAmountThousandYen:
        item.current_amount_thousand_yen,
      diffAmountThousandYen: item.diff_amount_thousand_yen,
      revenueComposition,
      revenueSourceDisplay,
      sections: publicSections,
      details: publicDetails,
      dataAvailability: { ...DATA_AVAILABILITY },
      sourceReferences: deduplicateSourceReferences([
        { sourceType: "derived" },
        ...itemDetails.map(officialCsvReference),
      ]),
    };
  });
}

export function buildPublicBudgetRevenueReadModel(
  detailsCsv: string,
  sectionsCsv: string,
  itemsCsv: string,
  allocationsCsv: string,
  programGroupsCsv: string,
  departmentMapCsv?: string,
): PublicBudgetRevenueReadModel {
  const coreDetails = parseRevenueValidationDetails(detailsCsv);
  const coreSections = parseBudgetRevenueSectionRows(sectionsCsv);
  const coreItems = parseRevenueValidationItems(itemsCsv);
  const allocations =
    parseBudgetRevenueAllocationsForIdentityResolution(
      allocationsCsv,
    );
  const programGroups =
    parseBudgetProgramIdentitySourceGroups(programGroupsCsv);
  const publicAllocations = buildPublicAllocations(
    allocations,
    programGroups,
  );
  const publicDetails = buildPublicDetails(
    coreDetails,
    publicAllocations,
    buildDepartmentMap(departmentMapCsv),
  );
  return {
    details: publicDetails,
    revenueItems: buildPublicRevenueItems(
      coreItems,
      coreSections,
      publicDetails,
    ),
    allocations: publicAllocations,
  };
}

export function serializePublicBudgetRevenueDetails(
  details: readonly PublicBudgetRevenueDetail[],
): string {
  return stringify(
    details.map((detail) => ({
      ...detail,
      is_zero_amount: String(detail.is_zero_amount),
    })),
    {
      columns: [...PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS],
      header: true,
      record_delimiter: "unix",
    },
  );
}

export function serializePublicBudgetRevenueItems(
  revenueItems: readonly PublicBudgetRevenueItem[],
): string {
  return `${JSON.stringify(revenueItems, null, 2)}\n`;
}

export function serializePublicBudgetRevenueAllocations(
  allocations: readonly PublicBudgetRevenueAllocation[],
): string {
  return `${JSON.stringify(allocations, null, 2)}\n`;
}

export function searchPublicBudgetRevenues(
  query: string,
  options: SearchPublicBudgetRevenuesOptions,
): PublicBudgetRevenueDetail[] {
  const limit = options.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 5_000) {
    throw new Error("limitは1以上5,000以下の整数にしてください。");
  }
  const terms = normalizeSearchText(query)
    .split(" ")
    .filter(Boolean);
  const result: PublicBudgetRevenueDetail[] = [];

  for (const detail of options.details) {
    if (!options.includeZeroAmount && detail.is_zero_amount) {
      continue;
    }
    if (
      options.accountCode &&
      detail.account_code !== options.accountCode
    ) {
      continue;
    }
    if (
      options.revenueItemKey &&
      detail.revenue_item_key !== options.revenueItemKey
    ) {
      continue;
    }
    if (
      options.fundingNature &&
      detail.funding_nature !== options.fundingNature
    ) {
      continue;
    }
    if (
      options.sourceFundingCategoryName &&
      detail.source_funding_category_name !==
        options.sourceFundingCategoryName
    ) {
      continue;
    }
    const searchable = normalizeSearchText(
      [
        detail.revenue_detail_id,
        detail.revenue_item_key,
        detail.account_name,
        detail.kan_name,
        detail.kou_name,
        detail.moku_name,
        detail.setsu_name,
        detail.saisetsu_name,
        detail.department_display_name,
        detail.source_funding_category_name,
      ].join(" "),
    );
    if (
      terms.length > 0 &&
      !terms.every((term) => searchable.includes(term))
    ) {
      continue;
    }
    result.push(detail);
    if (result.length === limit) {
      break;
    }
  }
  return result;
}

export function getPublicBudgetRevenueItemDetail(
  revenueItemKey: string,
  revenueItems: readonly PublicBudgetRevenueItem[],
): PublicBudgetRevenueItem | null {
  const key = revenueItemKey.trim();
  if (!key) {
    throw new Error("revenueItemKeyが空です。");
  }
  return (
    revenueItems.find((item) => item.revenueItemKey === key) ?? null
  );
}

export function getRelatedExpenditurePrograms(
  revenueDetailId: string,
  allocations: readonly PublicBudgetRevenueAllocation[],
): PublicBudgetRevenueAllocation[] {
  const id = revenueDetailId.trim();
  if (!id) {
    throw new Error("revenueDetailIdが空です。");
  }
  return allocations.filter(
    (allocation) => allocation.revenueDetailId === id,
  );
}

export function getRelatedRevenuesForBudgetProgram(
  budgetProgramGroupId: string,
  allocations: readonly PublicBudgetRevenueAllocation[],
  details: readonly PublicBudgetRevenueDetail[],
): RelatedRevenueForBudgetProgram[] {
  const id = budgetProgramGroupId.trim();
  if (!id) {
    throw new Error("budgetProgramGroupIdが空です。");
  }
  const detailsById = new Map(
    details.map((detail) => [detail.revenue_detail_id, detail]),
  );
  return allocations
    .filter(
      (allocation) =>
        allocation.targetBudgetProgramGroupId === id &&
        allocation.targetResolutionLevel === "exact_group",
    )
    .map((relation) => {
      const revenue = detailsById.get(relation.revenueDetailId);
      if (!revenue) {
        throw new Error(
          `公開歳入detailがありません: ${relation.revenueDetailId}`,
        );
      }
      return { revenue, relation };
    });
}

export function classifyBudgetRevenueQuestionAvailability(
  query: string,
): BudgetRevenueAiReasonCode | null {
  const normalized = normalizeSearchText(query);
  if (
    /(支払先|業者|事業者名|会社名|どこの会社|契約先|委託先|受託者)/u.test(
      normalized,
    )
  ) {
    return "VENDOR_DATA_NOT_AVAILABLE";
  }
  if (
    /(契約額|契約金額|契約情報|契約内容|落札|随意契約)/u.test(
      normalized,
    )
  ) {
    return "CONTRACT_DATA_NOT_AVAILABLE";
  }
  if (
    /(決算|収入済額|収入未済|未収|不納欠損|歳入実績)/u.test(
      normalized,
    )
  ) {
    return "REVENUE_SETTLEMENT_NOT_AVAILABLE";
  }
  if (
    /(実際.*(?:収入|入った|入って)|実収入|収入実績|徴収実績|収納実績)/u.test(
      normalized,
    )
  ) {
    return "ACTUAL_REVENUE_NOT_AVAILABLE";
  }
  if (
    /(配分額|充当額|事業ごと.*(?:いくら|金額)|(?:この|各|個別の?)事業.*(?:いくら充当|何円充当|いくら使)|(?:いくら|何円).*(?:この|各|個別の?)事業.*(?:充当|使))/u.test(
      normalized,
    )
  ) {
    return "REVENUE_ALLOCATION_AMOUNT_NOT_AVAILABLE";
  }
  return null;
}

export function buildBudgetRevenueAiContext(
  result: BudgetRevenueAiQueryResult,
): BudgetRevenueAiContextResult {
  const reasonCode = classifyBudgetRevenueQuestionAvailability(
    result.query,
  );
  if (reasonCode) {
    return {
      answerable: false,
      reasonCode,
      message: REASON_MESSAGES[reasonCode],
    };
  }
  return {
    answerable: true,
    context: {
      query: result.query,
      constraints: BUDGET_REVENUE_AI_CONSTRAINTS,
      revenueDetails: result.revenueDetails,
      revenueItems: result.revenueItems,
      allocations: result.allocations,
    },
  };
}

function assertExactKeys(
  value: object,
  expectedKeys: readonly string[],
  fieldName: string,
): void {
  const keys = Object.keys(value);
  if (keys.join(",") !== expectedKeys.join(",")) {
    throw new Error(
      `${fieldName}の公開スキーマが不正です: ${keys.join(",")}`,
    );
  }
}

function createAccountTotals(): Record<string, number> {
  return Object.fromEntries(
    Object.keys(
      EXPECTED_PUBLIC_BUDGET_REVENUE_ACCOUNT_TOTALS,
    ).map((accountCode) => [accountCode, 0]),
  );
}

function addAccountTotal(
  totals: Record<string, number>,
  accountCode: string,
  amount: number,
  fieldName: string,
): void {
  if (!(accountCode in totals)) {
    throw new Error(`${fieldName}に未定義会計があります: ${accountCode}`);
  }
  totals[accountCode] = safeAdd(
    totals[accountCode],
    amount,
    fieldName,
  );
}

function assertExpectedAccountTotals(
  totals: Record<string, number>,
  fieldName: string,
): void {
  for (const [accountCode, expected] of Object.entries(
    EXPECTED_PUBLIC_BUDGET_REVENUE_ACCOUNT_TOTALS,
  )) {
    if (totals[accountCode] !== expected) {
      throw new Error(
        `${fieldName}.${accountCode}が不一致です: ` +
          `${totals[accountCode]} != ${expected}`,
      );
    }
  }
}

export function validatePublicBudgetRevenueDetailCsv(
  csvText: string,
): void {
  const rows = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (rows.length < 2) {
    throw new Error(
      "public_budget_revenue_details.csvにデータがありません。",
    );
  }
  if (
    rows[0].join(",") !==
    PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS.join(",")
  ) {
    throw new Error(
      "public_budget_revenue_details.csvの列が公開スキーマと一致しません。",
    );
  }
  for (const forbidden of FORBIDDEN_PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS) {
    if (rows[0].includes(forbidden)) {
      throw new Error(`公開禁止列があります: ${forbidden}`);
    }
  }
}

export function validatePublicBudgetRevenueReadModel(
  model: PublicBudgetRevenueReadModel,
): PublicBudgetRevenueValidation {
  if (
    model.details.length !==
      EXPECTED_PUBLIC_BUDGET_REVENUE_DETAIL_ROW_COUNT ||
    model.revenueItems.length !==
      EXPECTED_PUBLIC_BUDGET_REVENUE_ITEM_ROW_COUNT ||
    model.allocations.length !==
      EXPECTED_PUBLIC_BUDGET_REVENUE_ALLOCATION_ROW_COUNT
  ) {
    throw new Error("公開歳入モデルの行数が期待値と一致しません。");
  }

  assertUnique(
    model.details.map((detail) => detail.revenue_detail_id),
    "公開revenue_detail_id",
  );
  assertUnique(
    model.revenueItems.map((item) => item.revenueItemKey),
    "公開revenueItemKey",
  );
  assertUnique(
    model.allocations.map((allocation) => allocation.allocationLinkId),
    "公開allocationLinkId",
  );

  const detailIds = new Set(
    model.details.map((detail) => detail.revenue_detail_id),
  );
  const relatedCounts = new Map<string, number>();
  const accountDetailTotals = createAccountTotals();
  const accountItemTotals = createAccountTotals();
  let detailTotal = 0;
  let itemTotal = 0;
  let sectionTotal = 0;
  let nestedSectionCount = 0;
  let nestedDetailCount = 0;
  let exactGroupAllocationCount = 0;
  let publicIdentityAllocationCount = 0;
  let nonNullAllocationAmountCount = 0;

  for (const allocation of model.allocations) {
    assertExactKeys(
      allocation,
      [
        "allocationLinkId",
        "revenueDetailId",
        "targetBudgetProgramGroupId",
        "targetBudgetProgramIdentityId",
        "targetBudgetItemKey",
        "targetAccountCode",
        "targetProgramName",
        "targetBudgetBookPage",
        "targetResolutionLevel",
        "candidateTargetGroupCount",
        "relationType",
        "allocationAmountThousandYen",
        "amountAttributionStatus",
        "sourceReference",
      ],
      `allocation ${allocation.allocationLinkId}`,
    );
    if (!detailIds.has(allocation.revenueDetailId)) {
      throw new Error(
        `公開allocationの歳入detail参照がありません: ` +
          allocation.revenueDetailId,
      );
    }
    relatedCounts.set(
      allocation.revenueDetailId,
      (relatedCounts.get(allocation.revenueDetailId) ?? 0) + 1,
    );
    if (allocation.allocationAmountThousandYen !== null) {
      nonNullAllocationAmountCount += 1;
    }
    if (
      allocation.relationType !== "allocated_to_program" ||
      allocation.amountAttributionStatus !== "not_available" ||
      allocation.allocationAmountThousandYen !== null
    ) {
      throw new Error(
        `${allocation.allocationLinkId}に金額帰属があります。`,
      );
    }
    if (allocation.targetResolutionLevel === "exact_group") {
      exactGroupAllocationCount += 1;
      if (
        !allocation.targetBudgetProgramGroupId ||
        allocation.candidateTargetGroupCount !== 1
      ) {
        throw new Error(
          `${allocation.allocationLinkId}のexact_groupが不正です。`,
        );
      }
    } else {
      publicIdentityAllocationCount += 1;
      if (
        allocation.targetBudgetProgramGroupId !== null ||
        allocation.candidateTargetGroupCount < 2
      ) {
        throw new Error(
          `${allocation.allocationLinkId}のpublic_identityが不正です。`,
        );
      }
    }
    assertExactKeys(
      allocation.sourceReference,
      ["sourceType", "sourceFile", "pdfPage", "budgetBookPage"],
      `${allocation.allocationLinkId}.sourceReference`,
    );
  }

  for (const detail of model.details) {
    assertExactKeys(
      detail,
      PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS,
      `detail ${detail.revenue_detail_id}`,
    );
    if (
      detail.diff_amount_thousand_yen !==
        detail.current_amount_thousand_yen -
          detail.previous_amount_thousand_yen ||
      detail.is_zero_amount !==
        (detail.current_amount_thousand_yen === 0) ||
      detail.related_program_count !==
        (relatedCounts.get(detail.revenue_detail_id) ?? 0)
    ) {
      throw new Error(
        `${detail.revenue_detail_id}の金額・0円・関係件数が不整合です。`,
      );
    }
    if (
      detail.account_code === "general" &&
      detail.funding_nature === "special_account"
    ) {
      throw new Error(
        `${detail.revenue_detail_id}の一般会計分類が不正です。`,
      );
    }
    if (
      detail.account_code !== "general" &&
      detail.funding_nature !== "special_account"
    ) {
      throw new Error(
        `${detail.revenue_detail_id}の特別会計分類が不正です。`,
      );
    }
    if (
      detail.department_display_name.includes("＊") ||
      detail.source_file.length === 0 ||
      detail.source_row_number <= 0
    ) {
      throw new Error(
        `${detail.revenue_detail_id}に内部部署名または不正な出典があります。`,
      );
    }
    detailTotal = safeAdd(
      detailTotal,
      detail.current_amount_thousand_yen,
      "public detail total",
    );
    addAccountTotal(
      accountDetailTotals,
      detail.account_code,
      detail.current_amount_thousand_yen,
      "public detail account total",
    );
  }

  const nestedDetailIds = new Set<string>();
  const sectionIds = new Set<string>();
  for (const item of model.revenueItems) {
    assertExactKeys(
      item,
      [
        "revenueItemKey",
        "fiscalYear",
        "accountCode",
        "accountName",
        "kan",
        "kou",
        "moku",
        "previousAmountThousandYen",
        "currentAmountThousandYen",
        "diffAmountThousandYen",
        "revenueComposition",
        "revenueSourceDisplay",
        "sections",
        "details",
        "dataAvailability",
        "sourceReferences",
      ],
      `item ${item.revenueItemKey}`,
    );
    if (
      item.diffAmountThousandYen !==
      item.currentAmountThousandYen -
        item.previousAmountThousandYen
    ) {
      throw new Error(`${item.revenueItemKey}の差額が不正です。`);
    }
    if (
      item.dataAvailability.actualRevenue !== "not_available" ||
      item.dataAvailability.settlement !== "not_available" ||
      item.dataAvailability.allocationAmounts !== "not_available"
    ) {
      throw new Error(
        `${item.revenueItemKey}のdataAvailabilityが不正です。`,
      );
    }
    const displayTotal = item.revenueSourceDisplay.entries.reduce(
      (total, entry) =>
        safeAdd(
          total,
          entry.amountThousandYen,
          `${item.revenueItemKey}.display total`,
        ),
      0,
    );
    if (displayTotal !== item.currentAmountThousandYen) {
      throw new Error(
        `${item.revenueItemKey}の表示用歳入源合計が不一致です。`,
      );
    }
    if (item.accountCode === "general") {
      if (
        item.revenueSourceDisplay.mode !==
          "general_and_specific" ||
        item.revenueSourceDisplay.entries
          .map((entry) => entry.label)
          .join(",") !== "一般財源,特定財源" ||
        item.revenueComposition.specialAccountRevenueThousandYen !==
          0
      ) {
        throw new Error(
          `${item.revenueItemKey}の一般会計表示規則が不正です。`,
        );
      }
    } else if (
      item.revenueSourceDisplay.mode !== "source_categories" ||
      item.revenueSourceDisplay.entries.some((entry) =>
        ["一般財源", "特定財源"].includes(entry.label),
      ) ||
      item.revenueComposition.generalRevenueThousandYen !== 0 ||
      item.revenueComposition.specificRevenueThousandYen !== 0
    ) {
      throw new Error(
        `${item.revenueItemKey}の特別会計表示規則が不正です。`,
      );
    }
    const itemDetailTotal = item.details.reduce((total, detail) => {
      nestedDetailIds.add(detail.revenueDetailId);
      nestedDetailCount += 1;
      return safeAdd(
        total,
        detail.currentAmountThousandYen,
        `${item.revenueItemKey}.detail total`,
      );
    }, 0);
    const itemSectionTotal = item.sections.reduce(
      (total, section) => {
        sectionIds.add(section.revenueSectionId);
        nestedSectionCount += 1;
        return safeAdd(
          total,
          section.currentAmountThousandYen,
          `${item.revenueItemKey}.section total`,
        );
      },
      0,
    );
    if (
      itemDetailTotal !== item.currentAmountThousandYen ||
      itemSectionTotal !== item.currentAmountThousandYen
    ) {
      throw new Error(
        `${item.revenueItemKey}のdetails・sections合計が不一致です。`,
      );
    }
    itemTotal = safeAdd(
      itemTotal,
      item.currentAmountThousandYen,
      "public item total",
    );
    sectionTotal = safeAdd(
      sectionTotal,
      itemSectionTotal,
      "public section total",
    );
    addAccountTotal(
      accountItemTotals,
      item.accountCode,
      item.currentAmountThousandYen,
      "public item account total",
    );
  }

  if (
    nestedDetailIds.size !== model.details.length ||
    nestedDetailCount !== model.details.length ||
    sectionIds.size !== EXPECTED_PUBLIC_BUDGET_REVENUE_SECTION_ROW_COUNT ||
    nestedSectionCount !==
      EXPECTED_PUBLIC_BUDGET_REVENUE_SECTION_ROW_COUNT
  ) {
    throw new Error("公開itemsのdetails・sections所属が不正です。");
  }
  if (
    detailTotal !==
      EXPECTED_PUBLIC_BUDGET_REVENUE_TOTAL_THOUSAND_YEN ||
    itemTotal !==
      EXPECTED_PUBLIC_BUDGET_REVENUE_TOTAL_THOUSAND_YEN ||
    sectionTotal !==
      EXPECTED_PUBLIC_BUDGET_REVENUE_TOTAL_THOUSAND_YEN
  ) {
    throw new Error("公開歳入モデルの全会計合計が不一致です。");
  }
  assertExpectedAccountTotals(
    accountDetailTotals,
    "public details",
  );
  assertExpectedAccountTotals(accountItemTotals, "public items");

  const validation: PublicBudgetRevenueValidation = {
    detailRowCount: model.details.length,
    itemRowCount: model.revenueItems.length,
    nestedSectionRowCount: nestedSectionCount,
    nestedDetailRowCount: nestedDetailCount,
    allocationRowCount: model.allocations.length,
    uniqueRevenueDetailIdCount: detailIds.size,
    uniqueRevenueItemKeyCount: model.revenueItems.length,
    uniqueRevenueSectionIdCount: sectionIds.size,
    uniqueAllocationLinkIdCount: model.allocations.length,
    zeroAmountDetailCount: model.details.filter(
      (detail) => detail.is_zero_amount,
    ).length,
    zeroAmountItemCount: model.revenueItems.filter(
      (item) => item.currentAmountThousandYen === 0,
    ).length,
    relatedRevenueDetailCount: relatedCounts.size,
    exactGroupAllocationCount,
    publicIdentityAllocationCount,
    nonNullAllocationAmountCount,
    detailCurrentTotalThousandYen: detailTotal,
    itemCurrentTotalThousandYen: itemTotal,
    sectionCurrentTotalThousandYen: sectionTotal,
    accountDetailTotalsThousandYen: accountDetailTotals,
    accountItemTotalsThousandYen: accountItemTotals,
    blankDepartmentDisplayNameCount: model.details.filter(
      (detail) => detail.department_display_name.length === 0,
    ).length,
  };
  if (
    validation.zeroAmountDetailCount !==
      EXPECTED_PUBLIC_ZERO_REVENUE_DETAIL_COUNT ||
    validation.zeroAmountItemCount !==
      EXPECTED_PUBLIC_ZERO_REVENUE_ITEM_COUNT ||
    validation.relatedRevenueDetailCount !==
      EXPECTED_PUBLIC_RELATED_REVENUE_DETAIL_COUNT ||
    validation.exactGroupAllocationCount !==
      EXPECTED_PUBLIC_EXACT_GROUP_ALLOCATION_COUNT ||
    validation.publicIdentityAllocationCount !==
      EXPECTED_PUBLIC_IDENTITY_ALLOCATION_COUNT ||
    validation.nonNullAllocationAmountCount !== 0
  ) {
    throw new Error("公開歳入モデルの固定件数が不一致です。");
  }
  return validation;
}

export function renderPublicBudgetRevenueUsageRules(): string {
  return `---
title: "令和8年度当初予算 公開歳入データ利用ルール"
updated: 2026-07-29
tags:
  - みらい議会
  - 世田谷区
  - 予算
  - 公開データ
related:
  - 世田谷区令和8年度予算データ基盤
---

# 令和8年度当初予算 公開歳入データ利用ルール

## 対象

公開対象は令和8年度世田谷区当初予算の歳入予算と、公式予算説明書に記載された歳入細節・歳出予算事業の関連である。実収入、決算、契約、事業者、事業ごとの配分額は対象外。

## 公開成果物

| ファイル | 粒度・用途 |
| --- | --- |
| \`public_budget_revenue_details.csv\` | 歳入細節×所属。検索・一覧用 |
| \`public_budget_revenue_items.json\` | 款・項・目単位。節と細節を兄弟配列で持つ詳細・AI用モデル |
| \`public_budget_revenue_allocations.json\` | 歳入細節と歳出予算事業の関係。金額を持たない |

公開成果物はコアCSVから派生生成し、コアの値、ID、行数を変更しない。

## 一般会計と特別会計

一般会計は\`revenueSourceDisplay.mode=general_and_specific\`とし、「一般財源」「特定財源」の2区分を表示できる。

特別会計は\`revenueSourceDisplay.mode=source_categories\`とし、国民健康保険料、後期高齢者医療保険料、繰入金、国庫支出金、都支出金など、公式CSVの\`source_funding_category_name\`単位で表示する。特別会計を「一般財源／特定財源」に二分して表示してはいけない。

## 充当関係

- allocationは関係データであり、金銭フローデータではない。
- \`allocationAmountThousandYen\`は全件\`null\`、\`amountAttributionStatus\`は全件\`not_available\`。
- allocationを合計してはいけない。
- sourceの歳入額を複数targetへコピーしてはいけない。
- 関連する歳入があることと、その全額が当該事業へ充当されることは同義ではない。
- 金額付きサンキー図を作ってはいけない。

\`exact_group\`は内部予算事業groupまで一意に確定した関係で、\`targetBudgetProgramGroupId\`を持つ。\`public_identity\`は公式PDFから内部groupを区別できず、group IDを\`null\`のまま\`targetBudgetProgramIdentityId\`へ接続する。public identityを候補groupへ推測で割り当ててはいけない。

## 0円データ

0円のdetails・itemsは公開成果物に保持する。通常検索では\`is_zero_amount=true\`を除外し、\`includeZeroAmount=true\`の場合だけ含める。

## AI制約

AIコンテキストには次の4文を改変せず含める。

> ${BUDGET_REVENUE_AI_CONSTRAINTS[0]}

> ${BUDGET_REVENUE_AI_CONSTRAINTS[1]}

> ${BUDGET_REVENUE_AI_CONSTRAINTS[2]}

> ${BUDGET_REVENUE_AI_CONSTRAINTS[3]}

当初予算を実績と表現してはいけない。配分額が不明な状態で「この事業に○円使われる」と断定してはいけない。

## 回答不能コード

| reasonCode | 対象 |
| --- | --- |
| \`ACTUAL_REVENUE_NOT_AVAILABLE\` | 実際の収入額・徴収実績 |
| \`REVENUE_SETTLEMENT_NOT_AVAILABLE\` | 決算・収入済額・未収額 |
| \`REVENUE_ALLOCATION_AMOUNT_NOT_AVAILABLE\` | 事業ごとの配分・充当額 |
| \`CONTRACT_DATA_NOT_AVAILABLE\` | 契約額・契約情報 |
| \`VENDOR_DATA_NOT_AVAILABLE\` | 事業者・契約先・支払先 |

## 利用関数

- \`searchPublicBudgetRevenues(query, options)\`
- \`getPublicBudgetRevenueItemDetail(revenueItemKey, revenueItems)\`
- \`getRelatedExpenditurePrograms(revenueDetailId, allocations)\`
- \`getRelatedRevenuesForBudgetProgram(budgetProgramGroupId, allocations, details)\`
- \`buildBudgetRevenueAiContext(result)\`

\`getRelatedRevenuesForBudgetProgram\`は、内部groupまで確定した\`exact_group\`だけを返す。\`public_identity\`を個別groupの関連歳入として返してはいけない。

## 出典

歳入細節は公式CSVのファイル名・論理行番号、allocationは公式PDFの物理ページ・冊子ページを保持する。内部部署略称は公開せず、根拠付き表示名がない場合は空欄または\`null\`とする。

## 生成

\`\`\`bash
pnpm budget:revenue:public
\`\`\`
`;
}
