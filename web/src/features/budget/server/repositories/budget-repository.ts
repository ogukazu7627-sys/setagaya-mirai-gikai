import "server-only";

import {
  createAdminClient,
  type Database,
  type Json,
} from "@mirai-gikai/supabase";
import type {
  BudgetAccountCode,
  BudgetProgramSearchInput,
} from "../../shared/types/budget";

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
