import "server-only";

import {
  createAdminClient,
  type Database,
  type Json,
} from "@mirai-gikai/supabase";
import type {
  BudgetAccountCode,
  BudgetDirectorySelection,
  BudgetProgramSearchInput,
} from "../../shared/types/budget";

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type BudgetDirectoryDatasetRow = Pick<
  TableRow<"budget_datasets">,
  | "id"
  | "fiscal_year"
  | "budget_type"
  | "schema_version"
  | "currency_unit"
  | "manifest_sha256"
  | "validation_status"
  | "activated_at"
>;

export type BudgetDirectoryHierarchyRow = Pick<
  TableRow<"budget_items">,
  | "budget_item_key"
  | "account_code"
  | "account_name"
  | "kan_code"
  | "kan_name"
  | "kou_code"
  | "kou_name"
  | "moku_code"
  | "moku_name"
>;

export type BudgetDirectoryIdentityRow = Pick<
  TableRow<"budget_program_identities">,
  | "budget_program_identity_id"
  | "fiscal_year"
  | "account_code"
  | "account_name"
  | "budget_side"
  | "budget_item_key"
  | "kan_code"
  | "kan_name"
  | "kou_code"
  | "kou_name"
  | "moku_code"
  | "moku_name"
  | "display_program_name"
  | "department_display_name"
  | "amount_thousand_yen"
  | "member_group_count"
  | "member_program_count"
  | "related_revenue_count"
  | "has_public_identity_resolution"
  | "is_zero_amount"
  | "source_type"
>;

export type BudgetDirectoryMemberProgramRow = Pick<
  TableRow<"budget_programs">,
  | "program_id"
  | "budget_program_identity_id"
  | "major_program_name"
  | "budget_program_name"
  | "detail_program_name"
  | "department_display_name"
  | "amount_thousand_yen"
  | "is_zero_amount"
  | "source_type"
  | "source_file"
  | "source_row_number"
>;

export type BudgetRevenueDirectoryHierarchyRow = Pick<
  TableRow<"budget_revenue_items">,
  | "revenue_item_key"
  | "account_code"
  | "account_name"
  | "kan_code"
  | "kan_name"
  | "kou_code"
  | "kou_name"
  | "moku_code"
  | "moku_name"
>;

export type BudgetRevenueDirectoryItemRow = TableRow<"budget_revenue_items">;
export type BudgetRevenueDirectorySectionRow =
  TableRow<"budget_revenue_sections">;
export type BudgetRevenueDirectoryDetailRow =
  TableRow<"budget_revenue_details">;
export type BudgetRevenueDirectoryAllocationRow = Pick<
  TableRow<"budget_revenue_allocations">,
  | "allocation_link_id"
  | "revenue_detail_id"
  | "target_budget_program_identity_id"
  | "target_budget_item_key"
  | "target_resolution_level"
  | "relation_type"
  | "amount_attribution_status"
  | "source_reference"
>;

export type BudgetRevenueDirectoryIdentityRow = Pick<
  TableRow<"budget_program_identities">,
  | "budget_program_identity_id"
  | "budget_item_key"
  | "account_code"
  | "account_name"
  | "display_program_name"
  | "department_display_name"
  | "amount_thousand_yen"
>;

export interface BudgetProgramDirectoryRows {
  activeDataset: BudgetDirectoryDatasetRow | null;
  hierarchy: BudgetDirectoryHierarchyRow[];
  identities: BudgetDirectoryIdentityRow[];
  memberPrograms: BudgetDirectoryMemberProgramRow[];
  total: number;
}

export interface BudgetRevenueDirectoryRows {
  activeDataset: BudgetDirectoryDatasetRow | null;
  hierarchy: BudgetRevenueDirectoryHierarchyRow[];
  items: BudgetRevenueDirectoryItemRow[];
  sections: BudgetRevenueDirectorySectionRow[];
  details: BudgetRevenueDirectoryDetailRow[];
  allocations: BudgetRevenueDirectoryAllocationRow[];
  identities: BudgetRevenueDirectoryIdentityRow[];
  total: number;
}

export type BudgetProgramSearchRow =
  Database["public"]["Functions"]["search_budget_programs"]["Returns"][number];

export async function findBudgetOverview(
  fiscalYear: number | null
): Promise<Json> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_budget_overview", {
    p_fiscal_year: fiscalYear,
  });
  if (error) {
    throw new Error("Failed to fetch budget overview");
  }
  return data;
}

export async function findBudgetPrograms(
  input: Required<BudgetProgramSearchInput>
): Promise<BudgetProgramSearchRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("search_budget_programs", {
    p_query: input.query,
    p_fiscal_year: input.fiscalYear,
    p_account_code: input.accountCode,
    p_include_zero_amount: input.includeZeroAmount,
    p_page: input.page,
    p_page_size: input.pageSize,
  });
  if (error) {
    throw new Error("Failed to search budget programs");
  }
  return data ?? [];
}

export async function findBudgetProgramDetail(input: {
  budgetProgramIdentityId: string;
  fiscalYear: number | null;
}): Promise<Json | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_budget_program_detail", {
    p_budget_program_identity_id: input.budgetProgramIdentityId,
    p_fiscal_year: input.fiscalYear,
  });
  if (error) {
    throw new Error("Failed to fetch budget program detail");
  }
  return data;
}

export async function findBudgetOfficialHierarchy(input: {
  fiscalYear: number | null;
  accountCode: BudgetAccountCode | null;
}): Promise<Json> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_budget_official_hierarchy", {
    p_fiscal_year: input.fiscalYear,
    p_account_code: input.accountCode,
  });
  if (error) {
    throw new Error("Failed to fetch budget official hierarchy");
  }
  return data;
}

export async function findBudgetRevenueItem(input: {
  revenueItemKey: string;
  fiscalYear: number | null;
}): Promise<Json | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_budget_revenue_item", {
    p_revenue_item_key: input.revenueItemKey,
    p_fiscal_year: input.fiscalYear,
  });
  if (error) {
    throw new Error("Failed to fetch budget revenue item");
  }
  return data;
}

export async function findBudgetProgramDirectoryRows(
  input: BudgetDirectorySelection
): Promise<BudgetProgramDirectoryRows> {
  const supabase = createAdminClient();
  const activeDataset = await findActiveDirectoryDataset(
    supabase,
    input.fiscalYear
  );
  if (!activeDataset) {
    return {
      activeDataset: null,
      hierarchy: [],
      identities: [],
      memberPrograms: [],
      total: 0,
    };
  }

  const hierarchyPromise = supabase
    .from("budget_items")
    .select(
      "budget_item_key,account_code,account_name,kan_code,kan_name,kou_code,kou_name,moku_code,moku_name"
    )
    .eq("dataset_id", activeDataset.id)
    .order("account_code", { ascending: true })
    .order("kan_code", { ascending: true })
    .order("kou_code", { ascending: true })
    .order("moku_code", { ascending: true })
    .order("budget_item_key", { ascending: true });

  let identityQuery = supabase
    .from("budget_program_identities")
    .select(
      "budget_program_identity_id,fiscal_year,account_code,account_name,budget_side,budget_item_key,kan_code,kan_name,kou_code,kou_name,moku_code,moku_name,display_program_name,department_display_name,amount_thousand_yen,member_group_count,member_program_count,related_revenue_count,has_public_identity_resolution,is_zero_amount,source_type",
      { count: "exact" }
    )
    .eq("dataset_id", activeDataset.id);

  if (input.accountCode) {
    identityQuery = identityQuery.eq("account_code", input.accountCode);
  }
  if (input.kanCode) {
    identityQuery = identityQuery.eq("kan_code", input.kanCode);
  }
  if (input.kouCode) {
    identityQuery = identityQuery.eq("kou_code", input.kouCode);
  }
  if (input.mokuCode) {
    identityQuery = identityQuery.eq("moku_code", input.mokuCode);
  }
  if (!input.includeZeroAmount) {
    identityQuery = identityQuery.eq("is_zero_amount", false);
  }

  identityQuery =
    input.sort === "name_asc"
      ? identityQuery
          .order("display_program_name", { ascending: true })
          .order("budget_program_identity_id", { ascending: true })
      : identityQuery
          .order("amount_thousand_yen", { ascending: false })
          .order("budget_program_identity_id", { ascending: true });

  const from = (input.page - 1) * input.pageSize;
  const [hierarchyResult, identityResult] = await Promise.all([
    hierarchyPromise,
    identityQuery.range(from, from + input.pageSize - 1),
  ]);
  if (hierarchyResult.error || identityResult.error) {
    throw new Error("Failed to fetch the budget program directory");
  }

  const identities = identityResult.data ?? [];
  const identityIds = identities.map(
    (identity) => identity.budget_program_identity_id
  );
  const memberPrograms = await findDirectoryMemberPrograms(
    supabase,
    activeDataset.id,
    identityIds
  );

  return {
    activeDataset,
    hierarchy: hierarchyResult.data ?? [],
    identities,
    memberPrograms,
    total: identityResult.count ?? 0,
  };
}

export async function findBudgetRevenueDirectoryRows(
  input: BudgetDirectorySelection
): Promise<BudgetRevenueDirectoryRows> {
  const supabase = createAdminClient();
  const activeDataset = await findActiveDirectoryDataset(
    supabase,
    input.fiscalYear
  );
  if (!activeDataset) {
    return {
      activeDataset: null,
      hierarchy: [],
      items: [],
      sections: [],
      details: [],
      allocations: [],
      identities: [],
      total: 0,
    };
  }

  const hierarchyPromise = supabase
    .from("budget_revenue_items")
    .select(
      "revenue_item_key,account_code,account_name,kan_code,kan_name,kou_code,kou_name,moku_code,moku_name"
    )
    .eq("dataset_id", activeDataset.id)
    .order("account_code", { ascending: true })
    .order("kan_code", { ascending: true })
    .order("kou_code", { ascending: true })
    .order("moku_code", { ascending: true })
    .order("revenue_item_key", { ascending: true });

  let itemQuery = supabase
    .from("budget_revenue_items")
    .select("*", { count: "exact" })
    .eq("dataset_id", activeDataset.id);

  if (input.accountCode) {
    itemQuery = itemQuery.eq("account_code", input.accountCode);
  }
  if (input.kanCode) {
    itemQuery = itemQuery.eq("kan_code", input.kanCode);
  }
  if (input.kouCode) {
    itemQuery = itemQuery.eq("kou_code", input.kouCode);
  }
  if (input.mokuCode) {
    itemQuery = itemQuery.eq("moku_code", input.mokuCode);
  }
  if (!input.includeZeroAmount) {
    itemQuery = itemQuery.eq("is_zero_amount", false);
  }

  itemQuery =
    input.sort === "name_asc"
      ? itemQuery
          .order("moku_name", { ascending: true })
          .order("revenue_item_key", { ascending: true })
      : itemQuery
          .order("current_amount_thousand_yen", { ascending: false })
          .order("revenue_item_key", { ascending: true });

  const from = (input.page - 1) * input.pageSize;
  const [hierarchyResult, itemResult] = await Promise.all([
    hierarchyPromise,
    itemQuery.range(from, from + input.pageSize - 1),
  ]);
  if (hierarchyResult.error || itemResult.error) {
    throw new Error("Failed to fetch the budget revenue directory");
  }

  const items = itemResult.data ?? [];
  const itemKeys = items.map((item) => item.revenue_item_key);
  if (itemKeys.length === 0) {
    return {
      activeDataset,
      hierarchy: hierarchyResult.data ?? [],
      items,
      sections: [],
      details: [],
      allocations: [],
      identities: [],
      total: itemResult.count ?? 0,
    };
  }

  const [sections, details] = await Promise.all([
    findDirectoryRevenueSections(supabase, activeDataset.id, itemKeys),
    findDirectoryRevenueDetails(supabase, activeDataset.id, itemKeys),
  ]);
  const allocations = await findDirectoryRevenueAllocations(
    supabase,
    activeDataset.id,
    details.map((detail) => detail.revenue_detail_id)
  );
  const identities = await findDirectoryRevenueIdentities(
    supabase,
    activeDataset.id,
    allocations.map(
      (allocation) => allocation.target_budget_program_identity_id
    )
  );

  return {
    activeDataset,
    hierarchy: hierarchyResult.data ?? [],
    items,
    sections,
    details,
    allocations,
    identities,
    total: itemResult.count ?? 0,
  };
}

async function findActiveDirectoryDataset(
  supabase: ReturnType<typeof createAdminClient>,
  fiscalYear: number
): Promise<BudgetDirectoryDatasetRow | null> {
  const { data, error } = await supabase
    .from("budget_datasets")
    .select(
      "id,fiscal_year,budget_type,schema_version,currency_unit,manifest_sha256,validation_status,activated_at"
    )
    .eq("fiscal_year", fiscalYear)
    .eq("budget_type", "initial_budget")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error("Failed to fetch the active budget dataset");
  }
  return data ?? null;
}

async function findDirectoryMemberPrograms(
  supabase: ReturnType<typeof createAdminClient>,
  datasetId: string,
  identityIds: string[]
): Promise<BudgetDirectoryMemberProgramRow[]> {
  if (identityIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("budget_programs")
    .select(
      "program_id,budget_program_identity_id,major_program_name,budget_program_name,detail_program_name,department_display_name,amount_thousand_yen,is_zero_amount,source_type,source_file,source_row_number"
    )
    .eq("dataset_id", datasetId)
    .in("budget_program_identity_id", identityIds)
    .order("budget_program_identity_id", { ascending: true })
    .order("program_id", { ascending: true });
  if (error) {
    throw new Error("Failed to fetch budget member programs");
  }
  return data ?? [];
}

async function findDirectoryRevenueSections(
  supabase: ReturnType<typeof createAdminClient>,
  datasetId: string,
  itemKeys: string[]
): Promise<BudgetRevenueDirectorySectionRow[]> {
  const { data, error } = await supabase
    .from("budget_revenue_sections")
    .select("*")
    .eq("dataset_id", datasetId)
    .in("revenue_item_key", itemKeys)
    .order("revenue_item_key", { ascending: true })
    .order("setsu_code", { ascending: true })
    .order("revenue_section_id", { ascending: true });
  if (error) {
    throw new Error("Failed to fetch budget revenue sections");
  }
  return data ?? [];
}

async function findDirectoryRevenueDetails(
  supabase: ReturnType<typeof createAdminClient>,
  datasetId: string,
  itemKeys: string[]
): Promise<BudgetRevenueDirectoryDetailRow[]> {
  const rows: BudgetRevenueDirectoryDetailRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("budget_revenue_details")
      .select("*")
      .eq("dataset_id", datasetId)
      .in("revenue_item_key", itemKeys)
      .order("revenue_item_key", { ascending: true })
      .order("setsu_code", { ascending: true })
      .order("saisetsu_code", { ascending: true })
      .order("revenue_detail_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      throw new Error("Failed to fetch budget revenue details");
    }
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) {
      return rows;
    }
  }
}

async function findDirectoryRevenueAllocations(
  supabase: ReturnType<typeof createAdminClient>,
  datasetId: string,
  detailIds: string[]
): Promise<BudgetRevenueDirectoryAllocationRow[]> {
  const rows: BudgetRevenueDirectoryAllocationRow[] = [];
  for (const idChunk of chunkValues(detailIds, 100)) {
    const { data, error } = await supabase
      .from("budget_revenue_allocations")
      .select(
        "allocation_link_id,revenue_detail_id,target_budget_program_identity_id,target_budget_item_key,target_resolution_level,relation_type,amount_attribution_status,source_reference"
      )
      .eq("dataset_id", datasetId)
      .in("revenue_detail_id", idChunk)
      .order("allocation_link_id", { ascending: true });
    if (error) {
      throw new Error("Failed to fetch budget revenue allocations");
    }
    rows.push(...(data ?? []));
  }
  return rows;
}

async function findDirectoryRevenueIdentities(
  supabase: ReturnType<typeof createAdminClient>,
  datasetId: string,
  identityIds: string[]
): Promise<BudgetRevenueDirectoryIdentityRow[]> {
  const rows: BudgetRevenueDirectoryIdentityRow[] = [];
  const uniqueIds = [...new Set(identityIds)];
  for (const idChunk of chunkValues(uniqueIds, 100)) {
    const { data, error } = await supabase
      .from("budget_program_identities")
      .select(
        "budget_program_identity_id,budget_item_key,account_code,account_name,display_program_name,department_display_name,amount_thousand_yen"
      )
      .eq("dataset_id", datasetId)
      .in("budget_program_identity_id", idChunk)
      .order("budget_program_identity_id", { ascending: true });
    if (error) {
      throw new Error("Failed to fetch related budget program identities");
    }
    rows.push(...(data ?? []));
  }
  return rows;
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
