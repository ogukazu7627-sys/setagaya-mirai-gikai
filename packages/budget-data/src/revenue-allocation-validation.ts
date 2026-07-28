import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { BudgetAccountsConfig } from "./budget-accounts";
import {
  EXPECTED_BUDGET_PROGRAM_IDENTITY_ROW_COUNT,
  EXPECTED_MULTIPLE_GROUP_IDENTITY_COUNT,
  type BudgetProgramIdentityBuildResult,
  type BudgetProgramIdentitySourceGroup,
  transformBudgetProgramIdentities,
  validateBudgetProgramIdentities,
} from "./budget-program-identities";
import {
  EXPECTED_BUDGET_PROGRAM_GROUP_ROW_COUNT,
  parseBudgetProgramGroupSourceItems,
  parseBudgetProgramGroupSourcePrograms,
  parseBudgetProgramGroupSourceSections,
  parseCandidateBudgetBookPages,
  serializeBudgetProgramGroups,
  transformBudgetProgramGroups,
  validateBudgetProgramGroups,
} from "./budget-program-groups";
import type { BudgetRevenueDetail } from "./budget-revenue-details";
import type { BudgetRevenueValidationResult } from "./budget-revenue-validation";
import {
  type IdentityResolvedBudgetRevenueAllocation,
} from "./revenue-allocation-identity-resolution";
import {
  type RawPdfRevenueAllocation,
  groupRawPdfRevenueAllocations,
} from "./revenue-allocation-source-matches";
import { TARGET_PAGE_FORWARD_OFFSETS } from "./revenue-allocation-target-matches";

export const EXPECTED_REVENUE_ALLOCATION_ROW_COUNT = 1_948;

export const EXPENDITURE_CORE_BASELINE = {
  budgetPrograms: {
    rowCount: 1_170,
    sha256:
      "6ae0a0fda94e2498be8749688cdab3427f3d1d54520b3e952152265672b81a27",
  },
  budgetSections: {
    rowCount: 994,
    sha256:
      "5616dc3e29949fd8cf83128ea017b252f78587f8486d4091014d60ee7a1e2ad0",
  },
  budgetItems: {
    rowCount: 190,
    sha256:
      "a7edcf294bfd4256401ae396c63758f2fe28a0ffbd6fe26f3788fd35526b6822",
  },
} as const;

export const REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS = [
  "error_id",
  "error_type",
  "severity",
  "account_code",
  "raw_allocation_id",
  "allocation_link_id",
  "revenue_detail_id",
  "target_budget_program_identity_id",
  "target_budget_program_group_id",
  "source_file",
  "pdf_page",
  "budget_book_page",
  "target_budget_book_page",
  "message",
  "expected_value",
  "actual_value",
] as const;

export interface RevenueAllocationValidationError {
  error_id: string;
  error_type: string;
  severity: "error";
  account_code: string;
  raw_allocation_id: string;
  allocation_link_id: string;
  revenue_detail_id: string;
  target_budget_program_identity_id: string;
  target_budget_program_group_id: string;
  source_file: string;
  pdf_page: number | "";
  budget_book_page: number | "";
  target_budget_book_page: number | "";
  message: string;
  expected_value: string | number;
  actual_value: string | number;
}

type RevenueAllocationValidationErrorDraft = Omit<
  RevenueAllocationValidationError,
  "error_id"
>;

export interface RevenueAllocationCoreCsvTexts {
  budgetPrograms: string;
  budgetSections: string;
  budgetItems: string;
  budgetProgramGroups: string;
}

export interface RevenueAllocationValidationInputs {
  phase24: BudgetRevenueValidationResult;
  details: BudgetRevenueDetail[];
  rawAllocations: RawPdfRevenueAllocation[];
  programGroups: BudgetProgramIdentitySourceGroup[];
  allocations: IdentityResolvedBudgetRevenueAllocation[];
  config: BudgetAccountsConfig;
  coreCsvTexts: RevenueAllocationCoreCsvTexts;
}

export interface RevenueAllocationPageSummary {
  accountCode: string;
  accountName: string;
  rowCount: number;
  configuredPdfPageStart: number | null;
  configuredPdfPageEnd: number | null;
  actualPdfPageMin: number | null;
  actualPdfPageMax: number | null;
  configuredBudgetBookPageStart: number | null;
  configuredBudgetBookPageEnd: number | null;
  actualBudgetBookPageMin: number | null;
  actualBudgetBookPageMax: number | null;
  isPass: boolean;
}

export interface RevenueAllocationTargetPageSummary {
  accountCode: string;
  accountName: string;
  rowCount: number;
  configuredBudgetBookPageStart: number | null;
  configuredBudgetBookPageEnd: number | null;
  actualBudgetBookPageMin: number | null;
  actualBudgetBookPageMax: number | null;
  isPass: boolean;
}

export interface MultipleRevenueAllocationTarget {
  targetReference: string;
  resolutionLevel: string;
  targetAccountCode: string;
  targetBudgetItemKey: string;
  targetProgramName: string;
  targetBudgetBookPage: number;
}

export interface MultipleTargetRevenueDetail {
  revenueDetailId: string;
  accountCode: string;
  revenueDetailName: string;
  currentAmountThousandYen: number;
  targetCount: number;
  targets: MultipleRevenueAllocationTarget[];
}

export interface RevenueAllocationCoreIntegrity {
  hashes: {
    budgetPrograms: string;
    budgetSections: string;
    budgetItems: string;
  };
  rowCounts: {
    budgetPrograms: number;
    budgetSections: number;
    budgetItems: number;
  };
  hashMatchCount: number;
  rowCountMatchCount: number;
  groupRebuildMatches: boolean;
}

export interface RevenueAllocationValidationChecks {
  phase24Pass: boolean;
  rawFinalRowsCorrespond: boolean;
  revenueDetailReferencesValid: boolean;
  targetReferencesValid: boolean;
  sourcePagesInRange: boolean;
  targetPagesInRange: boolean;
  rawAllocationIdsUnique: boolean;
  allocationLinkIdsUnique: boolean;
  sourceTargetPairsUnique: boolean;
  ambiguousCountIsZero: boolean;
  unmatchedCountIsZero: boolean;
  allocationAmountsBlank: boolean;
  amountAttributionStatusesValid: boolean;
  rawAmountsNotDuplicated: boolean;
  schoolLunchExcluded: boolean;
  expenditureCoreUnchanged: boolean;
}

export interface RevenueAllocationValidationResult {
  rowCounts: {
    rawAllocations: number;
    finalAllocations: number;
    revenueDetails: number;
    programGroups: number;
    programIdentities: number;
  };
  uniqueCounts: {
    rawAllocationIds: number;
    allocationLinkIds: number;
    sourceTargetPairs: number;
  };
  resolutionCounts: {
    exactGroup: number;
    publicIdentity: number;
    ambiguous: number;
    unmatched: number;
  };
  amountSafety: {
    nonBlankAllocationAmountCount: number;
    invalidAmountAttributionStatusCount: number;
    duplicatedRawDetailAmountCount: number;
  };
  referenceErrors: {
    revenueDetail: number;
    targetGroup: number;
    targetIdentity: number;
    sourceTargetPairDuplicate: number;
  };
  pageErrors: {
    source: number;
    target: number;
  };
  schoolLunchAllocationCount: number;
  phase24: BudgetRevenueValidationResult;
  sourcePageSummaries: RevenueAllocationPageSummary[];
  targetPageSummaries: RevenueAllocationTargetPageSummary[];
  multipleTargetRevenueDetails: MultipleTargetRevenueDetail[];
  coreIntegrity: RevenueAllocationCoreIntegrity;
  checks: RevenueAllocationValidationChecks;
  errors: RevenueAllocationValidationError[];
  isPass: boolean;
}

export interface RevenueAllocationValidationReportFiles {
  rawRevenueCsv: string;
  accountsConfig: string;
  revenueDetails: string;
  revenueSections: string;
  revenueItems: string;
  rawPdfAllocations: string;
  budgetProgramGroups: string;
  revenueAllocations: string;
  budgetPrograms: string;
  budgetSections: string;
  budgetItems: string;
  errors: string;
  dictionary: string;
}

const ERROR_SORT_FIELDS = [
  "error_type",
  "account_code",
  "raw_allocation_id",
  "allocation_link_id",
  "revenue_detail_id",
  "target_budget_program_identity_id",
  "target_budget_program_group_id",
  "message",
] as const;

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function parseInteger(value: string): number | null {
  if (!/^-?\d+$/.test(value.trim())) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function countCsvRows(csvText: string): number {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  return Math.max(0, records.length - 1);
}

function rawAllocationIdFromLinkId(allocationLinkId: string): string | null {
  const match = /^ral_(.+)$/.exec(allocationLinkId);
  return match ? `ra_${match[1]}` : null;
}

function targetReference(
  allocation: IdentityResolvedBudgetRevenueAllocation,
): string {
  if (
    allocation.target_resolution_level === "exact_group" &&
    allocation.target_budget_program_group_id.length > 0
  ) {
    return `group:${allocation.target_budget_program_group_id}`;
  }
  if (allocation.target_budget_program_identity_id.length > 0) {
    return `identity:${allocation.target_budget_program_identity_id}`;
  }
  return `unresolved:${allocation.allocation_link_id}`;
}

function withinRange(
  value: number | null,
  start: number | null,
  end: number | null,
): boolean {
  return (
    value !== null &&
    start !== null &&
    end !== null &&
    value >= start &&
    value <= end
  );
}

function minOrNull(values: number[]): number | null {
  return values.length === 0 ? null : Math.min(...values);
}

function maxOrNull(values: number[]): number | null {
  return values.length === 0 ? null : Math.max(...values);
}

function makeError(
  values: Partial<RevenueAllocationValidationErrorDraft> & {
    error_type: string;
    message: string;
  },
): RevenueAllocationValidationErrorDraft {
  return {
    error_type: values.error_type,
    severity: "error",
    account_code: values.account_code ?? "",
    raw_allocation_id: values.raw_allocation_id ?? "",
    allocation_link_id: values.allocation_link_id ?? "",
    revenue_detail_id: values.revenue_detail_id ?? "",
    target_budget_program_identity_id:
      values.target_budget_program_identity_id ?? "",
    target_budget_program_group_id:
      values.target_budget_program_group_id ?? "",
    source_file: values.source_file ?? "",
    pdf_page: values.pdf_page ?? "",
    budget_book_page: values.budget_book_page ?? "",
    target_budget_book_page:
      values.target_budget_book_page ?? "",
    message: values.message,
    expected_value: values.expected_value ?? "",
    actual_value: values.actual_value ?? "",
  };
}

function finalizeErrors(
  drafts: RevenueAllocationValidationErrorDraft[],
): RevenueAllocationValidationError[] {
  return [...drafts]
    .sort((left, right) => {
      for (const field of ERROR_SORT_FIELDS) {
        const comparison = compareText(
          String(left[field]),
          String(right[field]),
        );
        if (comparison !== 0) {
          return comparison;
        }
      }
      return 0;
    })
    .map((error, index) => ({
      error_id: `rav_${String(index + 1).padStart(6, "0")}`,
      ...error,
    }));
}

function buildCoreIntegrity(
  coreCsvTexts: RevenueAllocationCoreCsvTexts,
  config: BudgetAccountsConfig,
  errors: RevenueAllocationValidationErrorDraft[],
): RevenueAllocationCoreIntegrity {
  const hashes = {
    budgetPrograms: sha256(coreCsvTexts.budgetPrograms),
    budgetSections: sha256(coreCsvTexts.budgetSections),
    budgetItems: sha256(coreCsvTexts.budgetItems),
  };
  const rowCounts = {
    budgetPrograms: countCsvRows(coreCsvTexts.budgetPrograms),
    budgetSections: countCsvRows(coreCsvTexts.budgetSections),
    budgetItems: countCsvRows(coreCsvTexts.budgetItems),
  };
  let hashMatchCount = 0;
  let rowCountMatchCount = 0;

  for (const key of [
    "budgetPrograms",
    "budgetSections",
    "budgetItems",
  ] as const) {
    const baseline = EXPENDITURE_CORE_BASELINE[key];
    if (hashes[key] === baseline.sha256) {
      hashMatchCount += 1;
    } else {
      errors.push(
        makeError({
          error_type: "expenditure_core_hash_mismatch",
          message: `${key}のSHA-256がPhase 29.5時点の基準値と一致しません。`,
          expected_value: baseline.sha256,
          actual_value: hashes[key],
        }),
      );
    }
    if (rowCounts[key] === baseline.rowCount) {
      rowCountMatchCount += 1;
    } else {
      errors.push(
        makeError({
          error_type: "expenditure_core_row_count_mismatch",
          message: `${key}の行数が基準値と一致しません。`,
          expected_value: baseline.rowCount,
          actual_value: rowCounts[key],
        }),
      );
    }
  }

  let groupRebuildMatches = false;
  try {
    const programs = parseBudgetProgramGroupSourcePrograms(
      coreCsvTexts.budgetPrograms,
    );
    const sections = parseBudgetProgramGroupSourceSections(
      coreCsvTexts.budgetSections,
    );
    const items = parseBudgetProgramGroupSourceItems(
      coreCsvTexts.budgetItems,
    );
    const rebuiltGroups = transformBudgetProgramGroups(
      programs,
      sections,
    );
    const validation = validateBudgetProgramGroups(
      rebuiltGroups,
      programs,
      sections,
      items,
      config,
    );
    groupRebuildMatches =
      validation.isPass &&
      validation.rowCount === EXPECTED_BUDGET_PROGRAM_GROUP_ROW_COUNT &&
      serializeBudgetProgramGroups(rebuiltGroups) ===
        coreCsvTexts.budgetProgramGroups;
    if (!groupRebuildMatches) {
      errors.push(
        makeError({
          error_type: "budget_program_groups_rebuild_mismatch",
          message:
            "budget_program_groups.csvが歳出コアCSVからの決定的な再生成結果と一致しません。",
          expected_value: "exact_match",
          actual_value: "mismatch",
        }),
      );
    }
  } catch (error) {
    errors.push(
      makeError({
        error_type: "budget_program_groups_rebuild_failed",
        message:
          "歳出コアCSVからbudget_program_groups.csvを再検証できませんでした。",
        expected_value: "rebuild_pass",
        actual_value:
          error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return {
    hashes,
    rowCounts,
    hashMatchCount,
    rowCountMatchCount,
    groupRebuildMatches,
  };
}

function buildSourcePageSummaries(
  rawAllocations: RawPdfRevenueAllocation[],
  config: BudgetAccountsConfig,
): RevenueAllocationPageSummary[] {
  return config.accounts.map((account) => {
    const rows = rawAllocations.filter(
      (row) => row.account_code === account.account_code,
    );
    const pdfPages = rows
      .map((row) => parseInteger(row.pdf_page))
      .filter((value): value is number => value !== null);
    const budgetBookPages = rows
      .map((row) => parseInteger(row.budget_book_page))
      .filter((value): value is number => value !== null);
    const revenue = account.revenue;
    const expectedNoRows = revenue?.status === "abolished_zero";
    const allRowsInRange =
      rows.length > 0 &&
      rows.every((row) =>
        withinRange(
          parseInteger(row.pdf_page),
          revenue?.pdf_page_start ?? null,
          revenue?.pdf_page_end ?? null,
        ) &&
        withinRange(
          parseInteger(row.budget_book_page),
          revenue?.pdf_budget_book_start_page ?? null,
          revenue?.pdf_budget_book_end_page ?? null,
        ),
      );

    return {
      accountCode: account.account_code,
      accountName: account.account_name,
      rowCount: rows.length,
      configuredPdfPageStart: revenue?.pdf_page_start ?? null,
      configuredPdfPageEnd: revenue?.pdf_page_end ?? null,
      actualPdfPageMin: minOrNull(pdfPages),
      actualPdfPageMax: maxOrNull(pdfPages),
      configuredBudgetBookPageStart:
        revenue?.pdf_budget_book_start_page ?? null,
      configuredBudgetBookPageEnd:
        revenue?.pdf_budget_book_end_page ?? null,
      actualBudgetBookPageMin: minOrNull(budgetBookPages),
      actualBudgetBookPageMax: maxOrNull(budgetBookPages),
      isPass: expectedNoRows ? rows.length === 0 : allRowsInRange,
    };
  });
}

function buildTargetPageSummaries(
  allocations: IdentityResolvedBudgetRevenueAllocation[],
  config: BudgetAccountsConfig,
): RevenueAllocationTargetPageSummary[] {
  return config.accounts.map((account) => {
    const rows = allocations.filter(
      (row) => row.target_account_code === account.account_code,
    );
    const pages = rows
      .map((row) => parseInteger(row.target_budget_book_page))
      .filter((value): value is number => value !== null);
    const expectedNoRows = account.status === "abolished_zero";
    const allRowsInRange =
      rows.length > 0 &&
      rows.every((row) =>
        withinRange(
          parseInteger(row.target_budget_book_page),
          account.pdf_budget_book_start_page,
          account.pdf_budget_book_end_page,
        ),
      );

    return {
      accountCode: account.account_code,
      accountName: account.account_name,
      rowCount: rows.length,
      configuredBudgetBookPageStart:
        account.pdf_budget_book_start_page,
      configuredBudgetBookPageEnd: account.pdf_budget_book_end_page,
      actualBudgetBookPageMin: minOrNull(pages),
      actualBudgetBookPageMax: maxOrNull(pages),
      isPass: expectedNoRows ? rows.length === 0 : allRowsInRange,
    };
  });
}

function buildMultipleTargetRevenueDetails(
  allocations: IdentityResolvedBudgetRevenueAllocation[],
  detailsById: Map<string, BudgetRevenueDetail>,
): MultipleTargetRevenueDetail[] {
  const allocationsByDetail = new Map<
    string,
    IdentityResolvedBudgetRevenueAllocation[]
  >();
  for (const allocation of allocations) {
    const rows =
      allocationsByDetail.get(allocation.revenue_detail_id) ?? [];
    rows.push(allocation);
    allocationsByDetail.set(allocation.revenue_detail_id, rows);
  }

  const summaries: MultipleTargetRevenueDetail[] = [];
  for (const [revenueDetailId, rows] of allocationsByDetail) {
    const targets = new Map<string, MultipleRevenueAllocationTarget>();
    for (const row of rows) {
      const reference = targetReference(row);
      if (!targets.has(reference)) {
        targets.set(reference, {
          targetReference: reference,
          resolutionLevel: row.target_resolution_level,
          targetAccountCode: row.target_account_code,
          targetBudgetItemKey: row.target_budget_item_key,
          targetProgramName:
            row.matched_budget_program_name ||
            row.pdf_target_program_name,
          targetBudgetBookPage:
            parseInteger(row.target_budget_book_page) ?? 0,
        });
      }
    }
    if (targets.size <= 1) {
      continue;
    }
    const detail = detailsById.get(revenueDetailId);
    summaries.push({
      revenueDetailId,
      accountCode: detail?.account_code ?? "",
      revenueDetailName: detail?.saisetsu_name ?? "",
      currentAmountThousandYen:
        detail?.current_amount_thousand_yen ?? 0,
      targetCount: targets.size,
      targets: [...targets.values()].sort((left, right) =>
        compareText(left.targetReference, right.targetReference),
      ),
    });
  }

  return summaries.sort(
    (left, right) =>
      compareText(left.accountCode, right.accountCode) ||
      compareText(left.revenueDetailId, right.revenueDetailId),
  );
}

export function validateRevenueAllocationData(
  inputs: RevenueAllocationValidationInputs,
): RevenueAllocationValidationResult {
  const errors: RevenueAllocationValidationErrorDraft[] = [];
  const accountByCode = new Map(
    inputs.config.accounts.map((account) => [
      account.account_code,
      account,
    ]),
  );
  const detailsById = new Map(
    inputs.details.map((detail) => [
      detail.revenue_detail_id,
      detail,
    ]),
  );
  const groupsById = new Map(
    inputs.programGroups.map((group) => [
      group.budget_program_group_id,
      group,
    ]),
  );

  if (!inputs.phase24.isPass) {
    if (inputs.phase24.errors.length === 0) {
      errors.push(
        makeError({
          error_type: "phase24_validation_failed",
          message:
            "Phase 24の歳入CSV検証がFAILですが、個別エラーがありません。",
          expected_value: "PASS",
          actual_value: "FAIL",
        }),
      );
    }
    for (const phase24Error of inputs.phase24.errors) {
      errors.push(
        makeError({
          error_type: `phase24_${phase24Error.error_type}`,
          account_code: phase24Error.account_code,
          revenue_detail_id: phase24Error.revenue_detail_id,
          source_file: phase24Error.source_file,
          message: `Phase 24: ${phase24Error.message}`,
          expected_value:
            phase24Error.expected_amount_thousand_yen,
          actual_value: phase24Error.actual_amount_thousand_yen,
        }),
      );
    }
  }

  const coreIntegrity = buildCoreIntegrity(
    inputs.coreCsvTexts,
    inputs.config,
    errors,
  );

  let identityBuild: BudgetProgramIdentityBuildResult;
  try {
    identityBuild = transformBudgetProgramIdentities(
      inputs.programGroups,
    );
    const identityValidation = validateBudgetProgramIdentities(
      inputs.programGroups,
      identityBuild,
    );
    if (
      !identityValidation.isPass ||
      identityValidation.sourceGroupCount !==
        EXPECTED_BUDGET_PROGRAM_GROUP_ROW_COUNT ||
      identityValidation.identityCount !==
        EXPECTED_BUDGET_PROGRAM_IDENTITY_ROW_COUNT ||
      identityValidation.multipleGroupIdentityCount !==
        EXPECTED_MULTIPLE_GROUP_IDENTITY_COUNT
    ) {
      errors.push(
        makeError({
          error_type: "budget_program_identity_validation_failed",
          message:
            "budget_program_groupから再構築したidentityの件数または所属関係が基準と一致しません。",
          expected_value:
            `${EXPECTED_BUDGET_PROGRAM_GROUP_ROW_COUNT}/` +
            `${EXPECTED_BUDGET_PROGRAM_IDENTITY_ROW_COUNT}/` +
            `${EXPECTED_MULTIPLE_GROUP_IDENTITY_COUNT}`,
          actual_value:
            `${identityValidation.sourceGroupCount}/` +
            `${identityValidation.identityCount}/` +
            `${identityValidation.multipleGroupIdentityCount}`,
        }),
      );
    }
  } catch (error) {
    errors.push(
      makeError({
        error_type: "budget_program_identity_rebuild_failed",
        message: "budget_program_identityを再構築できませんでした。",
        expected_value: "rebuild_pass",
        actual_value:
          error instanceof Error ? error.message : String(error),
      }),
    );
    identityBuild = {
      identities: [],
      members: [],
      identityByGroupId: new Map(),
      groupsByIdentityId: new Map(),
    };
  }
  const identitiesById = new Map(
    identityBuild.identities.map((identity) => [
      identity.budget_program_identity_id,
      identity,
    ]),
  );

  const rawIdCounts = new Map<string, number>();
  for (const raw of inputs.rawAllocations) {
    rawIdCounts.set(
      raw.raw_allocation_id,
      (rawIdCounts.get(raw.raw_allocation_id) ?? 0) + 1,
    );
  }
  for (const [rawAllocationId, count] of rawIdCounts) {
    if (count > 1) {
      errors.push(
        makeError({
          error_type: "duplicate_raw_allocation_id",
          raw_allocation_id: rawAllocationId,
          message: "raw_allocation_idが重複しています。",
          expected_value: 1,
          actual_value: count,
        }),
      );
    }
  }

  const allocationLinkIdCounts = new Map<string, number>();
  for (const allocation of inputs.allocations) {
    allocationLinkIdCounts.set(
      allocation.allocation_link_id,
      (allocationLinkIdCounts.get(allocation.allocation_link_id) ??
        0) + 1,
    );
  }
  for (const [allocationLinkId, count] of allocationLinkIdCounts) {
    if (count > 1) {
      errors.push(
        makeError({
          error_type: "duplicate_allocation_link_id",
          allocation_link_id: allocationLinkId,
          message: "allocation_link_idが重複しています。",
          expected_value: 1,
          actual_value: count,
        }),
      );
    }
  }

  if (
    inputs.rawAllocations.length !== inputs.allocations.length ||
    inputs.rawAllocations.length !==
      EXPECTED_REVENUE_ALLOCATION_ROW_COUNT
  ) {
    errors.push(
      makeError({
        error_type: "raw_final_allocation_row_count_mismatch",
        message:
          "raw PDF allocation行数と最終allocation行数が一致しません。",
        expected_value:
          `${EXPECTED_REVENUE_ALLOCATION_ROW_COUNT}/` +
          `${inputs.rawAllocations.length}`,
        actual_value: inputs.allocations.length,
      }),
    );
  }

  const rawById = new Map(
    inputs.rawAllocations.map((row) => [
      row.raw_allocation_id,
      row,
    ]),
  );
  const allocationByRawId = new Map<
    string,
    IdentityResolvedBudgetRevenueAllocation[]
  >();
  let rawFinalCorrespondenceErrorCount = 0;
  for (const allocation of inputs.allocations) {
    const rawAllocationId = rawAllocationIdFromLinkId(
      allocation.allocation_link_id,
    );
    if (!rawAllocationId) {
      rawFinalCorrespondenceErrorCount += 1;
      errors.push(
        makeError({
          error_type: "invalid_allocation_link_id_format",
          allocation_link_id: allocation.allocation_link_id,
          message:
            "allocation_link_idからraw_allocation_idを復元できません。",
          expected_value: "ral_<raw id suffix>",
          actual_value: allocation.allocation_link_id,
        }),
      );
      continue;
    }
    const related = allocationByRawId.get(rawAllocationId) ?? [];
    related.push(allocation);
    allocationByRawId.set(rawAllocationId, related);
    const raw = rawById.get(rawAllocationId);
    if (!raw) {
      rawFinalCorrespondenceErrorCount += 1;
      errors.push(
        makeError({
          error_type: "allocation_without_raw_row",
          raw_allocation_id: rawAllocationId,
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          message:
            "最終allocationに対応するraw PDF allocation行がありません。",
          expected_value: "existing_raw_row",
          actual_value: "missing",
        }),
      );
      continue;
    }

    const comparableFields = [
      ["source_file", "source_file"],
      ["source_pdf_page", "pdf_page"],
      ["source_budget_book_page", "budget_book_page"],
      ["pdf_target_program_name", "pdf_target_program_name"],
      ["target_budget_book_page", "target_budget_book_page"],
      ["raw_text", "raw_text"],
    ] as const;
    for (const [allocationField, rawField] of comparableFields) {
      if (allocation[allocationField] !== raw[rawField]) {
        rawFinalCorrespondenceErrorCount += 1;
        errors.push(
          makeError({
            error_type: "raw_final_allocation_value_mismatch",
            account_code: raw.account_code,
            raw_allocation_id: rawAllocationId,
            allocation_link_id: allocation.allocation_link_id,
            revenue_detail_id: allocation.revenue_detail_id,
            source_file: raw.source_file,
            pdf_page: parseInteger(raw.pdf_page) ?? "",
            budget_book_page:
              parseInteger(raw.budget_book_page) ?? "",
            target_budget_book_page:
              parseInteger(raw.target_budget_book_page) ?? "",
            message:
              `rawと最終allocationの${allocationField}が一致しません。`,
            expected_value: raw[rawField],
            actual_value: allocation[allocationField],
          }),
        );
      }
    }
  }
  for (const raw of inputs.rawAllocations) {
    const related = allocationByRawId.get(raw.raw_allocation_id) ?? [];
    if (related.length !== 1) {
      rawFinalCorrespondenceErrorCount += 1;
      errors.push(
        makeError({
          error_type: "raw_row_final_allocation_count_mismatch",
          account_code: raw.account_code,
          raw_allocation_id: raw.raw_allocation_id,
          source_file: raw.source_file,
          pdf_page: parseInteger(raw.pdf_page) ?? "",
          budget_book_page:
            parseInteger(raw.budget_book_page) ?? "",
          target_budget_book_page:
            parseInteger(raw.target_budget_book_page) ?? "",
          message:
            "raw PDF allocation行に対応する最終allocationが1行ではありません。",
          expected_value: 1,
          actual_value: related.length,
        }),
      );
    }
  }

  let revenueDetailReferenceErrorCount = 0;
  for (const allocation of inputs.allocations) {
    if (!detailsById.has(allocation.revenue_detail_id)) {
      revenueDetailReferenceErrorCount += 1;
      errors.push(
        makeError({
          error_type: "missing_revenue_detail_reference",
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          message:
            "allocationのrevenue_detail_idがbudget_revenue_details.csvに存在しません。",
          expected_value: "existing_revenue_detail_id",
          actual_value: allocation.revenue_detail_id,
        }),
      );
    }
  }

  let rawGroups: ReturnType<typeof groupRawPdfRevenueAllocations> = [];
  try {
    rawGroups = groupRawPdfRevenueAllocations(inputs.rawAllocations);
  } catch (error) {
    revenueDetailReferenceErrorCount += 1;
    errors.push(
      makeError({
        error_type: "raw_revenue_detail_grouping_failed",
        message:
          "allocation_sequenceからraw PDF歳入細節を再構成できません。",
        expected_value: "valid_sequence",
        actual_value:
          error instanceof Error ? error.message : String(error),
      }),
    );
  }
  for (const rawGroup of rawGroups) {
    const first = rawGroup.rows[0];
    const finalRows = rawGroup.rows.flatMap(
      (row) => allocationByRawId.get(row.raw_allocation_id) ?? [],
    );
    const detailIds = new Set(
      finalRows.map((row) => row.revenue_detail_id),
    );
    if (detailIds.size !== 1) {
      revenueDetailReferenceErrorCount += 1;
      errors.push(
        makeError({
          error_type: "raw_detail_maps_to_multiple_revenue_details",
          account_code: first.account_code,
          raw_allocation_id:
            rawGroup.representativeRawAllocationId,
          source_file: first.source_file,
          pdf_page: parseInteger(first.pdf_page) ?? "",
          budget_book_page:
            parseInteger(first.budget_book_page) ?? "",
          message:
            "1つのPDF歳入細節が一意なrevenue_detail_idへ接続されていません。",
          expected_value: 1,
          actual_value: detailIds.size,
        }),
      );
      continue;
    }
    const revenueDetailId = [...detailIds][0];
    const detail = detailsById.get(revenueDetailId);
    if (!detail) {
      continue;
    }
    const hierarchyMatches =
      String(detail.fiscal_year) === first.fiscal_year &&
      detail.account_code === first.account_code &&
      detail.kan_code === first.kan_code &&
      detail.kou_code === first.kou_code &&
      detail.moku_code === first.moku_code &&
      detail.setsu_code === first.setsu_code &&
      detail.saisetsu_code === first.saisetsu_code;
    if (!hierarchyMatches) {
      revenueDetailReferenceErrorCount += 1;
      errors.push(
        makeError({
          error_type: "raw_revenue_detail_hierarchy_mismatch",
          account_code: first.account_code,
          raw_allocation_id:
            rawGroup.representativeRawAllocationId,
          revenue_detail_id: revenueDetailId,
          source_file: first.source_file,
          pdf_page: parseInteger(first.pdf_page) ?? "",
          budget_book_page:
            parseInteger(first.budget_book_page) ?? "",
          message:
            "PDF歳入細節とrevenue_detail_idの会計・款・項・目・節・細節が一致しません。",
          expected_value:
            `${first.fiscal_year}_${first.account_code}_` +
            `${first.kan_code}_${first.kou_code}_${first.moku_code}_` +
            `${first.setsu_code}_${first.saisetsu_code}`,
          actual_value:
            `${detail.fiscal_year}_${detail.account_code}_` +
            `${detail.kan_code}_${detail.kou_code}_${detail.moku_code}_` +
            `${detail.setsu_code}_${detail.saisetsu_code}`,
        }),
      );
    }
    if (
      detail.current_amount_thousand_yen !==
      rawGroup.amountThousandYen
    ) {
      revenueDetailReferenceErrorCount += 1;
      errors.push(
        makeError({
          error_type: "raw_revenue_detail_amount_mismatch",
          account_code: first.account_code,
          raw_allocation_id:
            rawGroup.representativeRawAllocationId,
          revenue_detail_id: revenueDetailId,
          source_file: first.source_file,
          pdf_page: parseInteger(first.pdf_page) ?? "",
          budget_book_page:
            parseInteger(first.budget_book_page) ?? "",
          message:
            "PDF歳入細節金額と公式CSVのcurrent_amountが一致しません。",
          expected_value: rawGroup.amountThousandYen,
          actual_value: detail.current_amount_thousand_yen,
        }),
      );
    }
  }

  let targetGroupReferenceErrorCount = 0;
  let targetIdentityReferenceErrorCount = 0;
  let ambiguousCount = 0;
  let unmatchedCount = 0;
  let nonBlankAllocationAmountCount = 0;
  let invalidAmountAttributionStatusCount = 0;
  for (const allocation of inputs.allocations) {
    const group = allocation.target_budget_program_group_id
      ? groupsById.get(allocation.target_budget_program_group_id)
      : undefined;
    const identity = identitiesById.get(
      allocation.target_budget_program_identity_id,
    );
    const targetPage =
      parseInteger(allocation.target_budget_book_page) ?? 0;

    if (allocation.target_match_status === "ambiguous") {
      ambiguousCount += 1;
      errors.push(
        makeError({
          error_type: "ambiguous_target_match",
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          message: "target_match_statusがambiguousです。",
          expected_value: "matched",
          actual_value: "ambiguous",
        }),
      );
    } else if (allocation.target_match_status === "unmatched") {
      unmatchedCount += 1;
      errors.push(
        makeError({
          error_type: "unmatched_target",
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          message: "target_match_statusがunmatchedです。",
          expected_value: "matched",
          actual_value: "unmatched",
        }),
      );
    } else if (allocation.target_match_status !== "matched") {
      errors.push(
        makeError({
          error_type: "invalid_target_match_status",
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          message: "target_match_statusが許可値ではありません。",
          expected_value: "matched",
          actual_value: allocation.target_match_status,
        }),
      );
    }

    if (!identity) {
      targetIdentityReferenceErrorCount += 1;
      errors.push(
        makeError({
          error_type: "missing_target_identity_reference",
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          target_budget_program_identity_id:
            allocation.target_budget_program_identity_id,
          message:
            "target_budget_program_identity_idが再構築したidentityに存在しません。",
          expected_value: "existing_identity_id",
          actual_value:
            allocation.target_budget_program_identity_id,
        }),
      );
    } else {
      const candidatePages = parseCandidateBudgetBookPages(
        identity.candidate_budget_book_pages,
      );
      const pageCompatible = candidatePages.some((page) =>
        TARGET_PAGE_FORWARD_OFFSETS.includes(
          (targetPage -
            page) as (typeof TARGET_PAGE_FORWARD_OFFSETS)[number],
        ),
      );
      if (
        identity.account_code !== allocation.target_account_code ||
        identity.budget_item_key !==
          allocation.target_budget_item_key ||
        !pageCompatible
      ) {
        targetIdentityReferenceErrorCount += 1;
        errors.push(
          makeError({
            error_type: "target_identity_metadata_mismatch",
            account_code: allocation.target_account_code,
            allocation_link_id: allocation.allocation_link_id,
            revenue_detail_id: allocation.revenue_detail_id,
            target_budget_program_identity_id:
              allocation.target_budget_program_identity_id,
            target_budget_book_page: targetPage,
            message:
              "allocationの対象会計・目・参照ページがidentityと一致しません。",
            expected_value:
              `${identity.account_code}/` +
              `${identity.budget_item_key}/` +
              `${identity.candidate_budget_book_pages}`,
            actual_value:
              `${allocation.target_account_code}/` +
              `${allocation.target_budget_item_key}/` +
              `${targetPage}`,
          }),
        );
      }
    }

    if (allocation.target_resolution_level === "exact_group") {
      if (!group) {
        targetGroupReferenceErrorCount += 1;
        errors.push(
          makeError({
            error_type: "missing_exact_target_group_reference",
            allocation_link_id: allocation.allocation_link_id,
            revenue_detail_id: allocation.revenue_detail_id,
            target_budget_program_group_id:
              allocation.target_budget_program_group_id,
            message:
              "exact_group行のtarget_budget_program_group_idが存在しません。",
            expected_value: "existing_group_id",
            actual_value:
              allocation.target_budget_program_group_id || "blank",
          }),
        );
      } else {
        const mappedIdentity =
          identityBuild.identityByGroupId.get(
            group.budget_program_group_id,
          );
        if (
          group.account_code !== allocation.target_account_code ||
          group.budget_item_key !==
            allocation.target_budget_item_key ||
          mappedIdentity?.budget_program_identity_id !==
            allocation.target_budget_program_identity_id ||
          allocation.target_group_resolution_status !== "exact" ||
          allocation.candidate_target_group_count !== "1"
        ) {
          targetGroupReferenceErrorCount += 1;
          errors.push(
            makeError({
              error_type: "exact_target_group_metadata_mismatch",
              account_code: allocation.target_account_code,
              allocation_link_id: allocation.allocation_link_id,
              revenue_detail_id: allocation.revenue_detail_id,
              target_budget_program_identity_id:
                allocation.target_budget_program_identity_id,
              target_budget_program_group_id:
                allocation.target_budget_program_group_id,
              message:
                "exact_group行のgroup・identity・解決状態が整合しません。",
              expected_value:
                `${group.account_code}/${group.budget_item_key}/` +
                `${mappedIdentity?.budget_program_identity_id ?? ""}/exact/1`,
              actual_value:
                `${allocation.target_account_code}/` +
                `${allocation.target_budget_item_key}/` +
                `${allocation.target_budget_program_identity_id}/` +
                `${allocation.target_group_resolution_status}/` +
                `${allocation.candidate_target_group_count}`,
            }),
          );
        }
      }
    } else if (
      allocation.target_resolution_level === "public_identity"
    ) {
      const memberCount = identity
        ? (identityBuild.groupsByIdentityId.get(
            identity.budget_program_identity_id,
          )?.length ?? 0)
        : 0;
      if (
        allocation.target_budget_program_group_id !== "" ||
        allocation.target_group_resolution_status !==
          "not_distinguishable_from_public_source" ||
        allocation.target_match_method !==
          "page_name_department_identity_cluster" ||
        memberCount < 2 ||
        allocation.candidate_target_group_count !==
          String(memberCount)
      ) {
        targetGroupReferenceErrorCount += 1;
        errors.push(
          makeError({
            error_type: "public_identity_resolution_mismatch",
            account_code: allocation.target_account_code,
            allocation_link_id: allocation.allocation_link_id,
            revenue_detail_id: allocation.revenue_detail_id,
            target_budget_program_identity_id:
              allocation.target_budget_program_identity_id,
            target_budget_program_group_id:
              allocation.target_budget_program_group_id,
            message:
              "public_identity行が、group空欄・複数候補・公式資料上区別不能の条件を満たしません。",
            expected_value:
              `blank/not_distinguishable_from_public_source/` +
              `page_name_department_identity_cluster/${memberCount}`,
            actual_value:
              `${allocation.target_budget_program_group_id}/` +
              `${allocation.target_group_resolution_status}/` +
              `${allocation.target_match_method}/` +
              `${allocation.candidate_target_group_count}`,
          }),
        );
      }
    } else {
      targetGroupReferenceErrorCount += 1;
      errors.push(
        makeError({
          error_type: "invalid_target_resolution_level",
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          message: "target_resolution_levelが許可値ではありません。",
          expected_value: "exact_group or public_identity",
          actual_value: allocation.target_resolution_level,
        }),
      );
    }

    if (allocation.allocation_amount_thousand_yen !== "") {
      nonBlankAllocationAmountCount += 1;
      errors.push(
        makeError({
          error_type: "allocation_amount_present",
          account_code: allocation.target_account_code,
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          target_budget_program_identity_id:
            allocation.target_budget_program_identity_id,
          target_budget_program_group_id:
            allocation.target_budget_program_group_id,
          message:
            "関係テーブルにallocation_amount_thousand_yenが入っています。",
          expected_value: "blank",
          actual_value:
            allocation.allocation_amount_thousand_yen,
        }),
      );
    }
    if (
      allocation.amount_attribution_status !== "not_available"
    ) {
      invalidAmountAttributionStatusCount += 1;
      errors.push(
        makeError({
          error_type: "invalid_amount_attribution_status",
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          message:
            "amount_attribution_statusがnot_availableではありません。",
          expected_value: "not_available",
          actual_value: allocation.amount_attribution_status,
        }),
      );
    }
  }

  let duplicatedRawDetailAmountCount = 0;
  for (const raw of inputs.rawAllocations) {
    const sequence = parseInteger(raw.allocation_sequence);
    if (
      sequence !== null &&
      sequence > 1 &&
      raw.pdf_revenue_amount_thousand_yen.trim() !== ""
    ) {
      duplicatedRawDetailAmountCount += 1;
      errors.push(
        makeError({
          error_type: "raw_detail_amount_duplicated_to_multiple_target",
          account_code: raw.account_code,
          raw_allocation_id: raw.raw_allocation_id,
          source_file: raw.source_file,
          pdf_page: parseInteger(raw.pdf_page) ?? "",
          budget_book_page:
            parseInteger(raw.budget_book_page) ?? "",
          target_budget_book_page:
            parseInteger(raw.target_budget_book_page) ?? "",
          message:
            "allocation_sequence=2以降へ歳入細節金額が複製されています。",
          expected_value: "blank",
          actual_value: raw.pdf_revenue_amount_thousand_yen,
        }),
      );
    }
  }

  const sourceTargetPairCounts = new Map<string, number>();
  let sourceTargetPairDuplicateCount = 0;
  for (const allocation of inputs.allocations) {
    const pair =
      `${allocation.revenue_detail_id}\u001f` +
      targetReference(allocation);
    const count = (sourceTargetPairCounts.get(pair) ?? 0) + 1;
    sourceTargetPairCounts.set(pair, count);
    if (count > 1) {
      sourceTargetPairDuplicateCount += 1;
      errors.push(
        makeError({
          error_type: "duplicate_source_target_pair",
          account_code: allocation.target_account_code,
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          target_budget_program_identity_id:
            allocation.target_budget_program_identity_id,
          target_budget_program_group_id:
            allocation.target_budget_program_group_id,
          message:
            "同一revenue_detailと同一解決レベルのtarget関係が重複しています。",
          expected_value: 1,
          actual_value: count,
        }),
      );
    }
  }

  let sourcePageErrorCount = 0;
  for (const raw of inputs.rawAllocations) {
    const account = accountByCode.get(raw.account_code);
    const revenue = account?.revenue;
    const pdfPage = parseInteger(raw.pdf_page);
    const budgetBookPage = parseInteger(raw.budget_book_page);
    const valid =
      account !== undefined &&
      revenue?.status === "active" &&
      withinRange(
        pdfPage,
        revenue.pdf_page_start,
        revenue.pdf_page_end,
      ) &&
      withinRange(
        budgetBookPage,
        revenue.pdf_budget_book_start_page,
        revenue.pdf_budget_book_end_page,
      );
    if (!valid) {
      sourcePageErrorCount += 1;
      errors.push(
        makeError({
          error_type: "source_pdf_page_out_of_range",
          account_code: raw.account_code,
          raw_allocation_id: raw.raw_allocation_id,
          source_file: raw.source_file,
          pdf_page: pdfPage ?? "",
          budget_book_page: budgetBookPage ?? "",
          message:
            "raw PDF allocationの物理ページまたは冊子ページが会計の歳入対象範囲外です。",
          expected_value:
            `${revenue?.pdf_page_start ?? "null"}-` +
            `${revenue?.pdf_page_end ?? "null"} / ` +
            `${revenue?.pdf_budget_book_start_page ?? "null"}-` +
            `${revenue?.pdf_budget_book_end_page ?? "null"}`,
          actual_value: `${raw.pdf_page} / ${raw.budget_book_page}`,
        }),
      );
    }
  }

  let targetPageErrorCount = 0;
  for (const allocation of inputs.allocations) {
    const account = accountByCode.get(
      allocation.target_account_code,
    );
    const page = parseInteger(allocation.target_budget_book_page);
    const valid =
      account?.status === "active" &&
      withinRange(
        page,
        account.pdf_budget_book_start_page,
        account.pdf_budget_book_end_page,
      );
    if (!valid) {
      targetPageErrorCount += 1;
      errors.push(
        makeError({
          error_type: "target_budget_book_page_out_of_range",
          account_code: allocation.target_account_code,
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          target_budget_program_identity_id:
            allocation.target_budget_program_identity_id,
          target_budget_program_group_id:
            allocation.target_budget_program_group_id,
          target_budget_book_page: page ?? "",
          message:
            "充当先冊子ページがtarget_account_codeの歳出対象範囲外です。",
          expected_value:
            `${account?.pdf_budget_book_start_page ?? "null"}-` +
            `${account?.pdf_budget_book_end_page ?? "null"}`,
          actual_value: allocation.target_budget_book_page,
        }),
      );
    }
  }

  let schoolLunchAllocationCount = 0;
  for (const raw of inputs.rawAllocations) {
    if (raw.account_code === "school_lunch_fee") {
      schoolLunchAllocationCount += 1;
      errors.push(
        makeError({
          error_type: "school_lunch_pdf_allocation_present",
          account_code: raw.account_code,
          raw_allocation_id: raw.raw_allocation_id,
          source_file: raw.source_file,
          pdf_page: parseInteger(raw.pdf_page) ?? "",
          budget_book_page:
            parseInteger(raw.budget_book_page) ?? "",
          message:
            "abolished_zeroの学校給食費会計がPDF allocation対象に含まれています。",
          expected_value: 0,
          actual_value: 1,
        }),
      );
    }
  }
  for (const allocation of inputs.allocations) {
    const detail = detailsById.get(allocation.revenue_detail_id);
    if (
      detail?.account_code === "school_lunch_fee" ||
      allocation.target_account_code === "school_lunch_fee"
    ) {
      schoolLunchAllocationCount += 1;
      errors.push(
        makeError({
          error_type: "school_lunch_final_allocation_present",
          account_code:
            detail?.account_code ??
            allocation.target_account_code,
          allocation_link_id: allocation.allocation_link_id,
          revenue_detail_id: allocation.revenue_detail_id,
          target_budget_program_identity_id:
            allocation.target_budget_program_identity_id,
          target_budget_program_group_id:
            allocation.target_budget_program_group_id,
          message:
            "abolished_zeroの学校給食費会計が最終allocationに含まれています。",
          expected_value: 0,
          actual_value: 1,
        }),
      );
    }
  }

  const sourcePageSummaries = buildSourcePageSummaries(
    inputs.rawAllocations,
    inputs.config,
  );
  const targetPageSummaries = buildTargetPageSummaries(
    inputs.allocations,
    inputs.config,
  );
  const multipleTargetRevenueDetails =
    buildMultipleTargetRevenueDetails(
      inputs.allocations,
      detailsById,
    );
  const finalizedErrors = finalizeErrors(errors);
  const expenditureCoreUnchanged =
    coreIntegrity.hashMatchCount === 3 &&
    coreIntegrity.rowCountMatchCount === 3 &&
    coreIntegrity.groupRebuildMatches;
  const checks: RevenueAllocationValidationChecks = {
    phase24Pass: inputs.phase24.isPass,
    rawFinalRowsCorrespond:
      rawFinalCorrespondenceErrorCount === 0 &&
      inputs.rawAllocations.length === inputs.allocations.length &&
      inputs.rawAllocations.length ===
        EXPECTED_REVENUE_ALLOCATION_ROW_COUNT,
    revenueDetailReferencesValid:
      revenueDetailReferenceErrorCount === 0,
    targetReferencesValid:
      targetGroupReferenceErrorCount === 0 &&
      targetIdentityReferenceErrorCount === 0,
    sourcePagesInRange: sourcePageErrorCount === 0,
    targetPagesInRange: targetPageErrorCount === 0,
    rawAllocationIdsUnique:
      rawIdCounts.size === inputs.rawAllocations.length,
    allocationLinkIdsUnique:
      allocationLinkIdCounts.size === inputs.allocations.length,
    sourceTargetPairsUnique:
      sourceTargetPairDuplicateCount === 0,
    ambiguousCountIsZero: ambiguousCount === 0,
    unmatchedCountIsZero: unmatchedCount === 0,
    allocationAmountsBlank:
      nonBlankAllocationAmountCount === 0,
    amountAttributionStatusesValid:
      invalidAmountAttributionStatusCount === 0,
    rawAmountsNotDuplicated:
      duplicatedRawDetailAmountCount === 0,
    schoolLunchExcluded: schoolLunchAllocationCount === 0,
    expenditureCoreUnchanged,
  };

  return {
    rowCounts: {
      rawAllocations: inputs.rawAllocations.length,
      finalAllocations: inputs.allocations.length,
      revenueDetails: inputs.details.length,
      programGroups: inputs.programGroups.length,
      programIdentities: identityBuild.identities.length,
    },
    uniqueCounts: {
      rawAllocationIds: rawIdCounts.size,
      allocationLinkIds: allocationLinkIdCounts.size,
      sourceTargetPairs: sourceTargetPairCounts.size,
    },
    resolutionCounts: {
      exactGroup: inputs.allocations.filter(
        (row) => row.target_resolution_level === "exact_group",
      ).length,
      publicIdentity: inputs.allocations.filter(
        (row) =>
          row.target_resolution_level === "public_identity",
      ).length,
      ambiguous: ambiguousCount,
      unmatched: unmatchedCount,
    },
    amountSafety: {
      nonBlankAllocationAmountCount,
      invalidAmountAttributionStatusCount,
      duplicatedRawDetailAmountCount,
    },
    referenceErrors: {
      revenueDetail: revenueDetailReferenceErrorCount,
      targetGroup: targetGroupReferenceErrorCount,
      targetIdentity: targetIdentityReferenceErrorCount,
      sourceTargetPairDuplicate: sourceTargetPairDuplicateCount,
    },
    pageErrors: {
      source: sourcePageErrorCount,
      target: targetPageErrorCount,
    },
    schoolLunchAllocationCount,
    phase24: inputs.phase24,
    sourcePageSummaries,
    targetPageSummaries,
    multipleTargetRevenueDetails,
    coreIntegrity,
    checks,
    errors: finalizedErrors,
    isPass:
      finalizedErrors.length === 0 &&
      Object.values(checks).every(Boolean),
  };
}

export function serializeRevenueAllocationValidationErrors(
  errors: RevenueAllocationValidationError[],
): string {
  return stringify(errors, {
    columns: [...REVENUE_ALLOCATION_VALIDATION_ERROR_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function displayNullable(value: number | null): string {
  return value === null ? "-" : formatNumber(value);
}

function passFail(value: boolean): "PASS" | "FAIL" {
  return value ? "PASS" : "FAIL";
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderRevenueAllocationValidationReport(
  result: RevenueAllocationValidationResult,
  files: RevenueAllocationValidationReportFiles,
): string {
  const checks = [
    ["1", "CSV由来歳入3テーブルがPhase 24のPASS状態を維持", result.checks.phase24Pass],
    ["2", "raw PDF allocation行と最終allocation行が1対1で対応", result.checks.rawFinalRowsCorrespond],
    ["3", "全revenue_detail_idが実在しPDF細節と整合", result.checks.revenueDetailReferencesValid],
    ["4", "groupまたはpublic identityのtarget参照が実在", result.checks.targetReferencesValid],
    ["5", "PDF対象ページ外のデータがない", result.checks.sourcePagesInRange && result.checks.targetPagesInRange],
    ["6", "raw_allocation_idの重複がない", result.checks.rawAllocationIdsUnique],
    ["7", "allocation_link_idの重複がない", result.checks.allocationLinkIdsUnique],
    ["8", "同一source-targetペアの重複がない", result.checks.sourceTargetPairsUnique],
    ["9", "ambiguousが0件", result.checks.ambiguousCountIsZero],
    ["10", "unmatchedが0件", result.checks.unmatchedCountIsZero],
    ["11", "allocation_amount_thousand_yenが全件空欄", result.checks.allocationAmountsBlank],
    ["12", "amount_attribution_statusが全件not_available", result.checks.amountAttributionStatusesValid],
    ["13", "複数targetのrevenue_detailを一覧化", true],
    ["14", "複数targetへ歳入細節金額を複製していない", result.checks.rawAmountsNotDuplicated && result.checks.allocationAmountsBlank],
    ["15", "学校給食費会計をPDF allocation対象にしていない", result.checks.schoolLunchExcluded],
    ["16", "既存の歳出3テーブルが基準ハッシュ・行数を維持", result.checks.expenditureCoreUnchanged],
  ] as const;
  const errorTypeCounts = new Map<string, number>();
  for (const error of result.errors) {
    errorTypeCounts.set(
      error.error_type,
      (errorTypeCounts.get(error.error_type) ?? 0) + 1,
    );
  }
  const coreRows = [
    [
      "budget_programs.csv",
      EXPENDITURE_CORE_BASELINE.budgetPrograms.rowCount,
      result.coreIntegrity.rowCounts.budgetPrograms,
      EXPENDITURE_CORE_BASELINE.budgetPrograms.sha256,
      result.coreIntegrity.hashes.budgetPrograms,
    ],
    [
      "budget_sections.csv",
      EXPENDITURE_CORE_BASELINE.budgetSections.rowCount,
      result.coreIntegrity.rowCounts.budgetSections,
      EXPENDITURE_CORE_BASELINE.budgetSections.sha256,
      result.coreIntegrity.hashes.budgetSections,
    ],
    [
      "budget_items.csv",
      EXPENDITURE_CORE_BASELINE.budgetItems.rowCount,
      result.coreIntegrity.rowCounts.budgetItems,
      EXPENDITURE_CORE_BASELINE.budgetItems.sha256,
      result.coreIntegrity.hashes.budgetItems,
    ],
  ] as const;

  const lines = [
    "---",
    'title: "令和8年度予算 歳入・歳出事業接続総合検証レポート"',
    "updated: 2026-07-29",
    "tags:",
    "  - みらい議会",
    "  - 世田谷区",
    "  - 予算",
    "  - データ検証",
    "related:",
    "  - 世田谷区令和8年度予算データ基盤",
    "---",
    "",
    "# 世田谷区令和8年度当初予算 歳入・歳出事業接続総合検証",
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
    ...checks.map(
      ([number, label, isPass]) =>
        `| ${number} | ${label} | ${passFail(isPass)} |`,
    ),
    "",
    "### target参照の解釈",
    "",
    "Phase 29.5で公式PDFから内部groupを区別できない39件は、`target_budget_program_group_id`を空欄のまま、再構築した`target_budget_program_identity_id`へ接続する。これらは`public_identity`として正常であり、groupまで確定した扱いにはしない。group IDの実在検証は、値がある`exact_group`行に適用する。",
    "",
    "## 入力ファイル",
    "",
    "| ファイル | 用途 |",
    "| --- | --- |",
    `| \`${files.revenueDetails}\` | 公式CSV由来の歳入細節×所属 |`,
    `| \`${files.revenueSections}\` | 歳入節集約 |`,
    `| \`${files.revenueItems}\` | 歳入目集約 |`,
    `| \`${files.rawPdfAllocations}\` | PDF充当事業の抽出原本 |`,
    `| \`${files.budgetProgramGroups}\` | 歳出予算事業group |`,
    `| \`${files.revenueAllocations}\` | 歳入・歳出事業関係 |`,
    `| \`${files.budgetPrograms}\` | 歳出事業コア |`,
    `| \`${files.budgetSections}\` | 歳出節コア |`,
    `| \`${files.budgetItems}\` | 歳出目コア |`,
    `| \`${files.rawRevenueCsv}\` | Phase 24元行復元用の公式歳入CSV |`,
    `| \`${files.accountsConfig}\` | 会計別期待額・PDF対象範囲 |`,
    "",
    "## Phase 24維持確認",
    "",
    "| 対象 | 行数 | 合計（千円） |",
    "| --- | ---: | ---: |",
    `| budget_revenue_details | ${formatNumber(result.phase24.rowCounts.details)} | ${formatNumber(result.phase24.totals.details)} |`,
    `| budget_revenue_sections | ${formatNumber(result.phase24.rowCounts.sections)} | ${formatNumber(result.phase24.totals.sections)} |`,
    `| budget_revenue_items | ${formatNumber(result.phase24.rowCounts.items)} | ${formatNumber(result.phase24.totals.items)} |`,
    "",
    `- Phase 24エラー: ${formatNumber(result.phase24.errors.length)}件`,
    `- 公式CSV復元一致: ${formatNumber(result.phase24.sourceTraceability.fullyMatchedSourceRows)} / ${formatNumber(result.phase24.sourceTraceability.expectedSourceRows)}行`,
    `- 判定: ${passFail(result.phase24.isPass)}`,
    "",
    "## allocation概要",
    "",
    "| 項目 | 件数 |",
    "| --- | ---: |",
    `| raw PDF allocation | ${formatNumber(result.rowCounts.rawAllocations)} |`,
    `| 最終allocation | ${formatNumber(result.rowCounts.finalAllocations)} |`,
    `| 一意raw_allocation_id | ${formatNumber(result.uniqueCounts.rawAllocationIds)} |`,
    `| 一意allocation_link_id | ${formatNumber(result.uniqueCounts.allocationLinkIds)} |`,
    `| 一意source-target関係 | ${formatNumber(result.uniqueCounts.sourceTargetPairs)} |`,
    `| exact_group | ${formatNumber(result.resolutionCounts.exactGroup)} |`,
    `| public_identity | ${formatNumber(result.resolutionCounts.publicIdentity)} |`,
    `| ambiguous | ${formatNumber(result.resolutionCounts.ambiguous)} |`,
    `| unmatched | ${formatNumber(result.resolutionCounts.unmatched)} |`,
    `| 複数targetを持つrevenue_detail | ${formatNumber(result.multipleTargetRevenueDetails.length)} |`,
    "",
    "## 金額非帰属の確認",
    "",
    "| 検証 | 件数 | 判定 |",
    "| --- | ---: | --- |",
    `| allocation_amountが空欄でない行 | ${formatNumber(result.amountSafety.nonBlankAllocationAmountCount)} | ${passFail(result.amountSafety.nonBlankAllocationAmountCount === 0)} |`,
    `| amount_attribution_status不正 | ${formatNumber(result.amountSafety.invalidAmountAttributionStatusCount)} | ${passFail(result.amountSafety.invalidAmountAttributionStatusCount === 0)} |`,
    `| rawのsequence=2以降へ細節金額を複製 | ${formatNumber(result.amountSafety.duplicatedRawDetailAmountCount)} | ${passFail(result.amountSafety.duplicatedRawDetailAmountCount === 0)} |`,
    "",
    "## PDF歳入ページ範囲",
    "",
    "| account_code | 行数 | PDF物理ページ 設定 | 実績 | 冊子ページ 設定 | 実績 | 判定 |",
    "| --- | ---: | --- | --- | --- | --- | --- |",
    ...result.sourcePageSummaries.map(
      (summary) =>
        `| \`${summary.accountCode}\` | ${formatNumber(summary.rowCount)} | ${displayNullable(summary.configuredPdfPageStart)}-${displayNullable(summary.configuredPdfPageEnd)} | ${displayNullable(summary.actualPdfPageMin)}-${displayNullable(summary.actualPdfPageMax)} | ${displayNullable(summary.configuredBudgetBookPageStart)}-${displayNullable(summary.configuredBudgetBookPageEnd)} | ${displayNullable(summary.actualBudgetBookPageMin)}-${displayNullable(summary.actualBudgetBookPageMax)} | ${passFail(summary.isPass)} |`,
    ),
    "",
    "## 充当先歳出ページ範囲",
    "",
    "| target account_code | 行数 | 冊子ページ 設定 | 実績 | 判定 |",
    "| --- | ---: | --- | --- | --- |",
    ...result.targetPageSummaries.map(
      (summary) =>
        `| \`${summary.accountCode}\` | ${formatNumber(summary.rowCount)} | ${displayNullable(summary.configuredBudgetBookPageStart)}-${displayNullable(summary.configuredBudgetBookPageEnd)} | ${displayNullable(summary.actualBudgetBookPageMin)}-${displayNullable(summary.actualBudgetBookPageMax)} | ${passFail(summary.isPass)} |`,
    ),
    "",
    "## 複数充当先",
    "",
    "以下は1つの`revenue_detail_id`が複数のtarget関係を持つ一覧。金額は歳入細節の参考値を1回だけ示したもので、各targetへの配分額ではない。",
    "",
    "| revenue_detail_id | 会計 | 細節名 | 歳入細節額（千円） | target数 | target（解決レベル・事業名・冊子頁） |",
    "| --- | --- | --- | ---: | ---: | --- |",
    ...result.multipleTargetRevenueDetails.map(
      (detail) =>
        `| \`${detail.revenueDetailId}\` | \`${detail.accountCode}\` | ${escapeTable(detail.revenueDetailName)} | ${formatNumber(detail.currentAmountThousandYen)} | ${formatNumber(detail.targetCount)} | ${detail.targets.map((target) => `${target.resolutionLevel}: ${escapeTable(target.targetProgramName)} (P${target.targetBudgetBookPage})`).join("<br>")} |`,
    ),
    "",
    "## 歳出コア不変性",
    "",
    "| ファイル | 基準行数 | 実際行数 | SHA-256一致 | 判定 |",
    "| --- | ---: | ---: | --- | --- |",
    ...coreRows.map(
      ([name, expectedRows, actualRows, expectedHash, actualHash]) =>
        `| \`${name}\` | ${formatNumber(expectedRows)} | ${formatNumber(actualRows)} | ${expectedHash === actualHash ? "yes" : "no"} | ${passFail(expectedRows === actualRows && expectedHash === actualHash)} |`,
    ),
    "",
    `- budget_program_groups再生成一致: ${passFail(result.coreIntegrity.groupRebuildMatches)}`,
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
      "歳入CSV、PDF充当事業、歳出予算事業の接続は総合検証を通過した。allocationは関係のみを表し、金額集計には使用しない。",
      "",
      `データの粒度と利用禁止事項は\`${files.dictionary}\`を参照する。`,
      "",
    );
  } else {
    lines.push(
      "| error_type | 件数 |",
      "| --- | ---: |",
      ...[...errorTypeCounts.entries()]
        .sort(([left], [right]) => compareText(left, right))
        .map(
          ([errorType, count]) =>
            `| \`${errorType}\` | ${formatNumber(count)} |`,
        ),
      "",
    );
  }

  return `${lines.join("\n")}\n`;
}

export function renderBudgetRevenueDataDictionary(): string {
  return `---
title: "令和8年度当初予算 歳入・充当関係データ辞書"
updated: 2026-07-29
tags:
  - みらい議会
  - 世田谷区
  - 予算
  - データ辞書
related:
  - 世田谷区令和8年度予算データ基盤
---

# 令和8年度当初予算 歳入・充当関係データ辞書

## 対象

令和8年度世田谷区当初予算の歳入と、公式予算説明書に記載された「充当事業」の関係を扱う。当初予算であり、実際の収入額、支出額、決算額、契約額、支払先を示すデータではない。

対象会計は一般会計、国民健康保険事業会計、後期高齢者医療会計、介護保険事業会計。学校給食費会計は令和8年度の\`abolished_zero\`会計であり、CSVには0円行を保持するがPDF充当事業抽出の対象外とする。

## テーブルと粒度

| テーブル | 粒度 | 主キー | 由来・役割 |
| --- | --- | --- | --- |
| \`budget_revenue_details.csv\` | 歳入の細節×所属 | \`revenue_detail_id\` | 公式歳入CSV由来。歳入番号、財源区分、予算額、充当・未充当額と出典行を保持する |
| \`budget_revenue_sections.csv\` | 歳入の款・項・目・節 | \`revenue_section_id\` | detailsを節単位に集約した派生データ |
| \`budget_revenue_items.csv\` | 歳入の款・項・目 | \`revenue_item_key\` | detailsを目単位に直接集約し、sectionsとも独立突合した派生データ |
| \`raw_pdf_revenue_allocations.csv\` | PDFの「充当事業」記載1件 | \`raw_allocation_id\` | 公式PDF由来の中間データ。1細節に複数事業があれば複数行になる |
| \`budget_program_groups.csv\` | 歳出の予算事業 | \`budget_program_group_id\` | 内訳事業を予算事業単位に集約した充当先候補 |
| \`budget_program_identities.csv\` | 公式PDF上で識別可能な歳出予算事業 | \`budget_program_identity_id\` | PDFで内部groupを区別できない場合に、公開資料の識別限界を保つ派生単位 |
| \`budget_revenue_allocations.csv\` | 歳入細節と歳出予算事業の関係1件 | \`allocation_link_id\` | 歳入と歳出事業に関係があることだけを表す関係テーブル |

## 集約階層

\`budget_revenue_details\`は細節×所属、\`budget_revenue_sections\`は節、\`budget_revenue_items\`は目の単位である。detailsからsections・itemsへ金額を集約できるが、\`budget_revenue_allocations\`は金額集約の経路ではない。

## 充当関係の意味

- \`budget_revenue_allocations\`は、公式PDFに「充当事業」として記載された歳入細節と歳出予算事業の関係を表す。
- 関係があることと、その歳入細節の全額が当該事業へ充当されることは同義ではない。
- 1つの歳入細節から複数の歳出事業へ関係する場合がある。
- \`allocation_amount_thousand_yen\`は全行空欄で、\`amount_attribution_status\`は\`not_available\`である。
- 歳入細節の金額を複数targetへ複製せず、配分額を推測しない。
- allocation行を合計してはいけない。件数は関係数であり、金額ではない。

## target解決レベル

| target_resolution_level | 意味 | group ID |
| --- | --- | --- |
| \`exact_group\` | 公式資料から内部の予算事業groupまで一意に確定 | \`target_budget_program_group_id\`を保持 |
| \`public_identity\` | 公式資料上は予算事業を特定できるが、複数の内部groupを区別不能 | group IDは空欄、\`target_budget_program_identity_id\`のみ保持 |

\`public_identity\`を推測で1つのgroupへ補完してはいけない。追加の公式資料が得られた場合だけ、根拠を記録して精緻化する。

## 金額利用

- 予算額の集計には\`budget_revenue_details\`、\`budget_revenue_sections\`、\`budget_revenue_items\`を粒度に応じて使用する。
- \`budget_revenue_allocations\`を金額集計に使用しない。
- 複数target一覧に歳入細節額を表示する場合も、参考情報として1回だけ表示し、targetごとの配分額と表現しない。
- 当初予算の額は、実際の収入額・支出額・決算額ではない。

## 安全な結合

- 歳入明細: \`budget_revenue_allocations.revenue_detail_id\` → \`budget_revenue_details.revenue_detail_id\`
- 歳出の公開資料単位: \`target_budget_program_identity_id\` → \`budget_program_identities.budget_program_identity_id\`
- 内部group: \`target_resolution_level=exact_group\`の行だけ、\`target_budget_program_group_id\` → \`budget_program_groups.budget_program_group_id\`
- \`public_identity\`行ではgroup IDが空欄であることを正常として扱う

## 禁止事項

- allocationの行数や歳入細節額をtarget別に合計する
- 1歳入細節の全額が各targetへ充当されると説明する
- 複数targetへ同じ歳入額を付与する
- 公式PDFで区別不能な内部groupを名称類似度、歳入額、歳出額から推測する
- 当初予算から実収入、実支出、決算、契約、事業者を推論する

## 品質保証

\`revenue_allocation_validation_errors.csv\`がヘッダーのみで、\`revenue_allocation_validation_report.md\`がPASSのとき、Phase 24の歳入3テーブル、PDF行との対応、参照整合性、ページ範囲、金額非帰属、歳出コア不変性が確認済みである。
`;
}
