import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type {
  BudgetAccountDefinition,
  BudgetAccountsConfig,
} from "./budget-accounts";
import {
  type BudgetProgramGroup,
  type BudgetProgramGroupValidation,
  parseCandidateBudgetBookPages,
} from "./budget-program-groups";
import {
  REVENUE_ALLOCATION_SOURCE_MATCH_COLUMNS,
  type RevenueAllocationSourceMatch,
} from "./revenue-allocation-source-matches";

export const EXPECTED_BUDGET_REVENUE_ALLOCATION_ROW_COUNT = 1_948;
export const TARGET_PAGE_FORWARD_OFFSETS = [0, 2, 4, 6] as const;

export const REVENUE_ALLOCATION_TARGET_MATCH_STATUSES = [
  "matched",
  "ambiguous",
  "unmatched",
  "manually_confirmed",
] as const;

export const REVENUE_ALLOCATION_TARGET_MATCH_METHODS = [
  "page_and_exact_name",
  "page_name_department",
  "page_and_normalized_name",
  "manual_override",
] as const;

export const BUDGET_REVENUE_ALLOCATION_COLUMNS = [
  "allocation_link_id",
  "revenue_detail_id",
  "target_budget_program_group_id",
  "target_budget_item_key",
  "target_account_code",
  "pdf_target_program_name",
  "matched_budget_program_name",
  "target_budget_book_page",
  "source_pdf_page",
  "source_budget_book_page",
  "target_match_status",
  "target_match_method",
  "amount_attribution_status",
  "allocation_amount_thousand_yen",
  "source_file",
  "raw_text",
  "review_note",
] as const;

export const REVENUE_ALLOCATION_TARGET_OVERRIDE_COLUMNS = [
  "raw_allocation_id",
  "revenue_detail_id",
  "target_budget_book_page",
  "target_account_code",
  "pdf_target_program_name",
  "pdf_department_name",
  "candidate_budget_program_group_ids",
  "candidate_budget_item_keys",
  "candidate_budget_program_names",
  "candidate_department_names",
  "candidate_budget_book_pages",
  "selected_budget_program_group_id",
  "override_note",
] as const;

export type RevenueAllocationTargetMatchStatus =
  (typeof REVENUE_ALLOCATION_TARGET_MATCH_STATUSES)[number];

export type RevenueAllocationTargetMatchMethod =
  (typeof REVENUE_ALLOCATION_TARGET_MATCH_METHODS)[number];

export type RevenueAllocationTargetOverride = Record<
  (typeof REVENUE_ALLOCATION_TARGET_OVERRIDE_COLUMNS)[number],
  string
>;

export interface BudgetRevenueAllocation {
  allocation_link_id: string;
  revenue_detail_id: string;
  target_budget_program_group_id: string;
  target_budget_item_key: string;
  target_account_code: string;
  pdf_target_program_name: string;
  matched_budget_program_name: string;
  target_budget_book_page: number;
  source_pdf_page: number;
  source_budget_book_page: number;
  target_match_status: RevenueAllocationTargetMatchStatus;
  target_match_method: RevenueAllocationTargetMatchMethod | "";
  amount_attribution_status: "not_available";
  allocation_amount_thousand_yen: "";
  source_file: string;
  raw_text: string;
  review_note: string;
}

export interface TargetCandidate {
  group: BudgetProgramGroup;
  pageOffset: number;
}

export interface RevenueAllocationTargetDecision {
  rawAllocationId: string;
  revenueDetailId: string;
  sourceAccountCode: string;
  targetAccountCode: string;
  targetBudgetBookPage: number;
  pdfTargetProgramName: string;
  pdfDepartmentName: string;
  targetGroupId: string;
  targetBudgetItemKey: string;
  matchedBudgetProgramName: string;
  status: RevenueAllocationTargetMatchStatus;
  method: RevenueAllocationTargetMatchMethod | "";
  pageOffset: number | null;
  candidates: TargetCandidate[];
  note: string;
}

export interface RevenueAllocationTargetBuildResult {
  allocations: BudgetRevenueAllocation[];
  overrideRows: RevenueAllocationTargetOverride[];
  decisions: RevenueAllocationTargetDecision[];
}

export interface RevenueAllocationTargetValidation {
  sourceRowCount: number;
  allocationRowCount: number;
  uniqueAllocationLinkIdCount: number;
  uniqueRevenueDetailIdCount: number;
  uniqueMatchedTargetGroupIdCount: number;
  statusCounts: Record<RevenueAllocationTargetMatchStatus, number>;
  methodCounts: Record<RevenueAllocationTargetMatchMethod, number>;
  targetAccountCounts: Record<string, number>;
  sourceTargetAccountPairCounts: Record<string, number>;
  pageOffsetCounts: Record<string, number>;
  revenueDetailReferenceErrorCount: number;
  targetReferenceErrorCount: number;
  duplicateRevenueTargetPairCount: number;
  nonBlankAllocationAmountCount: number;
  amountAttributionStatusErrorCount: number;
  sourceValueDifferenceCount: number;
  overrideRowCount: number;
  unresolvedCount: number;
  structuralPass: boolean;
  isPass: boolean;
}

export interface RevenueAllocationTargetReportFiles {
  sourceMatches: string;
  budgetPrograms: string;
  budgetSections: string;
  budgetItems: string;
  accountsConfig: string;
  programGroups: string;
  allocations: string;
  overrides: string;
}

function parseCsvRecords(
  csvText: string,
  expectedColumns: readonly string[],
  sourceName: string,
  allowHeaderOnly = false,
): Array<Record<string, string>> {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length === 0) {
    if (allowHeaderOnly && csvText.trim().length === 0) {
      return [];
    }
    throw new Error(`${sourceName}が空です。`);
  }
  if (records[0].join(",") !== expectedColumns.join(",")) {
    throw new Error(`${sourceName}の列が一致しません。`);
  }
  if (!allowHeaderOnly && records.length === 1) {
    throw new Error(`${sourceName}にデータ行がありません。`);
  }
  return records.slice(1).map((record) =>
    Object.fromEntries(
      expectedColumns.map((column, index) => [column, record[index]]),
    ),
  );
}

function parsePositiveInteger(value: string, fieldName: string): number {
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`${fieldName}が正の整数ではありません: ${value}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName}が正の整数ではありません: ${value}`);
  }
  return parsed;
}

function requiredText(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName}が空です。`);
  }
  return value;
}

export function parseRevenueAllocationSourceMatchRows(
  csvText: string,
): RevenueAllocationSourceMatch[] {
  const rows = parseCsvRecords(
    csvText,
    REVENUE_ALLOCATION_SOURCE_MATCH_COLUMNS,
    "revenue_allocation_source_matches.csv",
  ) as RevenueAllocationSourceMatch[];
  const rawAllocationIds = new Set<string>();
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const prefix =
      `revenue_allocation_source_matches.csv ${index + 1}行目`;
    if (rawAllocationIds.has(row.raw_allocation_id)) {
      throw new Error(
        `raw_allocation_idが重複しています: ${row.raw_allocation_id}`,
      );
    }
    rawAllocationIds.add(
      requiredText(
        row.raw_allocation_id,
        `${prefix}.raw_allocation_id`,
      ),
    );
    requiredText(
      row.revenue_detail_id,
      `${prefix}.revenue_detail_id`,
    );
    if (
      row.source_match_status !== "matched" &&
      row.source_match_status !== "manually_confirmed"
    ) {
      throw new Error(
        `${prefix}.source_match_statusが接続済みではありません: ` +
          row.source_match_status,
      );
    }
    requiredText(
      row.pdf_target_program_name,
      `${prefix}.pdf_target_program_name`,
    );
    parsePositiveInteger(
      row.target_budget_book_page,
      `${prefix}.target_budget_book_page`,
    );
    parsePositiveInteger(row.pdf_page, `${prefix}.pdf_page`);
    parsePositiveInteger(
      row.budget_book_page,
      `${prefix}.budget_book_page`,
    );
  }
  return rows;
}

export function parseRevenueAllocationTargetOverrides(
  csvText: string,
): RevenueAllocationTargetOverride[] {
  if (csvText.trim().length === 0) {
    return [];
  }
  const rows = parseCsvRecords(
    csvText,
    REVENUE_ALLOCATION_TARGET_OVERRIDE_COLUMNS,
    "revenue_allocation_target_overrides.csv",
    true,
  ) as RevenueAllocationTargetOverride[];
  const rawAllocationIds = new Set<string>();
  for (const row of rows) {
    requiredText(
      row.raw_allocation_id,
      "target override.raw_allocation_id",
    );
    if (rawAllocationIds.has(row.raw_allocation_id)) {
      throw new Error(
        `target overrideのraw_allocation_idが重複しています: ` +
          row.raw_allocation_id,
      );
    }
    rawAllocationIds.add(row.raw_allocation_id);
  }
  return rows;
}

export function normalizeTargetProgramName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[･·•∙⋅]/g, "・")
    .replace(/[‐‑‒–—―−﹣]/g, "-")
    .replace(/[\s\u3000]+/gu, "");
}

export function determineTargetAccount(
  targetBudgetBookPage: number,
  config: BudgetAccountsConfig,
): BudgetAccountDefinition {
  const matches = config.accounts.filter(
    (account) =>
      account.status === "active" &&
      account.pdf_budget_book_start_page !== null &&
      account.pdf_budget_book_end_page !== null &&
      targetBudgetBookPage >= account.pdf_budget_book_start_page &&
      targetBudgetBookPage <= account.pdf_budget_book_end_page,
  );
  if (matches.length !== 1) {
    throw new Error(
      `target_budget_book_pageから対象会計を一意に決定できません: ` +
        `${targetBudgetBookPage}, candidates=${matches.length}`,
    );
  }
  return matches[0];
}

export function candidatePageOffset(
  targetBudgetBookPage: number,
  group: BudgetProgramGroup,
): number | null {
  const compatibleOffsets = parseCandidateBudgetBookPages(
    group.candidate_budget_book_pages,
  )
    .map((page) => targetBudgetBookPage - page)
    .filter((offset) =>
      TARGET_PAGE_FORWARD_OFFSETS.includes(
        offset as (typeof TARGET_PAGE_FORWARD_OFFSETS)[number],
      ),
    );
  if (compatibleOffsets.length === 0) {
    return null;
  }
  return Math.min(...compatibleOffsets);
}

function departmentMatches(
  pdfDepartmentName: string,
  group: BudgetProgramGroup,
): boolean {
  const normalizedDepartment =
    normalizeTargetProgramName(pdfDepartmentName);
  if (normalizedDepartment.length === 0) {
    return false;
  }
  const rawDepartmentParts = group.department_name.split(/[＊*]/);
  const candidates = [
    group.department_name,
    ...rawDepartmentParts,
    group.department_display_name_for_matching,
  ]
    .map(normalizeTargetProgramName)
    .filter((value) => value.length > 0);
  return candidates.some(
    (candidate) =>
      candidate === normalizedDepartment ||
      candidate.startsWith(normalizedDepartment),
  );
}

function automaticDecision(
  source: RevenueAllocationSourceMatch,
  groups: BudgetProgramGroup[],
  config: BudgetAccountsConfig,
): RevenueAllocationTargetDecision {
  const targetBudgetBookPage = parsePositiveInteger(
    source.target_budget_book_page,
    `${source.raw_allocation_id}.target_budget_book_page`,
  );
  const targetAccount = determineTargetAccount(
    targetBudgetBookPage,
    config,
  );
  const pageCandidates = groups
    .filter(
      (group) =>
        group.account_code === targetAccount.account_code &&
        group.fiscal_year === Number(source.fiscal_year),
    )
    .map((group) => ({
      group,
      pageOffset: candidatePageOffset(targetBudgetBookPage, group),
    }))
    .filter(
      (candidate): candidate is TargetCandidate =>
        candidate.pageOffset !== null,
    );
  const exactNameCandidates = pageCandidates.filter(
    (candidate) =>
      candidate.group.budget_program_name ===
      source.pdf_target_program_name,
  );
  const normalizedName = normalizeTargetProgramName(
    source.pdf_target_program_name,
  );
  const normalizedNameCandidates = pageCandidates.filter(
    (candidate) =>
      normalizeTargetProgramName(
        candidate.group.budget_program_name,
      ) === normalizedName,
  );
  const nameCandidates =
    exactNameCandidates.length > 0
      ? exactNameCandidates
      : normalizedNameCandidates;
  const base = {
    rawAllocationId: source.raw_allocation_id,
    revenueDetailId: source.revenue_detail_id,
    sourceAccountCode: source.account_code,
    targetAccountCode: targetAccount.account_code,
    targetBudgetBookPage,
    pdfTargetProgramName: source.pdf_target_program_name,
    pdfDepartmentName: source.pdf_department_name,
  };

  if (nameCandidates.length === 0) {
    return {
      ...base,
      targetGroupId: "",
      targetBudgetItemKey: "",
      matchedBudgetProgramName: "",
      status: "unmatched",
      method: "",
      pageOffset: null,
      candidates: pageCandidates,
      note:
        `no_name_candidate_in_target_account_page_window;` +
        `page_candidates=${pageCandidates.length}`,
    };
  }

  const nearestOffset = Math.min(
    ...nameCandidates.map((candidate) => candidate.pageOffset),
  );
  const nearestCandidates = nameCandidates.filter(
    (candidate) => candidate.pageOffset === nearestOffset,
  );
  if (nearestCandidates.length === 1) {
    const selected = nearestCandidates[0];
    return {
      ...base,
      targetGroupId: selected.group.budget_program_group_id,
      targetBudgetItemKey: selected.group.budget_item_key,
      matchedBudgetProgramName: selected.group.budget_program_name,
      status: "matched",
      method:
        exactNameCandidates.length > 0
          ? "page_and_exact_name"
          : "page_and_normalized_name",
      pageOffset: selected.pageOffset,
      candidates: nearestCandidates,
      note:
        exactNameCandidates.length > 0
          ? `target_page_account_and_exact_name_unique;` +
            `page_offset=${selected.pageOffset}`
          : `target_page_account_and_nfkc_name_unique;` +
            `page_offset=${selected.pageOffset}`,
    };
  }

  const departmentCandidates = nearestCandidates.filter((candidate) =>
    departmentMatches(source.pdf_department_name, candidate.group),
  );
  if (departmentCandidates.length === 1) {
    const selected = departmentCandidates[0];
    return {
      ...base,
      targetGroupId: selected.group.budget_program_group_id,
      targetBudgetItemKey: selected.group.budget_item_key,
      matchedBudgetProgramName: selected.group.budget_program_name,
      status: "matched",
      method: "page_name_department",
      pageOffset: selected.pageOffset,
      candidates: nearestCandidates,
      note:
        `target_page_name_and_department_unique;` +
        `page_offset=${selected.pageOffset}`,
    };
  }

  return {
    ...base,
    targetGroupId: "",
    targetBudgetItemKey: "",
    matchedBudgetProgramName: "",
    status: "ambiguous",
    method: "",
    pageOffset: nearestOffset,
    candidates:
      departmentCandidates.length > 1
        ? departmentCandidates
        : nearestCandidates,
    note:
      `multiple_target_groups_after_page_name_department;` +
      `name_candidates=${nearestCandidates.length};` +
      `department_candidates=${departmentCandidates.length};` +
      `page_offset=${nearestOffset}`,
  };
}

function buildAllocationLinkId(rawAllocationId: string): string {
  if (!/^ra_[A-Za-z0-9_]+$/.test(rawAllocationId)) {
    throw new Error(
      `raw_allocation_idの形式が不正です: ${rawAllocationId}`,
    );
  }
  return `ral_${rawAllocationId.slice(3)}`;
}

function buildOverrideRow(
  source: RevenueAllocationSourceMatch,
  decision: RevenueAllocationTargetDecision,
  existingOverride?: RevenueAllocationTargetOverride,
): RevenueAllocationTargetOverride {
  return {
    raw_allocation_id: source.raw_allocation_id,
    revenue_detail_id: source.revenue_detail_id,
    target_budget_book_page: source.target_budget_book_page,
    target_account_code: decision.targetAccountCode,
    pdf_target_program_name: source.pdf_target_program_name,
    pdf_department_name: source.pdf_department_name,
    candidate_budget_program_group_ids: decision.candidates
      .map((candidate) => candidate.group.budget_program_group_id)
      .join("|"),
    candidate_budget_item_keys: decision.candidates
      .map((candidate) => candidate.group.budget_item_key)
      .join("|"),
    candidate_budget_program_names: decision.candidates
      .map((candidate) => candidate.group.budget_program_name)
      .join("|"),
    candidate_department_names: decision.candidates
      .map((candidate) => candidate.group.department_name)
      .join("|"),
    candidate_budget_book_pages: decision.candidates
      .map((candidate) => candidate.group.candidate_budget_book_pages)
      .join("|"),
    selected_budget_program_group_id:
      existingOverride?.selected_budget_program_group_id ?? "",
    override_note:
      existingOverride?.override_note || decision.note,
  };
}

export function transformRevenueAllocationTargets(
  sources: RevenueAllocationSourceMatch[],
  groups: BudgetProgramGroup[],
  config: BudgetAccountsConfig,
  overrides: RevenueAllocationTargetOverride[] = [],
): RevenueAllocationTargetBuildResult {
  const groupsById = new Map(
    groups.map((group) => [group.budget_program_group_id, group]),
  );
  const sourcesByRawId = new Map(
    sources.map((source) => [source.raw_allocation_id, source]),
  );
  const overridesByRawId = new Map(
    overrides.map((override) => [
      override.raw_allocation_id,
      override,
    ]),
  );
  for (const override of overrides) {
    if (!sourcesByRawId.has(override.raw_allocation_id)) {
      throw new Error(
        `target overrideのraw_allocation_idが入力に存在しません: ` +
          override.raw_allocation_id,
      );
    }
  }

  const allocations: BudgetRevenueAllocation[] = [];
  const overrideRows: RevenueAllocationTargetOverride[] = [];
  const decisions: RevenueAllocationTargetDecision[] = [];

  for (const source of sources) {
    const automatic = automaticDecision(source, groups, config);
    const existingOverride = overridesByRawId.get(
      source.raw_allocation_id,
    );
    const selectedGroupId =
      existingOverride?.selected_budget_program_group_id.trim() ?? "";
    let decision = automatic;

    if (selectedGroupId.length > 0) {
      const selectedGroup = groupsById.get(selectedGroupId);
      if (!selectedGroup) {
        throw new Error(
          `target overrideのbudget_program_group_idが存在しません: ` +
            selectedGroupId,
        );
      }
      const targetAccount = determineTargetAccount(
        automatic.targetBudgetBookPage,
        config,
      );
      const pageOffset = candidatePageOffset(
        automatic.targetBudgetBookPage,
        selectedGroup,
      );
      if (
        selectedGroup.account_code !== targetAccount.account_code ||
        selectedGroup.fiscal_year !== Number(source.fiscal_year) ||
        pageOffset === null
      ) {
        throw new Error(
          `target overrideが対象ページ・会計の候補外です: ` +
            `${source.raw_allocation_id} -> ${selectedGroupId}`,
        );
      }
      const candidateAlreadyIncluded = automatic.candidates.some(
        (candidate) =>
          candidate.group.budget_program_group_id === selectedGroupId,
      );
      decision = {
        ...automatic,
        targetGroupId: selectedGroupId,
        targetBudgetItemKey: selectedGroup.budget_item_key,
        matchedBudgetProgramName:
          selectedGroup.budget_program_name,
        status: "manually_confirmed",
        method: "manual_override",
        pageOffset,
        candidates: candidateAlreadyIncluded
          ? automatic.candidates
          : [
              ...automatic.candidates,
              { group: selectedGroup, pageOffset },
            ],
        note:
          existingOverride?.override_note.trim() ||
          "manual_override_confirmed",
      };
    }
    decisions.push(decision);

    if (
      decision.status === "ambiguous" ||
      decision.status === "unmatched" ||
      decision.status === "manually_confirmed"
    ) {
      overrideRows.push(
        buildOverrideRow(source, decision, existingOverride),
      );
    }

    const selectedGroup =
      decision.targetGroupId.length > 0
        ? groupsById.get(decision.targetGroupId)
        : undefined;
    allocations.push({
      allocation_link_id: buildAllocationLinkId(
        source.raw_allocation_id,
      ),
      revenue_detail_id: source.revenue_detail_id,
      target_budget_program_group_id:
        selectedGroup?.budget_program_group_id ?? "",
      target_budget_item_key:
        selectedGroup?.budget_item_key ?? "",
      target_account_code: decision.targetAccountCode,
      pdf_target_program_name: source.pdf_target_program_name,
      matched_budget_program_name:
        selectedGroup?.budget_program_name ?? "",
      target_budget_book_page: decision.targetBudgetBookPage,
      source_pdf_page: parsePositiveInteger(
        source.pdf_page,
        `${source.raw_allocation_id}.pdf_page`,
      ),
      source_budget_book_page: parsePositiveInteger(
        source.budget_book_page,
        `${source.raw_allocation_id}.budget_book_page`,
      ),
      target_match_status: decision.status,
      target_match_method: decision.method,
      amount_attribution_status: "not_available",
      allocation_amount_thousand_yen: "",
      source_file: source.source_file,
      raw_text: source.raw_text,
      review_note: decision.note,
    });
  }

  return {
    allocations,
    overrideRows,
    decisions,
  };
}

function countBy<T extends string>(
  values: readonly T[],
  initialValues: readonly T[] = [],
): Record<T, number> {
  const counts = Object.fromEntries(
    initialValues.map((value) => [value, 0]),
  ) as Record<T, number>;
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export function validateRevenueAllocationTargets(
  sources: RevenueAllocationSourceMatch[],
  groups: BudgetProgramGroup[],
  result: RevenueAllocationTargetBuildResult,
): RevenueAllocationTargetValidation {
  const groupsById = new Map(
    groups.map((group) => [group.budget_program_group_id, group]),
  );
  const uniqueAllocationLinkIds = new Set<string>();
  const uniqueRevenueDetailIds = new Set<string>();
  const uniqueMatchedTargetGroupIds = new Set<string>();
  const revenueTargetPairs = new Set<string>();
  let revenueDetailReferenceErrorCount = 0;
  let targetReferenceErrorCount = 0;
  let duplicateRevenueTargetPairCount = 0;
  let nonBlankAllocationAmountCount = 0;
  let amountAttributionStatusErrorCount = 0;
  let sourceValueDifferenceCount = 0;

  for (
    let index = 0;
    index < result.allocations.length;
    index += 1
  ) {
    const allocation = result.allocations[index];
    const source = sources[index];
    uniqueAllocationLinkIds.add(allocation.allocation_link_id);
    uniqueRevenueDetailIds.add(allocation.revenue_detail_id);
    if (
      !source ||
      source.revenue_detail_id !== allocation.revenue_detail_id ||
      source.pdf_target_program_name !==
        allocation.pdf_target_program_name ||
      source.target_budget_book_page !==
        String(allocation.target_budget_book_page) ||
      source.pdf_page !== String(allocation.source_pdf_page) ||
      source.budget_book_page !==
        String(allocation.source_budget_book_page) ||
      source.source_file !== allocation.source_file ||
      source.raw_text !== allocation.raw_text
    ) {
      sourceValueDifferenceCount += 1;
    }
    if (
      !source ||
      source.revenue_detail_id.trim().length === 0 ||
      (source.source_match_status !== "matched" &&
        source.source_match_status !== "manually_confirmed")
    ) {
      revenueDetailReferenceErrorCount += 1;
    }
    if (allocation.allocation_amount_thousand_yen !== "") {
      nonBlankAllocationAmountCount += 1;
    }
    if (allocation.amount_attribution_status !== "not_available") {
      amountAttributionStatusErrorCount += 1;
    }

    const isResolved =
      allocation.target_match_status === "matched" ||
      allocation.target_match_status === "manually_confirmed";
    if (isResolved) {
      const group = groupsById.get(
        allocation.target_budget_program_group_id,
      );
      if (
        !group ||
        group.budget_item_key !==
          allocation.target_budget_item_key ||
        group.account_code !== allocation.target_account_code ||
        group.budget_program_name !==
          allocation.matched_budget_program_name
      ) {
        targetReferenceErrorCount += 1;
      } else {
        uniqueMatchedTargetGroupIds.add(
          group.budget_program_group_id,
        );
        const pair =
          `${allocation.revenue_detail_id}\u001f` +
          group.budget_program_group_id;
        if (revenueTargetPairs.has(pair)) {
          duplicateRevenueTargetPairCount += 1;
        }
        revenueTargetPairs.add(pair);
      }
    } else if (
      allocation.target_budget_program_group_id !== "" ||
      allocation.target_budget_item_key !== "" ||
      allocation.matched_budget_program_name !== ""
    ) {
      targetReferenceErrorCount += 1;
    }
  }

  const statusCounts = countBy(
    result.allocations.map(
      (allocation) => allocation.target_match_status,
    ),
    REVENUE_ALLOCATION_TARGET_MATCH_STATUSES,
  );
  const methodCounts = countBy(
    result.allocations
      .map((allocation) => allocation.target_match_method)
      .filter(
        (method): method is RevenueAllocationTargetMatchMethod =>
          method !== "",
      ),
    REVENUE_ALLOCATION_TARGET_MATCH_METHODS,
  );
  const targetAccountCounts = countBy(
    result.allocations.map(
      (allocation) => allocation.target_account_code,
    ),
  );
  const sourceTargetAccountPairCounts = countBy(
    result.decisions.map(
      (decision) =>
        `${decision.sourceAccountCode}->${decision.targetAccountCode}`,
    ),
  );
  const pageOffsetCounts = countBy(
    result.decisions
      .map((decision) => decision.pageOffset)
      .filter((offset): offset is number => offset !== null)
      .map(String),
  );
  const unresolvedCount =
    statusCounts.ambiguous + statusCounts.unmatched;
  const structuralPass =
    sources.length === result.allocations.length &&
    uniqueAllocationLinkIds.size === result.allocations.length &&
    revenueDetailReferenceErrorCount === 0 &&
    targetReferenceErrorCount === 0 &&
    duplicateRevenueTargetPairCount === 0 &&
    nonBlankAllocationAmountCount === 0 &&
    amountAttributionStatusErrorCount === 0 &&
    sourceValueDifferenceCount === 0;

  return {
    sourceRowCount: sources.length,
    allocationRowCount: result.allocations.length,
    uniqueAllocationLinkIdCount: uniqueAllocationLinkIds.size,
    uniqueRevenueDetailIdCount: uniqueRevenueDetailIds.size,
    uniqueMatchedTargetGroupIdCount:
      uniqueMatchedTargetGroupIds.size,
    statusCounts,
    methodCounts,
    targetAccountCounts,
    sourceTargetAccountPairCounts,
    pageOffsetCounts,
    revenueDetailReferenceErrorCount,
    targetReferenceErrorCount,
    duplicateRevenueTargetPairCount,
    nonBlankAllocationAmountCount,
    amountAttributionStatusErrorCount,
    sourceValueDifferenceCount,
    overrideRowCount: result.overrideRows.length,
    unresolvedCount,
    structuralPass,
    isPass: structuralPass && unresolvedCount === 0,
  };
}

export function serializeBudgetRevenueAllocations(
  allocations: BudgetRevenueAllocation[],
): string {
  return stringify(allocations, {
    columns: [...BUDGET_REVENUE_ALLOCATION_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

export function serializeRevenueAllocationTargetOverrides(
  overrides: RevenueAllocationTargetOverride[],
): string {
  return stringify(overrides, {
    columns: [...REVENUE_ALLOCATION_TARGET_OVERRIDE_COLUMNS],
    header: true,
    record_delimiter: "unix",
  });
}

function validateSerializedRows(
  csvText: string,
  expectedColumns: readonly string[],
  expectedRows: Array<Record<string, string | number>>,
  sourceName: string,
): void {
  const rows = parseCsvRecords(
    csvText,
    expectedColumns,
    sourceName,
    true,
  );
  if (rows.length !== expectedRows.length) {
    throw new Error(
      `${sourceName}の再読込行数が一致しません: ` +
        `${rows.length} != ${expectedRows.length}`,
    );
  }
  for (
    let rowIndex = 0;
    rowIndex < expectedRows.length;
    rowIndex += 1
  ) {
    for (const column of expectedColumns) {
      if (
        rows[rowIndex][column] !==
        String(expectedRows[rowIndex][column])
      ) {
        throw new Error(
          `${sourceName}の再読込比較に失敗しました: ` +
            `row=${rowIndex + 1}, column=${column}`,
        );
      }
    }
  }
}

export function validateSerializedBudgetRevenueAllocations(
  csvText: string,
  allocations: BudgetRevenueAllocation[],
): void {
  validateSerializedRows(
    csvText,
    BUDGET_REVENUE_ALLOCATION_COLUMNS,
    allocations as unknown as Array<Record<string, string | number>>,
    "budget_revenue_allocations.csv",
  );
}

export function validateSerializedRevenueAllocationTargetOverrides(
  csvText: string,
  overrides: RevenueAllocationTargetOverride[],
): void {
  validateSerializedRows(
    csvText,
    REVENUE_ALLOCATION_TARGET_OVERRIDE_COLUMNS,
    overrides,
    "revenue_allocation_target_overrides.csv",
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function unresolvedRows(
  status: "ambiguous" | "unmatched",
  result: RevenueAllocationTargetBuildResult,
): string[] {
  const decisions = result.decisions.filter(
    (decision) => decision.status === status,
  );
  if (decisions.length === 0) {
    return ["- 0件"];
  }
  return [
    "| raw_allocation_id | revenue_detail_id | target page | PDF事業名 | target account | 候補group | 理由 |",
    "|---|---|---:|---|---|---|---|",
    ...decisions.map(
      (decision) =>
        `| ${markdownCell(decision.rawAllocationId)} ` +
        `| ${markdownCell(decision.revenueDetailId)} ` +
        `| ${decision.targetBudgetBookPage} ` +
        `| ${markdownCell(decision.pdfTargetProgramName)} ` +
        `| ${markdownCell(decision.targetAccountCode)} ` +
        `| ${markdownCell(
          decision.candidates
            .map(
              (candidate) =>
                candidate.group.budget_program_group_id,
            )
            .join(", "),
        )} ` +
        `| ${markdownCell(decision.note)} |`,
    ),
  ];
}

export function renderRevenueAllocationTargetMatchReport(
  groupValidation: BudgetProgramGroupValidation,
  targetValidation: RevenueAllocationTargetValidation,
  result: RevenueAllocationTargetBuildResult,
  files: RevenueAllocationTargetReportFiles,
): string {
  const accountCodes = Array.from(
    new Set([
      ...Object.keys(groupValidation.accountGroupCounts),
      ...Object.keys(targetValidation.targetAccountCounts),
    ]),
  ).sort();
  const finalStatus = targetValidation.isPass
    ? "PASS"
    : targetValidation.structuralPass
      ? "NEEDS_REVIEW"
      : "FAIL";
  const lines = [
    "# 歳入充当事業・歳出予算事業 接続レポート",
    "",
    `**最終判定: ${finalStatus}**`,
    "",
    "## 入出力",
    "",
    `- 歳入細節接続結果: \`${files.sourceMatches}\``,
    `- 歳出予算事業: \`${files.budgetPrograms}\``,
    `- 歳出節: \`${files.budgetSections}\``,
    `- 歳出目マスタ: \`${files.budgetItems}\``,
    `- 会計設定: \`${files.accountsConfig}\``,
    `- 予算事業グループ: \`${files.programGroups}\``,
    `- 充当関係: \`${files.allocations}\``,
    `- 手動補正: \`${files.overrides}\``,
    "",
    "## 予算事業グループ",
    "",
    "| 指標 | 件数・金額 |",
    "|---|---:|",
    `| budget_program_group行 | ${formatNumber(groupValidation.rowCount)} |`,
    `| 一意budget_program_group_id | ${formatNumber(groupValidation.uniqueGroupIdCount)} |`,
    `| 元program行 | ${formatNumber(groupValidation.sourceProgramRowCount)} |`,
    `| member_program_count合計 | ${formatNumber(groupValidation.memberProgramCountTotal)} |`,
    `| グループ金額合計（千円） | ${formatNumber(groupValidation.groupAmountTotalThousandYen)} |`,
    `| candidate_budget_book_pages空欄 | ${formatNumber(groupValidation.groupsWithoutCandidatePages)} |`,
    "",
    "| account_code | group数 | 金額（千円） | target関係行 |",
    "|---|---:|---:|---:|",
    ...accountCodes.map(
      (accountCode) =>
        `| ${accountCode} ` +
        `| ${formatNumber(groupValidation.accountGroupCounts[accountCode] ?? 0)} ` +
        `| ${formatNumber(groupValidation.accountAmountTotalsThousandYen[accountCode] ?? 0)} ` +
        `| ${formatNumber(targetValidation.targetAccountCounts[accountCode] ?? 0)} |`,
    ),
    "",
    "`candidate_budget_book_pages`は、同じ`budget_item_key`に属する`budget_sections.csv`の冊子ページを昇順・`|`区切りで保持します。空欄17件はすべて0円事業です。",
    "",
    "## 充当関係",
    "",
    "| 指標 | 件数 |",
    "|---|---:|",
    `| source match行 | ${formatNumber(targetValidation.sourceRowCount)} |`,
    `| allocation行 | ${formatNumber(targetValidation.allocationRowCount)} |`,
    `| 一意allocation_link_id | ${formatNumber(targetValidation.uniqueAllocationLinkIdCount)} |`,
    `| 一意revenue_detail_id | ${formatNumber(targetValidation.uniqueRevenueDetailIdCount)} |`,
    `| 接続済み一意target group | ${formatNumber(targetValidation.uniqueMatchedTargetGroupIdCount)} |`,
    `| 手動補正候補行 | ${formatNumber(targetValidation.overrideRowCount)} |`,
    "",
    "### target_match_status",
    "",
    "| status | 件数 |",
    "|---|---:|",
    ...REVENUE_ALLOCATION_TARGET_MATCH_STATUSES.map(
      (status) =>
        `| ${status} | ${formatNumber(targetValidation.statusCounts[status])} |`,
    ),
    "",
    "### target_match_method",
    "",
    "| method | 件数 |",
    "|---|---:|",
    ...REVENUE_ALLOCATION_TARGET_MATCH_METHODS.map(
      (method) =>
        `| ${method} | ${formatNumber(targetValidation.methodCounts[method])} |`,
    ),
    "",
    "### ページ差",
    "",
    "| target page - candidate page | 件数 |",
    "|---:|---:|",
    ...Object.entries(targetValidation.pageOffsetCounts)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(
        ([offset, count]) =>
          `| ${offset} | ${formatNumber(count)} |`,
      ),
    "",
    "## マッチング規則",
    "",
    "1. `target_budget_book_page`を`budget-accounts.json`の歳出範囲へ照合し、target会計を一意に決める。source会計はtarget会計の決定に使わない。",
    "2. targetページと同じ節表ページ、または冊子ページで2・4・6ページ前の節表アンカーを持つ同一target会計のgroupだけを候補にする。",
    "3. PDF事業名と`budget_program_name`の完全一致を優先し、なければUnicode NFKC、空白、中黒、ハイフンだけを正規化した完全一致を使う。",
    "4. 同名候補ではtargetページに最も近い候補を優先し、なお複数ならPDF部署名と内部部署名・市民向け部署名を照合する。",
    "5. 一意にならない場合は`ambiguous`または`unmatched`とし、金額・意味・類似度から推測しない。",
    "",
    "## 安全制約",
    "",
    "- このCSVは歳入細節と歳出予算事業グループの関係テーブルであり、金銭フローテーブルではない。",
    "- `allocation_amount_thousand_yen`は全行空欄、`amount_attribution_status`は全行`not_available`。",
    "- 歳入細節金額、歳出事業金額、公式CSVの財源列はtarget判定やallocation金額に使用しない。",
    "- 1歳入細節に複数のPDF充当事業記載がある場合は別行を保ち、同じ金額を複製しない。",
    "- 個別内訳事業の`program_id`へは接続せず、`budget_program_group_id`へ接続する。",
    "",
    "## 検証",
    "",
    `- program group構造検証: ${groupValidation.isPass ? "PASS" : "FAIL"}`,
    `- source行数とallocation行数: ${targetValidation.sourceRowCount === targetValidation.allocationRowCount ? "PASS" : "FAIL"}`,
    `- allocation_link_id一意性: ${targetValidation.uniqueAllocationLinkIdCount === targetValidation.allocationRowCount ? "PASS" : "FAIL"}`,
    `- revenue_detail_id参照: ${targetValidation.revenueDetailReferenceErrorCount === 0 ? "PASS" : `FAIL (${targetValidation.revenueDetailReferenceErrorCount})`}`,
    `- target group参照: ${targetValidation.targetReferenceErrorCount === 0 ? "PASS" : `FAIL (${targetValidation.targetReferenceErrorCount})`}`,
    `- revenue_detail_id・target group重複: ${targetValidation.duplicateRevenueTargetPairCount === 0 ? "PASS" : `FAIL (${targetValidation.duplicateRevenueTargetPairCount})`}`,
    `- allocation金額空欄: ${targetValidation.nonBlankAllocationAmountCount === 0 ? "PASS" : `FAIL (${targetValidation.nonBlankAllocationAmountCount})`}`,
    `- amount_attribution_status: ${targetValidation.amountAttributionStatusErrorCount === 0 ? "PASS" : `FAIL (${targetValidation.amountAttributionStatusErrorCount})`}`,
    `- 入力由来列の保持: ${targetValidation.sourceValueDifferenceCount === 0 ? "PASS" : `FAIL (${targetValidation.sourceValueDifferenceCount})`}`,
    `- ambiguous: ${formatNumber(targetValidation.statusCounts.ambiguous)}件`,
    `- unmatched: ${formatNumber(targetValidation.statusCounts.unmatched)}件`,
    "",
    "## ambiguous一覧",
    "",
    ...unresolvedRows("ambiguous", result),
    "",
    "## unmatched一覧",
    "",
    ...unresolvedRows("unmatched", result),
    "",
    "## 手動補正",
    "",
    "`config/revenue_allocation_target_overrides.csv`の`selected_budget_program_group_id`へ、候補を公式資料で確認した値だけを設定します。手動補正でもtargetページの会計・年度・ページ候補範囲外は拒否します。",
    "",
  ];
  return `${lines.join("\n")}\n`;
}
