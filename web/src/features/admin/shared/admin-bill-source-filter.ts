export type AdminBillSourceFilter = "" | "with" | "without";

export const ADMIN_BILL_SOURCE_FILTER_OPTIONS: ReadonlyArray<{
  value: Exclude<AdminBillSourceFilter, "">;
  label: string;
}> = [
  { value: "with", label: "あり" },
  { value: "without", label: "なし" },
];

export function normalizeAdminBillSourceFilter(
  value: string | undefined
): AdminBillSourceFilter {
  return value === "with" || value === "without" ? value : "";
}

export function hasAdminBillSources(sources: unknown): boolean {
  return Array.isArray(sources) && sources.length > 0;
}

export function matchesAdminBillSourceFilter(
  sources: unknown,
  filter: AdminBillSourceFilter
): boolean {
  if (!filter) {
    return true;
  }

  const hasSources = hasAdminBillSources(sources);
  return filter === "with" ? hasSources : !hasSources;
}

export function getAdminBillSourcePostgrestFilter(
  filter: AdminBillSourceFilter
): { operator: "eq" | "neq"; value: "[]" } | null {
  switch (filter) {
    case "with":
      return { operator: "neq", value: "[]" };
    case "without":
      return { operator: "eq", value: "[]" };
    default:
      return null;
  }
}
