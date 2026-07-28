import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import {
  type BudgetProgramIdentity,
  type BudgetProgramIdentityBuildResult,
  type BudgetProgramIdentitySourceGroup,
  type BudgetProgramIdentityValidation,
} from "./budget-program-identities";
import { parseCandidateBudgetBookPages } from "./budget-program-groups";
import {
  BUDGET_REVENUE_ALLOCATION_COLUMNS,
  type RevenueAllocationTargetOverride,
  REVENUE_ALLOCATION_TARGET_OVERRIDE_COLUMNS,
  TARGET_PAGE_FORWARD_OFFSETS,
  normalizeTargetProgramName,
} from "./revenue-allocation-target-matches";

export const EXPECTED_EXACT_GROUP_ALLOCATION_COUNT = 1_909;
export const EXPECTED_PUBLIC_IDENTITY_ALLOCATION_COUNT = 39;

export const IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS = [
  ...BUDGET_REVENUE_ALLOCATION_COLUMNS,
  "target_budget_program_identity_id",
  "target_resolution_level",
  "target_group_resolution_status",
  "candidate_target_group_count",
] as const;

export const REVENUE_ALLOCATION_GROUP_AMBIGUITY_COLUMNS = [
  "allocation_link_id",
  "raw_allocation_id",
  "revenue_detail_id",
  "target_budget_program_identity_id",
  "candidate_budget_program_group_ids",
  "candidate_budget_program_names",
  "candidate_department_names",
  "target_budget_book_page",
  "resolution_reason",
] as const;

export type IdentityResolvedBudgetRevenueAllocation = Record<
  (typeof IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS)[number],
  string
>;

export type RevenueAllocationGroupAmbiguity = Record<
  (typeof REVENUE_ALLOCATION_GROUP_AMBIGUITY_COLUMNS)[number],
  string
>;

export interface RevenueAllocationIdentityResolutionResult {
  allocations: IdentityResolvedBudgetRevenueAllocation[];
  groupAmbiguities: RevenueAllocationGroupAmbiguity[];
  unresolvedOverrides: RevenueAllocationTargetOverride[];
}

export interface RevenueAllocationIdentityResolutionValidation {
  inputAllocationCount: number;
  outputAllocationCount: number;
  uniqueAllocationLinkIdCount: number;
  identityMatchedCount: number;
  exactGroupCount: number;
  publicIdentityCount: number;
  ambiguousCount: number;
  unmatchedCount: number;
  groupAmbiguityCount: number;
  overrideCount: number;
  identityReferenceErrorCount: number;
  groupReferenceErrorCount: number;
  publicIdentityErrorCount: number;
  immutableValueDifferenceCount: number;
  nonBlankAllocationAmountCount: number;
  amountAttributionStatusErrorCount: number;
  structuralPass: boolean;
  isPass: boolean;
}

export interface RevenueAllocationIdentityReportFiles {
  budgetProgramGroups: string;
  sourceAllocations: string;
  sourceOverrides: string;
  budgetPrograms: string;
  budgetSections: string;
  budgetItems: string;
  identities: string;
  identityMembers: string;
  allocations: string;
  groupAmbiguities: string;
  overrides: string;
}

export interface RevenueAllocationIdentityReportHashes {
  budgetProgramGroups: string;
  budgetPrograms: string;
  budgetSections: string;
  budgetItems: string;
  identities: string;
  identityMembers: string;
  allocations: string;
  groupAmbiguities: string;
  overrides: string;
}

const IMMUTABLE_ALLOCATION_COLUMNS = [
  "allocation_link_id",
  "revenue_detail_id",
  "target_account_code",
  "pdf_target_program_name",
  "target_budget_book_page",
  "source_pdf_page",
  "source_budget_book_page",
  "amount_attribution_status",
  "allocation_amount_thousand_yen",
  "source_file",
  "raw_text",
] as const;

const PUBLIC_IDENTITY_MATCH_METHOD =
  "page_name_department_identity_cluster";
const PUBLIC_IDENTITY_RESOLUTION_LEVEL = "public_identity";
const EXACT_GROUP_RESOLUTION_LEVEL = "exact_group";
const PUBLIC_GROUP_RESOLUTION_STATUS =
  "not_distinguishable_from_public_source";
const EXACT_GROUP_RESOLUTION_STATUS = "exact";
const PUBLIC_IDENTITY_REVIEW_NOTE =
  "official_pdf_does_not_identify_internal_budget_program_group";
const GROUP_AMBIGUITY_REASON =
  "public_source_does_not_distinguish_internal_groups";

function parseCsvRows(
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

function requiredText(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName}が空です。`);
  }
  return value;
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

export function parseBudgetRevenueAllocationsForIdentityResolution(
  csvText: string,
): IdentityResolvedBudgetRevenueAllocation[] {
  const records = parse(csvText, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length < 2) {
    throw new Error(
      "budget_revenue_allocations.csvにデータ行がありません。",
    );
  }
  const columns = records[0];
  const isPhase29 =
    columns.join(",") === BUDGET_REVENUE_ALLOCATION_COLUMNS.join(",");
  const isIdentityResolved =
    columns.join(",") ===
    IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS.join(",");
  if (!isPhase29 && !isIdentityResolved) {
    throw new Error(
      "budget_revenue_allocations.csvの列が一致しません。",
    );
  }

  const allocationIds = new Set<string>();
  return records.slice(1).map((record, index) => {
    const sourceRow = Object.fromEntries(
      columns.map((column, columnIndex) => [
        column,
        record[columnIndex],
      ]),
    );
    const row = Object.fromEntries(
      IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS.map(
        (column) => [column, sourceRow[column] ?? ""],
      ),
    ) as IdentityResolvedBudgetRevenueAllocation;
    const prefix = `budget_revenue_allocations.csv ${index + 1}行目`;
    const allocationId = requiredText(
      row.allocation_link_id,
      `${prefix}.allocation_link_id`,
    );
    if (allocationIds.has(allocationId)) {
      throw new Error(
        `allocation_link_idが重複しています: ${allocationId}`,
      );
    }
    allocationIds.add(allocationId);
    requiredText(
      row.revenue_detail_id,
      `${prefix}.revenue_detail_id`,
    );
    requiredText(
      row.target_account_code,
      `${prefix}.target_account_code`,
    );
    requiredText(
      row.pdf_target_program_name,
      `${prefix}.pdf_target_program_name`,
    );
    parsePositiveInteger(
      row.target_budget_book_page,
      `${prefix}.target_budget_book_page`,
    );
    parsePositiveInteger(
      row.source_pdf_page,
      `${prefix}.source_pdf_page`,
    );
    parsePositiveInteger(
      row.source_budget_book_page,
      `${prefix}.source_budget_book_page`,
    );
    if (row.amount_attribution_status !== "not_available") {
      throw new Error(
        `${prefix}.amount_attribution_statusがnot_availableではありません。`,
      );
    }
    if (row.allocation_amount_thousand_yen !== "") {
      throw new Error(
        `${prefix}.allocation_amount_thousand_yenが空欄ではありません。`,
      );
    }
    return row;
  });
}

function rawAllocationIdFromLinkId(allocationLinkId: string): string {
  if (!/^ral_[A-Za-z0-9_]+$/.test(allocationLinkId)) {
    throw new Error(
      `allocation_link_idの形式が不正です: ${allocationLinkId}`,
    );
  }
  return `ra_${allocationLinkId.slice(4)}`;
}

function compatibleIdentityPage(
  targetBudgetBookPage: number,
  identity: BudgetProgramIdentity,
): boolean {
  return parseCandidateBudgetBookPages(
    identity.candidate_budget_book_pages,
  ).some((page) =>
    TARGET_PAGE_FORWARD_OFFSETS.includes(
      (targetBudgetBookPage -
        page) as (typeof TARGET_PAGE_FORWARD_OFFSETS)[number],
    ),
  );
}

function candidateGroupIdsFromOverride(
  override: RevenueAllocationTargetOverride,
): string[] {
  const ids = override.candidate_budget_program_group_ids
    .split("|")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(ids));
}

function assertOverrideMatchesAllocation(
  override: RevenueAllocationTargetOverride,
  allocation: IdentityResolvedBudgetRevenueAllocation,
): void {
  if (
    override.revenue_detail_id !== allocation.revenue_detail_id ||
    override.target_budget_book_page !==
      allocation.target_budget_book_page ||
    override.target_account_code !== allocation.target_account_code ||
    override.pdf_target_program_name !==
      allocation.pdf_target_program_name
  ) {
    throw new Error(
      `target overrideとallocationが一致しません: ` +
        override.raw_allocation_id,
    );
  }
  if (override.selected_budget_program_group_id.trim().length > 0) {
    throw new Error(
      `Phase 29.5ではselected_budget_program_group_idを自動使用しません: ` +
        override.raw_allocation_id,
    );
  }
}

function resolveIdentityFromCandidateGroups(
  candidateGroupIds: string[],
  identityBuild: BudgetProgramIdentityBuildResult,
): BudgetProgramIdentity | undefined {
  if (candidateGroupIds.length < 2) {
    return undefined;
  }
  const identities = candidateGroupIds.map((groupId) => {
    const identity = identityBuild.identityByGroupId.get(groupId);
    if (!identity) {
      throw new Error(
        `candidate budget_program_group_idが存在しません: ${groupId}`,
      );
    }
    return identity;
  });
  const identityIds = new Set(
    identities.map(
      (identity) => identity.budget_program_identity_id,
    ),
  );
  if (identityIds.size !== 1) {
    return undefined;
  }
  const identity = identities[0];
  const memberIds = new Set(
    (
      identityBuild.groupsByIdentityId.get(
        identity.budget_program_identity_id,
      ) ?? []
    ).map((group) => group.budget_program_group_id),
  );
  if (
    memberIds.size !== candidateGroupIds.length ||
    candidateGroupIds.some((groupId) => !memberIds.has(groupId))
  ) {
    return undefined;
  }
  return identity;
}

function buildPublicIdentityAllocation(
  allocation: IdentityResolvedBudgetRevenueAllocation,
  identity: BudgetProgramIdentity,
): IdentityResolvedBudgetRevenueAllocation {
  const targetPage = parsePositiveInteger(
    allocation.target_budget_book_page,
    `${allocation.allocation_link_id}.target_budget_book_page`,
  );
  if (
    identity.member_group_count < 2 ||
    identity.account_code !== allocation.target_account_code ||
    normalizeTargetProgramName(allocation.pdf_target_program_name) !==
      identity.normalized_program_name ||
    !compatibleIdentityPage(targetPage, identity)
  ) {
    throw new Error(
      `allocationとpublic identityが一致しません: ` +
        allocation.allocation_link_id,
    );
  }
  return {
    ...allocation,
    target_budget_program_group_id: "",
    target_budget_item_key: identity.budget_item_key,
    target_account_code: identity.account_code,
    matched_budget_program_name: identity.display_program_name,
    target_match_status: "matched",
    target_match_method: PUBLIC_IDENTITY_MATCH_METHOD,
    review_note: PUBLIC_IDENTITY_REVIEW_NOTE,
    target_budget_program_identity_id:
      identity.budget_program_identity_id,
    target_resolution_level: PUBLIC_IDENTITY_RESOLUTION_LEVEL,
    target_group_resolution_status:
      PUBLIC_GROUP_RESOLUTION_STATUS,
    candidate_target_group_count: String(
      identity.member_group_count,
    ),
  };
}

function buildExactGroupAllocation(
  allocation: IdentityResolvedBudgetRevenueAllocation,
  group: BudgetProgramIdentitySourceGroup,
  identity: BudgetProgramIdentity,
): IdentityResolvedBudgetRevenueAllocation {
  if (
    allocation.target_budget_item_key !== group.budget_item_key ||
    allocation.target_account_code !== group.account_code ||
    allocation.matched_budget_program_name !==
      group.budget_program_name
  ) {
    throw new Error(
      `exact groupとallocationが一致しません: ` +
        allocation.allocation_link_id,
    );
  }
  return {
    ...allocation,
    target_match_status: "matched",
    target_budget_program_identity_id:
      identity.budget_program_identity_id,
    target_resolution_level: EXACT_GROUP_RESOLUTION_LEVEL,
    target_group_resolution_status:
      EXACT_GROUP_RESOLUTION_STATUS,
    candidate_target_group_count: "1",
  };
}

function buildGroupAmbiguity(
  allocation: IdentityResolvedBudgetRevenueAllocation,
  identity: BudgetProgramIdentity,
  groups: BudgetProgramIdentitySourceGroup[],
): RevenueAllocationGroupAmbiguity {
  return {
    allocation_link_id: allocation.allocation_link_id,
    raw_allocation_id: rawAllocationIdFromLinkId(
      allocation.allocation_link_id,
    ),
    revenue_detail_id: allocation.revenue_detail_id,
    target_budget_program_identity_id:
      identity.budget_program_identity_id,
    candidate_budget_program_group_ids: groups
      .map((group) => group.budget_program_group_id)
      .join("|"),
    candidate_budget_program_names: groups
      .map((group) => group.budget_program_name)
      .join("|"),
    candidate_department_names: groups
      .map((group) => group.department_name)
      .join("|"),
    target_budget_book_page: allocation.target_budget_book_page,
    resolution_reason: GROUP_AMBIGUITY_REASON,
  };
}

export function resolveRevenueAllocationIdentities(
  inputAllocations: IdentityResolvedBudgetRevenueAllocation[],
  identityBuild: BudgetProgramIdentityBuildResult,
  sourceGroups: BudgetProgramIdentitySourceGroup[],
  overrides: RevenueAllocationTargetOverride[],
): RevenueAllocationIdentityResolutionResult {
  const groupsById = new Map(
    sourceGroups.map((group) => [
      group.budget_program_group_id,
      group,
    ]),
  );
  const identitiesById = new Map(
    identityBuild.identities.map((identity) => [
      identity.budget_program_identity_id,
      identity,
    ]),
  );
  const overridesByRawId = new Map(
    overrides.map((override) => [
      override.raw_allocation_id,
      override,
    ]),
  );
  const allocationRawIds = new Set(
    inputAllocations.map((allocation) =>
      rawAllocationIdFromLinkId(allocation.allocation_link_id),
    ),
  );
  for (const override of overrides) {
    if (!allocationRawIds.has(override.raw_allocation_id)) {
      throw new Error(
        `target overrideのraw_allocation_idがallocationに存在しません: ` +
          override.raw_allocation_id,
      );
    }
  }

  const allocations: IdentityResolvedBudgetRevenueAllocation[] = [];
  const groupAmbiguities: RevenueAllocationGroupAmbiguity[] = [];
  const unresolvedRawIds = new Set<string>();

  for (const input of inputAllocations) {
    const groupId = input.target_budget_program_group_id.trim();
    if (groupId.length > 0) {
      const group = groupsById.get(groupId);
      const identity = identityBuild.identityByGroupId.get(groupId);
      if (!group || !identity) {
        throw new Error(
          `target budget_program_group_idが存在しません: ${groupId}`,
        );
      }
      allocations.push(
        buildExactGroupAllocation(input, group, identity),
      );
      continue;
    }

    let identity: BudgetProgramIdentity | undefined;
    const existingIdentityId =
      input.target_budget_program_identity_id.trim();
    if (existingIdentityId.length > 0) {
      identity = identitiesById.get(existingIdentityId);
      if (!identity) {
        throw new Error(
          `target budget_program_identity_idが存在しません: ` +
            existingIdentityId,
        );
      }
    } else {
      const rawAllocationId = rawAllocationIdFromLinkId(
        input.allocation_link_id,
      );
      const override = overridesByRawId.get(rawAllocationId);
      if (override) {
        assertOverrideMatchesAllocation(override, input);
        identity = resolveIdentityFromCandidateGroups(
          candidateGroupIdsFromOverride(override),
          identityBuild,
        );
      }
    }

    if (identity) {
      const resolved = buildPublicIdentityAllocation(input, identity);
      const identityGroups =
        identityBuild.groupsByIdentityId.get(
          identity.budget_program_identity_id,
        ) ?? [];
      allocations.push(resolved);
      groupAmbiguities.push(
        buildGroupAmbiguity(resolved, identity, identityGroups),
      );
      continue;
    }

    const rawAllocationId = rawAllocationIdFromLinkId(
      input.allocation_link_id,
    );
    unresolvedRawIds.add(rawAllocationId);
    allocations.push({
      ...input,
      target_budget_program_identity_id: "",
      target_resolution_level: "",
      target_group_resolution_status: "",
      candidate_target_group_count: String(
        overridesByRawId.has(rawAllocationId)
          ? candidateGroupIdsFromOverride(
              overridesByRawId.get(rawAllocationId)!,
            ).length
          : 0,
      ),
    });
  }

  const unresolvedOverrides = overrides.filter((override) =>
    unresolvedRawIds.has(override.raw_allocation_id),
  );
  if (unresolvedOverrides.length !== unresolvedRawIds.size) {
    throw new Error(
      "identity未解決allocationに対応するtarget overrideがありません。",
    );
  }
  return {
    allocations,
    groupAmbiguities,
    unresolvedOverrides,
  };
}

export function validateRevenueAllocationIdentityResolution(
  inputAllocations: IdentityResolvedBudgetRevenueAllocation[],
  identityBuild: BudgetProgramIdentityBuildResult,
  sourceGroups: BudgetProgramIdentitySourceGroup[],
  result: RevenueAllocationIdentityResolutionResult,
): RevenueAllocationIdentityResolutionValidation {
  const identitiesById = new Map(
    identityBuild.identities.map((identity) => [
      identity.budget_program_identity_id,
      identity,
    ]),
  );
  const groupsById = new Map(
    sourceGroups.map((group) => [
      group.budget_program_group_id,
      group,
    ]),
  );
  const uniqueAllocationIds = new Set<string>();
  let identityMatchedCount = 0;
  let exactGroupCount = 0;
  let publicIdentityCount = 0;
  let ambiguousCount = 0;
  let unmatchedCount = 0;
  let identityReferenceErrorCount = 0;
  let groupReferenceErrorCount = 0;
  let publicIdentityErrorCount = 0;
  let immutableValueDifferenceCount = 0;
  let nonBlankAllocationAmountCount = 0;
  let amountAttributionStatusErrorCount = 0;

  result.allocations.forEach((allocation, index) => {
    const input = inputAllocations[index];
    uniqueAllocationIds.add(allocation.allocation_link_id);
    for (const column of IMMUTABLE_ALLOCATION_COLUMNS) {
      if (!input || input[column] !== allocation[column]) {
        immutableValueDifferenceCount += 1;
      }
    }
    if (allocation.allocation_amount_thousand_yen !== "") {
      nonBlankAllocationAmountCount += 1;
    }
    if (allocation.amount_attribution_status !== "not_available") {
      amountAttributionStatusErrorCount += 1;
    }
    if (allocation.target_match_status === "ambiguous") {
      ambiguousCount += 1;
    }
    if (allocation.target_match_status === "unmatched") {
      unmatchedCount += 1;
    }

    const identity = identitiesById.get(
      allocation.target_budget_program_identity_id,
    );
    if (!identity) {
      identityReferenceErrorCount += 1;
      return;
    }
    identityMatchedCount += 1;
    if (
      allocation.target_account_code !== identity.account_code ||
      allocation.target_budget_item_key !==
        identity.budget_item_key
    ) {
      identityReferenceErrorCount += 1;
    }

    if (
      allocation.target_resolution_level ===
      EXACT_GROUP_RESOLUTION_LEVEL
    ) {
      exactGroupCount += 1;
      const group = groupsById.get(
        allocation.target_budget_program_group_id,
      );
      if (
        !group ||
        identityBuild.identityByGroupId.get(
          group.budget_program_group_id,
        )?.budget_program_identity_id !==
          identity.budget_program_identity_id ||
        allocation.target_group_resolution_status !==
          EXACT_GROUP_RESOLUTION_STATUS ||
        allocation.candidate_target_group_count !== "1"
      ) {
        groupReferenceErrorCount += 1;
      }
      return;
    }

    if (
      allocation.target_resolution_level ===
      PUBLIC_IDENTITY_RESOLUTION_LEVEL
    ) {
      publicIdentityCount += 1;
      if (
        allocation.target_budget_program_group_id !== "" ||
        allocation.target_group_resolution_status !==
          PUBLIC_GROUP_RESOLUTION_STATUS ||
        allocation.target_match_status !== "matched" ||
        allocation.target_match_method !==
          PUBLIC_IDENTITY_MATCH_METHOD ||
        allocation.review_note !== PUBLIC_IDENTITY_REVIEW_NOTE ||
        identity.member_group_count < 2 ||
        Number(allocation.candidate_target_group_count) !==
          identity.member_group_count
      ) {
        publicIdentityErrorCount += 1;
      }
      return;
    }
    identityReferenceErrorCount += 1;
  });

  const ambiguityByAllocationId = new Map(
    result.groupAmbiguities.map((ambiguity) => [
      ambiguity.allocation_link_id,
      ambiguity,
    ]),
  );
  for (const allocation of result.allocations.filter(
    (row) =>
      row.target_resolution_level ===
      PUBLIC_IDENTITY_RESOLUTION_LEVEL,
  )) {
    const ambiguity = ambiguityByAllocationId.get(
      allocation.allocation_link_id,
    );
    if (
      !ambiguity ||
      ambiguity.target_budget_program_identity_id !==
        allocation.target_budget_program_identity_id ||
      ambiguity.resolution_reason !== GROUP_AMBIGUITY_REASON
    ) {
      publicIdentityErrorCount += 1;
    }
  }
  if (
    ambiguityByAllocationId.size !== result.groupAmbiguities.length ||
    result.groupAmbiguities.length !== publicIdentityCount
  ) {
    publicIdentityErrorCount += 1;
  }

  const structuralPass =
    inputAllocations.length === result.allocations.length &&
    uniqueAllocationIds.size === result.allocations.length &&
    groupReferenceErrorCount === 0 &&
    publicIdentityErrorCount === 0 &&
    immutableValueDifferenceCount === 0 &&
    nonBlankAllocationAmountCount === 0 &&
    amountAttributionStatusErrorCount === 0;
  const isPass =
    structuralPass &&
    identityMatchedCount === result.allocations.length &&
    ambiguousCount === 0 &&
    unmatchedCount === 0 &&
    result.unresolvedOverrides.length === 0 &&
    identityReferenceErrorCount === 0;

  return {
    inputAllocationCount: inputAllocations.length,
    outputAllocationCount: result.allocations.length,
    uniqueAllocationLinkIdCount: uniqueAllocationIds.size,
    identityMatchedCount,
    exactGroupCount,
    publicIdentityCount,
    ambiguousCount,
    unmatchedCount,
    groupAmbiguityCount: result.groupAmbiguities.length,
    overrideCount: result.unresolvedOverrides.length,
    identityReferenceErrorCount,
    groupReferenceErrorCount,
    publicIdentityErrorCount,
    immutableValueDifferenceCount,
    nonBlankAllocationAmountCount,
    amountAttributionStatusErrorCount,
    structuralPass,
    isPass,
  };
}

function serializeRows(
  rows: Array<Record<string, string>>,
  columns: readonly string[],
): string {
  return stringify(rows, {
    columns: [...columns],
    header: true,
    record_delimiter: "unix",
  });
}

export function serializeIdentityResolvedBudgetRevenueAllocations(
  allocations: IdentityResolvedBudgetRevenueAllocation[],
): string {
  return serializeRows(
    allocations,
    IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS,
  );
}

export function serializeRevenueAllocationGroupAmbiguities(
  ambiguities: RevenueAllocationGroupAmbiguity[],
): string {
  return serializeRows(
    ambiguities,
    REVENUE_ALLOCATION_GROUP_AMBIGUITY_COLUMNS,
  );
}

function validateSerializedRows(
  csvText: string,
  expectedColumns: readonly string[],
  expectedRows: Array<Record<string, string>>,
  sourceName: string,
  allowHeaderOnly = false,
): void {
  const rows = parseCsvRows(
    csvText,
    expectedColumns,
    sourceName,
    allowHeaderOnly,
  );
  if (rows.length !== expectedRows.length) {
    throw new Error(
      `${sourceName}の再読込行数が一致しません: ` +
        `${rows.length} != ${expectedRows.length}`,
    );
  }
  for (let rowIndex = 0; rowIndex < expectedRows.length; rowIndex += 1) {
    for (const column of expectedColumns) {
      if (rows[rowIndex][column] !== expectedRows[rowIndex][column]) {
        throw new Error(
          `${sourceName}の再読込比較に失敗しました: ` +
            `row=${rowIndex + 1}, column=${column}`,
        );
      }
    }
  }
}

export function validateSerializedIdentityResolvedAllocations(
  csvText: string,
  allocations: IdentityResolvedBudgetRevenueAllocation[],
): void {
  validateSerializedRows(
    csvText,
    IDENTITY_RESOLVED_BUDGET_REVENUE_ALLOCATION_COLUMNS,
    allocations,
    "budget_revenue_allocations.csv",
  );
}

export function validateSerializedRevenueAllocationGroupAmbiguities(
  csvText: string,
  ambiguities: RevenueAllocationGroupAmbiguity[],
): void {
  validateSerializedRows(
    csvText,
    REVENUE_ALLOCATION_GROUP_AMBIGUITY_COLUMNS,
    ambiguities,
    "revenue_allocation_group_ambiguities.csv",
    true,
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

export function renderRevenueAllocationIdentityResolutionReport(
  identityValidation: BudgetProgramIdentityValidation,
  resolutionValidation: RevenueAllocationIdentityResolutionValidation,
  identityBuild: BudgetProgramIdentityBuildResult,
  files: RevenueAllocationIdentityReportFiles,
  hashes: RevenueAllocationIdentityReportHashes,
): string {
  const finalStatus =
    identityValidation.isPass && resolutionValidation.isPass
      ? "PASS"
      : "FAIL";
  const multipleIdentities = identityBuild.identities.filter(
    (identity) => identity.member_group_count > 1,
  );
  return [
    "# 歳入充当事業・予算事業identity解決レポート",
    "",
    `**最終判定: ${finalStatus}**`,
    "",
    "## 入出力",
    "",
    `- 予算事業group: \`${files.budgetProgramGroups}\``,
    `- Phase 29充当関係: \`${files.sourceAllocations}\``,
    `- Phase 29 target override: \`${files.sourceOverrides}\``,
    `- 歳出予算事業: \`${files.budgetPrograms}\``,
    `- 歳出節: \`${files.budgetSections}\``,
    `- 歳出目マスタ: \`${files.budgetItems}\``,
    `- 予算事業identity: \`${files.identities}\``,
    `- identity member: \`${files.identityMembers}\``,
    `- identity解決済み充当関係: \`${files.allocations}\``,
    `- 内部group曖昧性: \`${files.groupAmbiguities}\``,
    `- 真の未解決override: \`${files.overrides}\``,
    "",
    "## identity",
    "",
    "| 指標 | 件数・金額 |",
    "|---|---:|",
    `| budget_program_group | ${formatNumber(identityValidation.sourceGroupCount)} |`,
    `| budget_program_identity | ${formatNumber(identityValidation.identityCount)} |`,
    `| identity member | ${formatNumber(identityValidation.memberCount)} |`,
    `| 複数group identity | ${formatNumber(identityValidation.multipleGroupIdentityCount)} |`,
    `| identity金額合計（千円） | ${formatNumber(identityValidation.identityAmountTotalThousandYen)} |`,
    "",
    "同一性キーは、年度・会計・`budget_item_key`・正規化事業名・正規化部署名・冊子ページ一覧をすべて含みます。異なる会計、目、冊子ページをまたぐ統合は行いません。",
    "",
    "名称正規化はUnicode NFKC、空白・改行、中黒、ハイフン、全角半角括弧の表記差だけです。意味、金額、類似度による統合は行いません。",
    "",
    "## allocation解決",
    "",
    "| 指標 | 件数 |",
    "|---|---:|",
    `| allocation行 | ${formatNumber(resolutionValidation.outputAllocationCount)} |`,
    `| identityレベルmatched | ${formatNumber(resolutionValidation.identityMatchedCount)} |`,
    `| exact_group | ${formatNumber(resolutionValidation.exactGroupCount)} |`,
    `| public_identity | ${formatNumber(resolutionValidation.publicIdentityCount)} |`,
    `| ambiguous | ${formatNumber(resolutionValidation.ambiguousCount)} |`,
    `| unmatched | ${formatNumber(resolutionValidation.unmatchedCount)} |`,
    `| group ambiguity保存行 | ${formatNumber(resolutionValidation.groupAmbiguityCount)} |`,
    `| target override行 | ${formatNumber(resolutionValidation.overrideCount)} |`,
    "",
    "- `exact_group`は内部 `budget_program_group_id` まで一意に識別できる関係です。",
    "- `public_identity`は公式PDF上の事業は識別できる一方、内部groupを区別できない関係です。内部group IDは空欄のままです。",
    "- `allocation_amount_thousand_yen`は全行空欄、`amount_attribution_status`は全行`not_available`です。",
    "- 本データは関係テーブルであり、歳入額の配分や金銭フローを示しません。",
    "",
    "## 複数group identity",
    "",
    "| identity | account | budget_item_key | 表示事業名 | 部署 | ページ | group数 |",
    "|---|---|---|---|---|---|---:|",
    ...multipleIdentities.map(
      (identity) =>
        `| ${markdownCell(identity.budget_program_identity_id)} ` +
        `| ${markdownCell(identity.account_code)} ` +
        `| ${markdownCell(identity.budget_item_key)} ` +
        `| ${markdownCell(identity.display_program_name)} ` +
        `| ${markdownCell(identity.department_name)} ` +
        `| ${markdownCell(identity.candidate_budget_book_pages)} ` +
        `| ${identity.member_group_count} |`,
    ),
    "",
    "## 検証",
    "",
    `- 全groupが1 identityだけに所属: ${identityValidation.groupMembershipErrorCount === 0 ? "PASS" : "FAIL"}`,
    `- 会計・目・ページ境界: ${identityValidation.boundaryErrorCount === 0 ? "PASS" : "FAIL"}`,
    `- identity金額合計: ${identityValidation.identityAmountTotalThousandYen === 621_033_664 ? "PASS" : "FAIL"}`,
    `- 全allocationのidentity参照: ${resolutionValidation.identityReferenceErrorCount === 0 ? "PASS" : "FAIL"}`,
    `- exact group参照: ${resolutionValidation.groupReferenceErrorCount === 0 ? "PASS" : "FAIL"}`,
    `- public identity制約: ${resolutionValidation.publicIdentityErrorCount === 0 ? "PASS" : "FAIL"}`,
    `- 入力由来の不変列: ${resolutionValidation.immutableValueDifferenceCount === 0 ? "PASS" : "FAIL"}`,
    `- allocation金額空欄: ${resolutionValidation.nonBlankAllocationAmountCount === 0 ? "PASS" : "FAIL"}`,
    `- amount attribution status: ${resolutionValidation.amountAttributionStatusErrorCount === 0 ? "PASS" : "FAIL"}`,
    "",
    "## SHA-256",
    "",
    "| ファイル | SHA-256 |",
    "|---|---|",
    `| budget_program_groups.csv | \`${hashes.budgetProgramGroups}\` |`,
    `| budget_programs.csv | \`${hashes.budgetPrograms}\` |`,
    `| budget_sections.csv | \`${hashes.budgetSections}\` |`,
    `| budget_items.csv | \`${hashes.budgetItems}\` |`,
    `| budget_program_identities.csv | \`${hashes.identities}\` |`,
    `| budget_program_identity_members.csv | \`${hashes.identityMembers}\` |`,
    `| budget_revenue_allocations.csv | \`${hashes.allocations}\` |`,
    `| revenue_allocation_group_ambiguities.csv | \`${hashes.groupAmbiguities}\` |`,
    `| revenue_allocation_target_overrides.csv | \`${hashes.overrides}\` |`,
    "",
    "## 結論",
    "",
    resolutionValidation.isPass
      ? "全1,948関係を公式資料上のbudget_program_identityへ接続しました。内部groupを識別できない39関係は、group IDを空欄のまま将来精緻化用ファイルへ保存しています。"
      : "identityまで決まらない関係が残っています。override候補を公式資料で確認する必要があります。",
    "",
  ].join("\n");
}
