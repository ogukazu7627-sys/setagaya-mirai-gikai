import "server-only";

import type { Json } from "@mirai-gikai/supabase";
import {
  BUDGET_ACCOUNT_CODES,
  BUDGET_PROGRAM_DIRECTORY_PAGE_SIZE,
  BUDGET_PUBLIC_FISCAL_YEAR,
  BUDGET_REVENUE_DIRECTORY_PAGE_SIZE,
} from "../../shared/constants/budget";
import type {
  ActiveBudgetDataset,
  BudgetAccountCode,
  BudgetDirectoryHierarchyEntry,
  BudgetDirectoryInput,
  BudgetDirectorySelection,
  BudgetProgramDirectory,
  BudgetProgramIdentity,
  BudgetProgramMember,
  BudgetRelatedExpenditureProgram,
  BudgetRevenueDetail,
  BudgetRevenueDirectory,
  BudgetRevenueDirectoryItem,
  BudgetRevenueItem,
  BudgetRevenueSection,
} from "../../shared/types/budget";
import { createBudgetDirectorySelection } from "../../shared/utils/budget-directory";
import {
  type BudgetDirectoryDatasetRow,
  type BudgetDirectoryHierarchyRow,
  type BudgetDirectoryIdentityRow,
  type BudgetDirectoryMemberProgramRow,
  type BudgetProgramDirectoryRows,
  type BudgetRevenueDirectoryAllocationRow,
  type BudgetRevenueDirectoryDetailRow,
  type BudgetRevenueDirectoryHierarchyRow,
  type BudgetRevenueDirectoryIdentityRow,
  type BudgetRevenueDirectoryItemRow,
  type BudgetRevenueDirectoryRows,
  type BudgetRevenueDirectorySectionRow,
  findBudgetProgramDirectoryRows,
  findBudgetRevenueDirectoryRows,
} from "../repositories/budget-repository";

const accountCodes = new Set<string>(BUDGET_ACCOUNT_CODES);
const validationStatuses = new Set(["ok", "ok_zero_amount"]);
const fundingNatures = new Set(["general", "specific", "special_account"]);
const targetResolutionLevels = new Set(["exact_group", "public_identity"]);

export async function getBudgetProgramDirectory(
  input: BudgetDirectoryInput = {}
): Promise<BudgetProgramDirectory> {
  const selection = createBudgetDirectorySelection(input, {
    fiscalYear: BUDGET_PUBLIC_FISCAL_YEAR,
    pageSize: BUDGET_PROGRAM_DIRECTORY_PAGE_SIZE,
  });
  return buildBudgetProgramDirectory(
    await findBudgetProgramDirectoryRows(selection),
    selection
  );
}

export async function getBudgetRevenueDirectory(
  input: BudgetDirectoryInput = {}
): Promise<BudgetRevenueDirectory> {
  const selection = createBudgetDirectorySelection(input, {
    fiscalYear: BUDGET_PUBLIC_FISCAL_YEAR,
    pageSize: BUDGET_REVENUE_DIRECTORY_PAGE_SIZE,
  });
  return buildBudgetRevenueDirectory(
    await findBudgetRevenueDirectoryRows(selection),
    selection
  );
}

export function buildBudgetProgramDirectory(
  rows: BudgetProgramDirectoryRows,
  selection: BudgetDirectorySelection
): BudgetProgramDirectory {
  if (!rows.activeDataset) {
    return emptyProgramDirectory(selection, "empty");
  }

  const memberProgramsByIdentityId = groupBy(
    rows.memberPrograms,
    (program) => program.budget_program_identity_id
  );
  return {
    status: "ready",
    activeDataset: mapActiveDataset(rows.activeDataset),
    hierarchy: rows.hierarchy.map(mapExpenditureHierarchy),
    items: rows.identities.map((identity) => ({
      identity: mapIdentity(identity),
      memberPrograms: (
        memberProgramsByIdentityId.get(identity.budget_program_identity_id) ??
        []
      ).map(mapMemberProgram),
    })),
    total: safeInteger(rows.total),
    selection,
  };
}

export function buildBudgetRevenueDirectory(
  rows: BudgetRevenueDirectoryRows,
  selection: BudgetDirectorySelection
): BudgetRevenueDirectory {
  if (!rows.activeDataset) {
    return emptyRevenueDirectory(selection, "empty");
  }

  const sectionsByItemKey = groupBy(
    rows.sections,
    (section) => section.revenue_item_key
  );
  const detailsByItemKey = groupBy(
    rows.details,
    (detail) => detail.revenue_item_key
  );
  const allocationsByDetailId = groupBy(
    rows.allocations,
    (allocation) => allocation.revenue_detail_id
  );
  const identityById = new Map(
    rows.identities.map((identity) => [
      identity.budget_program_identity_id,
      identity,
    ])
  );

  return {
    status: "ready",
    activeDataset: mapActiveDataset(rows.activeDataset),
    hierarchy: rows.hierarchy.map(mapRevenueHierarchy),
    items: rows.items.map((item) => {
      const details = detailsByItemKey.get(item.revenue_item_key) ?? [];
      return {
        item: mapRevenueItem(item),
        sections: (sectionsByItemKey.get(item.revenue_item_key) ?? []).map(
          mapRevenueSection
        ),
        details: details.map(mapRevenueDetail),
        relatedExpenditurePrograms: buildRelatedPrograms(
          details,
          allocationsByDetailId,
          identityById
        ),
      } satisfies BudgetRevenueDirectoryItem;
    }),
    total: safeInteger(rows.total),
    selection,
  };
}

export function buildUnavailableBudgetProgramDirectory(
  selection: BudgetDirectorySelection
): BudgetProgramDirectory {
  return emptyProgramDirectory(selection, "error");
}

export function buildUnavailableBudgetRevenueDirectory(
  selection: BudgetDirectorySelection
): BudgetRevenueDirectory {
  return emptyRevenueDirectory(selection, "error");
}

function emptyProgramDirectory(
  selection: BudgetDirectorySelection,
  status: "empty" | "error"
): BudgetProgramDirectory {
  return {
    status,
    activeDataset: null,
    hierarchy: [],
    items: [],
    total: 0,
    selection,
  };
}

function emptyRevenueDirectory(
  selection: BudgetDirectorySelection,
  status: "empty" | "error"
): BudgetRevenueDirectory {
  return {
    status,
    activeDataset: null,
    hierarchy: [],
    items: [],
    total: 0,
    selection,
  };
}

function mapActiveDataset(row: BudgetDirectoryDatasetRow): ActiveBudgetDataset {
  return {
    id: row.id,
    fiscalYear: row.fiscal_year,
    budgetType: row.budget_type,
    schemaVersion: row.schema_version,
    currencyUnit: row.currency_unit,
    manifestSha256: row.manifest_sha256,
    validationStatus: row.validation_status,
    activatedAt: row.activated_at,
  };
}

function mapExpenditureHierarchy(
  row: BudgetDirectoryHierarchyRow
): BudgetDirectoryHierarchyEntry {
  return mapHierarchy(row, row.budget_item_key);
}

function mapRevenueHierarchy(
  row: BudgetRevenueDirectoryHierarchyRow
): BudgetDirectoryHierarchyEntry {
  return mapHierarchy(row, row.revenue_item_key);
}

function mapHierarchy(
  row: Pick<
    BudgetDirectoryHierarchyRow,
    | "account_code"
    | "account_name"
    | "kan_code"
    | "kan_name"
    | "kou_code"
    | "kou_name"
    | "moku_code"
    | "moku_name"
  >,
  itemKey: string
): BudgetDirectoryHierarchyEntry {
  return {
    accountCode: accountCode(row.account_code),
    accountName: row.account_name,
    kan: { code: row.kan_code, name: row.kan_name },
    kou: { code: row.kou_code, name: row.kou_name },
    moku: { code: row.moku_code, name: row.moku_name },
    itemKey,
  };
}

function mapIdentity(row: BudgetDirectoryIdentityRow): BudgetProgramIdentity {
  if (row.budget_side !== "expenditure") {
    throw new Error("Budget directory returned an invalid budget side");
  }
  return {
    budgetProgramIdentityId: row.budget_program_identity_id,
    fiscalYear: row.fiscal_year,
    accountCode: accountCode(row.account_code),
    accountName: row.account_name,
    budgetSide: "expenditure",
    budgetItemKey: row.budget_item_key,
    kan: { code: row.kan_code, name: row.kan_name },
    kou: { code: row.kou_code, name: row.kou_name },
    moku: { code: row.moku_code, name: row.moku_name },
    displayProgramName: row.display_program_name,
    departmentDisplayName: row.department_display_name,
    amountThousandYen: safeInteger(row.amount_thousand_yen),
    memberGroupCount: safeInteger(row.member_group_count),
    memberProgramCount: safeInteger(row.member_program_count),
    relatedRevenueCount: safeInteger(row.related_revenue_count),
    hasPublicIdentityResolution: row.has_public_identity_resolution,
    isZeroAmount: row.is_zero_amount,
    sourceType: row.source_type,
  };
}

function mapMemberProgram(
  row: BudgetDirectoryMemberProgramRow
): BudgetProgramMember {
  return {
    programId: row.program_id,
    majorProgramName: row.major_program_name,
    budgetProgramName: row.budget_program_name,
    detailProgramName: row.detail_program_name,
    departmentDisplayName: row.department_display_name,
    amountThousandYen: safeInteger(row.amount_thousand_yen),
    isZeroAmount: row.is_zero_amount,
    sourceReference: {
      source_type: row.source_type,
      source_file: row.source_file,
      source_row_number: row.source_row_number,
    },
  };
}

function mapRevenueItem(row: BudgetRevenueDirectoryItemRow): BudgetRevenueItem {
  if (row.budget_side !== "revenue") {
    throw new Error("Revenue directory returned an invalid budget side");
  }
  return {
    revenueItemKey: row.revenue_item_key,
    fiscalYear: row.fiscal_year,
    accountCode: accountCode(row.account_code),
    accountName: row.account_name,
    budgetSide: "revenue",
    kan: { code: row.kan_code, name: row.kan_name },
    kou: { code: row.kou_code, name: row.kou_name },
    moku: { code: row.moku_code, name: row.moku_name },
    previousAmountThousandYen: safeInteger(row.previous_amount_thousand_yen),
    currentAmountThousandYen: safeInteger(row.current_amount_thousand_yen),
    diffAmountThousandYen: safeInteger(row.diff_amount_thousand_yen),
    generalRevenueThousandYen: safeInteger(row.general_revenue_thousand_yen),
    specificRevenueThousandYen: safeInteger(row.specific_revenue_thousand_yen),
    specialAccountRevenueThousandYen: safeInteger(
      row.special_account_revenue_thousand_yen
    ),
    validationStatus: validationStatus(row.validation_status),
    isZeroAmount: row.is_zero_amount,
    revenueSourceDisplay: row.revenue_source_display,
    dataAvailability: row.data_availability,
    sourceReferences: jsonArray(row.source_references),
  };
}

function mapRevenueSection(
  row: BudgetRevenueDirectorySectionRow
): BudgetRevenueSection {
  return {
    revenueSectionId: row.revenue_section_id,
    setsu: { code: row.setsu_code, name: row.setsu_name },
    previousAmountThousandYen: safeInteger(row.previous_amount_thousand_yen),
    currentAmountThousandYen: safeInteger(row.current_amount_thousand_yen),
    diffAmountThousandYen: safeInteger(row.diff_amount_thousand_yen),
    detailCount: safeInteger(row.detail_count),
    validationStatus: validationStatus(row.validation_status),
    sourceReference: row.source_reference,
  };
}

function mapRevenueDetail(
  row: BudgetRevenueDirectoryDetailRow
): BudgetRevenueDetail {
  return {
    revenueDetailId: row.revenue_detail_id,
    revenueSectionId: row.revenue_section_id,
    setsu: { code: row.setsu_code, name: row.setsu_name },
    saisetsu: { code: row.saisetsu_code, name: row.saisetsu_name },
    departmentDisplayName: row.department_display_name,
    sourceFundingCategoryName: row.source_funding_category_name,
    fundingNature: fundingNature(row.funding_nature),
    previousAmountThousandYen: safeInteger(row.previous_amount_thousand_yen),
    currentAmountThousandYen: safeInteger(row.current_amount_thousand_yen),
    diffAmountThousandYen: safeInteger(row.diff_amount_thousand_yen),
    isZeroAmount: row.is_zero_amount,
    relatedProgramCount: safeInteger(row.related_program_count),
    sourceReference: {
      source_type: row.source_type,
      source_file: row.source_file,
      source_row_number: row.source_row_number,
    },
  };
}

function buildRelatedPrograms(
  details: BudgetRevenueDirectoryDetailRow[],
  allocationsByDetailId: Map<string, BudgetRevenueDirectoryAllocationRow[]>,
  identityById: Map<string, BudgetRevenueDirectoryIdentityRow>
): BudgetRelatedExpenditureProgram[] {
  const grouped = new Map<
    string,
    {
      identity: BudgetRevenueDirectoryIdentityRow;
      relationCount: number;
      revenueDetailIds: Set<string>;
      resolutionLevels: Set<"exact_group" | "public_identity">;
      sourceReferences: Map<string, Json>;
    }
  >();

  for (const detail of details) {
    for (const allocation of allocationsByDetailId.get(
      detail.revenue_detail_id
    ) ?? []) {
      const identity = identityById.get(
        allocation.target_budget_program_identity_id
      );
      if (
        !identity ||
        allocation.relation_type !== "allocated_to_program" ||
        allocation.amount_attribution_status !== "not_available"
      ) {
        throw new Error("Revenue directory returned an invalid allocation");
      }
      const resolutionLevel = targetResolutionLevel(
        allocation.target_resolution_level
      );
      const current = grouped.get(identity.budget_program_identity_id) ?? {
        identity,
        relationCount: 0,
        revenueDetailIds: new Set<string>(),
        resolutionLevels: new Set<"exact_group" | "public_identity">(),
        sourceReferences: new Map<string, Json>(),
      };
      current.relationCount += 1;
      current.revenueDetailIds.add(detail.revenue_detail_id);
      current.resolutionLevels.add(resolutionLevel);
      current.sourceReferences.set(
        JSON.stringify(allocation.source_reference),
        allocation.source_reference
      );
      grouped.set(identity.budget_program_identity_id, current);
    }
  }

  return [...grouped.values()]
    .map(({ identity, ...relation }) => ({
      budgetProgramIdentityId: identity.budget_program_identity_id,
      budgetItemKey: identity.budget_item_key,
      accountCode: accountCode(identity.account_code),
      accountName: identity.account_name,
      displayProgramName: identity.display_program_name,
      departmentDisplayName: identity.department_display_name,
      amountThousandYen: safeInteger(identity.amount_thousand_yen),
      relationCount: relation.relationCount,
      revenueDetailIds: [...relation.revenueDetailIds].sort(),
      targetResolutionLevels: [...relation.resolutionLevels].sort(),
      sourceReferences: [...relation.sourceReferences.values()],
    }))
    .sort(
      (left, right) =>
        left.displayProgramName.localeCompare(right.displayProgramName, "ja") ||
        left.budgetProgramIdentityId.localeCompare(
          right.budgetProgramIdentityId
        )
    );
}

function accountCode(value: string): BudgetAccountCode {
  if (!accountCodes.has(value)) {
    throw new Error("Budget directory returned an invalid account code");
  }
  return value as BudgetAccountCode;
}

function validationStatus(value: string): "ok" | "ok_zero_amount" {
  if (!validationStatuses.has(value)) {
    throw new Error("Budget directory returned an invalid validation status");
  }
  return value as "ok" | "ok_zero_amount";
}

function fundingNature(
  value: string
): "general" | "specific" | "special_account" {
  if (!fundingNatures.has(value)) {
    throw new Error("Budget directory returned an invalid funding nature");
  }
  return value as "general" | "specific" | "special_account";
}

function targetResolutionLevel(
  value: string
): "exact_group" | "public_identity" {
  if (!targetResolutionLevels.has(value)) {
    throw new Error("Budget directory returned an invalid resolution level");
  }
  return value as "exact_group" | "public_identity";
}

function safeInteger(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error("Budget directory returned an unsafe integer");
  }
  return value;
}

function jsonArray(value: Json): Json[] {
  return Array.isArray(value) ? value : [];
}

function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}
