import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { z } from "zod";
import type {
  BillItemType,
  BillPublishStatus,
} from "@/features/bills/shared/types";
import { getSetagayaMockBills, isSetagayaMockMode } from "@/lib/setagaya-mock";
import { requireAdmin } from "./auth";
import { mockBillToAdminListItem } from "./bill-admin-mock";
import {
  ADMIN_BILLS_PER_PAGE,
  type AdminBillListItem,
  type AdminBillSearchFilters,
  type AdminBillSort,
  type AdminBillSortDirection,
  type AdminBillSortKey,
  type AdminSupabaseClient,
  BILL_ITEM_TYPE_OPTIONS,
  BILL_STATUS_LABEL_OPTIONS,
} from "./bill-admin-shared";
import { isMajorCategoryLabel, toDateInputValue } from "./bill-admin-utils";

interface ListAdminBillsOptions {
  page?: number;
  perPage?: number;
  filters?: AdminBillSearchFilters;
  sort?: AdminBillSort;
}

export interface AdminBillListPage {
  bills: AdminBillListItem[];
  totalCount: number;
  page: number;
  perPage: number;
}

type AdminBillSearchParamInput = {
  q?: string;
  publish_status?: string;
  item_type?: string;
  major_category?: string;
  status_label?: string;
  date_from?: string;
  date_to?: string;
};

type AdminBillSortParamInput = {
  sort_by?: string;
  sort_order?: string;
};

const publishStatusFilterValues = new Set(["draft", "published"]);
const itemTypeFilterValues = new Set<string>(
  BILL_ITEM_TYPE_OPTIONS.map((option) => option.value)
);
const statusLabelFilterValues = new Set<string>(BILL_STATUS_LABEL_OPTIONS);
const adminBillDateFilterPattern = /^\d{4}-\d{2}-\d{2}$/;
const adminBillSortKeys = new Set<AdminBillSortKey>([
  "item_type",
  "major_category",
  "publish_status",
  "updated_at",
]);
const adminBillSortDirections = new Set<AdminBillSortDirection>([
  "asc",
  "desc",
]);
const adminBillSortCollator = new Intl.Collator("ja-JP", {
  numeric: true,
  sensitivity: "base",
});

function normalizeShortSearchText(value: string | undefined) {
  return (value ?? "").trim().slice(0, 200);
}

function normalizeDateFilter(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return adminBillDateFilterPattern.test(trimmed) ? trimmed : "";
}

export function normalizeAdminBillSearchFilters(
  input: AdminBillSearchParamInput = {}
): AdminBillSearchFilters {
  const inputMajorCategory = input.major_category ?? null;
  const publishStatus = publishStatusFilterValues.has(
    input.publish_status ?? ""
  )
    ? (input.publish_status as BillPublishStatus)
    : "";
  const itemType = itemTypeFilterValues.has(input.item_type ?? "")
    ? (input.item_type as BillItemType)
    : "";
  const majorCategory = isMajorCategoryLabel(inputMajorCategory)
    ? inputMajorCategory
    : "";
  const statusLabel = statusLabelFilterValues.has(input.status_label ?? "")
    ? (input.status_label ?? "")
    : "";

  return {
    query: normalizeShortSearchText(input.q),
    publishStatus,
    itemType,
    majorCategory,
    statusLabel,
    submittedDateFrom: normalizeDateFilter(input.date_from),
    submittedDateTo: normalizeDateFilter(input.date_to),
  };
}

export function normalizeAdminBillSort(
  input: AdminBillSortParamInput = {}
): AdminBillSort {
  const key = adminBillSortKeys.has(input.sort_by as AdminBillSortKey)
    ? (input.sort_by as AdminBillSortKey)
    : "updated_at";
  const direction = adminBillSortDirections.has(
    input.sort_order as AdminBillSortDirection
  )
    ? (input.sort_order as AdminBillSortDirection)
    : "desc";

  return { key, direction };
}

function adminBillMatchesSearchFilters(
  bill: AdminBillListItem,
  filters: AdminBillSearchFilters
) {
  if (filters.publishStatus && bill.publish_status !== filters.publishStatus) {
    return false;
  }
  if (filters.itemType && bill.item_type !== filters.itemType) {
    return false;
  }
  if (filters.majorCategory && bill.major_category !== filters.majorCategory) {
    return false;
  }
  if (filters.statusLabel && bill.status_label !== filters.statusLabel) {
    return false;
  }

  const submittedDate = toDateInputValue(bill.submitted_date);
  if (filters.submittedDateFrom && submittedDate < filters.submittedDateFrom) {
    return false;
  }
  if (filters.submittedDateTo && submittedDate > filters.submittedDateTo) {
    return false;
  }

  if (!filters.query) {
    return true;
  }

  const keyword = filters.query.toLocaleLowerCase("ja-JP");
  const searchableValues = [
    bill.id,
    bill.name,
    bill.major_category,
    bill.status,
    bill.status_label,
    bill.status_note,
    bill.knowledge_source,
    ...(bill.bill_contents ?? []).flatMap((content) => [
      content.title,
      content.summary,
    ]),
    ...(bill.bills_tags ?? []).map((tag) => tag.tags?.label),
  ];

  return searchableValues.some((value) =>
    (value ?? "").toLocaleLowerCase("ja-JP").includes(keyword)
  );
}

async function collectAdminBillIdsByKeyword(
  supabase: AdminSupabaseClient,
  keyword: string
) {
  if (!keyword) {
    return null;
  }

  const billIds = new Set<string>();
  if (z.string().uuid().safeParse(keyword).success) {
    billIds.add(keyword);
  }

  const pattern = `%${keyword}%`;
  const billColumns = [
    "name",
    "major_category",
    "status_label",
    "status_note",
    "knowledge_source",
  ];
  const contentColumns = ["title", "summary", "content"];

  const billColumnResults = await Promise.all(
    billColumns.map((column) =>
      supabase.from("bills").select("id").ilike(column, pattern).limit(1000)
    )
  );
  for (const result of billColumnResults) {
    if (result.error) {
      throw new Error(`Failed to search admin bills: ${result.error.message}`);
    }
    for (const row of result.data ?? []) {
      billIds.add(row.id);
    }
  }

  const contentColumnResults = await Promise.all(
    contentColumns.map((column) =>
      supabase
        .from("bill_contents")
        .select("bill_id")
        .ilike(column, pattern)
        .limit(1000)
    )
  );
  for (const result of contentColumnResults) {
    if (result.error) {
      throw new Error(
        `Failed to search admin bill contents: ${result.error.message}`
      );
    }
    for (const row of result.data ?? []) {
      billIds.add(row.bill_id);
    }
  }

  const tagResult = await supabase
    .from("tags")
    .select("id")
    .ilike("label", pattern)
    .limit(1000);
  if (tagResult.error) {
    throw new Error(`Failed to search admin tags: ${tagResult.error.message}`);
  }
  const tagIds = (tagResult.data ?? []).map((tag) => tag.id);
  if (tagIds.length > 0) {
    const billTagResult = await supabase
      .from("bills_tags")
      .select("bill_id")
      .in("tag_id", tagIds)
      .limit(1000);
    if (billTagResult.error) {
      throw new Error(
        `Failed to search admin bill tags: ${billTagResult.error.message}`
      );
    }
    for (const row of billTagResult.data ?? []) {
      billIds.add(row.bill_id);
    }
  }

  return Array.from(billIds);
}

function getAdminBillSortValue(bill: AdminBillListItem, key: AdminBillSortKey) {
  switch (key) {
    case "item_type":
      return bill.item_type;
    case "major_category":
      return bill.major_category ?? "";
    case "publish_status":
      return bill.publish_status;
    case "updated_at":
      return bill.updated_at ?? "";
  }
}

function sortAdminBillListItems(
  bills: AdminBillListItem[],
  sort: AdminBillSort
) {
  return [...bills].sort((a, b) => {
    const aValue = getAdminBillSortValue(a, sort.key);
    const bValue = getAdminBillSortValue(b, sort.key);
    const compared = adminBillSortCollator.compare(aValue, bValue);
    if (compared !== 0) {
      return sort.direction === "asc" ? compared : -compared;
    }

    return adminBillSortCollator.compare(
      b.updated_at ?? "",
      a.updated_at ?? ""
    );
  });
}

export async function listAdminBills({
  page = 1,
  perPage = ADMIN_BILLS_PER_PAGE,
  filters = normalizeAdminBillSearchFilters(),
  sort = normalizeAdminBillSort(),
}: ListAdminBillsOptions = {}): Promise<AdminBillListPage> {
  await requireAdmin("/admin/bills");
  const safePage = Math.max(1, Math.floor(page));
  const safePerPage = Math.max(1, Math.floor(perPage));

  if (isSetagayaMockMode) {
    const allBills = getSetagayaMockBills()
      .map(mockBillToAdminListItem)
      .filter((bill) => adminBillMatchesSearchFilters(bill, filters));
    const sortedBills = sortAdminBillListItems(allBills, sort);
    const from = (safePage - 1) * safePerPage;
    return {
      bills: sortedBills.slice(from, from + safePerPage),
      totalCount: sortedBills.length,
      page: safePage,
      perPage: safePerPage,
    };
  }

  const supabase = createAdminClient();
  const keywordBillIds = await collectAdminBillIdsByKeyword(
    supabase,
    filters.query
  );
  if (filters.query && keywordBillIds?.length === 0) {
    return {
      bills: [],
      totalCount: 0,
      page: safePage,
      perPage: safePerPage,
    };
  }

  const from = (safePage - 1) * safePerPage;
  const to = from + safePerPage - 1;
  let query = supabase.from("bills").select(
    `
      *,
      bill_contents(title, summary, difficulty_level),
      bills_tags(tags(id, label, major_category))
    `,
    { count: "exact" }
  );

  if (keywordBillIds) {
    query = query.in("id", keywordBillIds);
  }
  if (filters.publishStatus) {
    query = query.eq("publish_status", filters.publishStatus);
  }
  if (filters.itemType) {
    query = query.eq("item_type", filters.itemType);
  }
  if (filters.majorCategory) {
    query = query.eq("major_category", filters.majorCategory);
  }
  if (filters.statusLabel) {
    query = query.eq("status_label", filters.statusLabel);
  }
  if (filters.submittedDateFrom) {
    query = query.gte("submitted_date", filters.submittedDateFrom);
  }
  if (filters.submittedDateTo) {
    query = query.lte("submitted_date", filters.submittedDateTo);
  }

  query = query.order(sort.key, {
    ascending: sort.direction === "asc",
    nullsFirst: false,
  });
  if (sort.key !== "updated_at") {
    query = query.order("updated_at", { ascending: false, nullsFirst: false });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(`Failed to fetch admin bills: ${error.message}`);
  }

  return {
    bills: (data ?? []) as AdminBillListItem[],
    totalCount: count ?? 0,
    page: safePage,
    perPage: safePerPage,
  };
}
