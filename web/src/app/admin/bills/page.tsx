import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminBillList } from "@/features/admin/components/admin-bill-list";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  ADMIN_BILLS_PER_PAGE,
  type AdminBillSearchFilters,
  BILL_ITEM_TYPE_OPTIONS,
  BILL_STATUS_LABEL_OPTIONS,
  ensurePreviewToken,
  listAdminBills,
  normalizeAdminBillSearchFilters,
  PUBLISH_STATUS_OPTIONS,
} from "@/features/admin/server/bill-admin";
import { MAJOR_CATEGORY_OPTIONS } from "@/features/bills/shared/types";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface AdminBillsPageProps {
  searchParams?: Promise<{
    deleted?: string;
    error?: string;
    q?: string;
    publish_status?: string;
    item_type?: string;
    major_category?: string;
    status_label?: string;
    date_from?: string;
    date_to?: string;
    bulk_status?: string;
    bulk_updated?: string;
    page?: string;
  }>;
}

function parseAdminBillPage(page: string | undefined) {
  const parsed = Number.parseInt(page ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function setSearchParamIfPresent(
  params: URLSearchParams,
  key: string,
  value: string
) {
  if (value) {
    params.set(key, value);
  }
}

function adminBillsHref(filters: AdminBillSearchFilters, page?: number): Route {
  const params = new URLSearchParams();
  if (page && page > 1) {
    params.set("page", String(page));
  }
  setSearchParamIfPresent(params, "q", filters.query);
  setSearchParamIfPresent(params, "publish_status", filters.publishStatus);
  setSearchParamIfPresent(params, "item_type", filters.itemType);
  setSearchParamIfPresent(params, "major_category", filters.majorCategory);
  setSearchParamIfPresent(params, "status_label", filters.statusLabel);
  setSearchParamIfPresent(params, "date_from", filters.submittedDateFrom);
  setSearchParamIfPresent(params, "date_to", filters.submittedDateTo);

  const query = params.toString();
  return query
    ? (`${routes.adminBills()}?${query}` as Route)
    : (routes.adminBills() as Route);
}

function hasDetailedFilters(filters: AdminBillSearchFilters) {
  return Boolean(
    filters.publishStatus ||
      filters.itemType ||
      filters.majorCategory ||
      filters.statusLabel ||
      filters.submittedDateFrom ||
      filters.submittedDateTo
  );
}

function bulkStatusLabel(status: string | undefined) {
  switch (status) {
    case "published":
      return "公開";
    case "draft":
      return "下書き";
    default:
      return "指定した公開状態";
  }
}

function AdminBillSearchForm({ filters }: { filters: AdminBillSearchFilters }) {
  const inputClassName =
    "h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <form
      action={routes.adminBills()}
      method="get"
      className="rounded-xl border bg-white p-4"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
        <label className="grid gap-1.5">
          <span className="text-sm font-bold">キーワード検索</span>
          <input
            type="search"
            name="q"
            defaultValue={filters.query}
            placeholder="案件名、本文タイトル、概要、ナレッジソース、タグなど"
            className={inputClassName}
          />
        </label>
        <Button type="submit">検索</Button>
        <Button variant="outline" asChild>
          <Link href={routes.adminBills() as Route}>条件をクリア</Link>
        </Button>
      </div>

      <details className="mt-4" open={hasDetailedFilters(filters)}>
        <summary className="cursor-pointer text-sm font-bold text-mirai-text">
          詳細検索
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-bold">公開状態</span>
            <select
              name="publish_status"
              defaultValue={filters.publishStatus}
              className={inputClassName}
            >
              <option value="">すべて</option>
              {PUBLISH_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold">案件タイプ</span>
            <select
              name="item_type"
              defaultValue={filters.itemType}
              className={inputClassName}
            >
              <option value="">すべて</option>
              {BILL_ITEM_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold">大分類</span>
            <select
              name="major_category"
              defaultValue={filters.majorCategory}
              className={inputClassName}
            >
              <option value="">すべて</option>
              {MAJOR_CATEGORY_OPTIONS.map((category) => (
                <option key={category.id} value={category.label}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold">ステータス表示</span>
            <select
              name="status_label"
              defaultValue={filters.statusLabel}
              className={inputClassName}
            >
              <option value="">すべて</option>
              {BILL_STATUS_LABEL_OPTIONS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold">日付 From</span>
            <input
              type="date"
              name="date_from"
              defaultValue={filters.submittedDateFrom}
              className={inputClassName}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold">日付 To</span>
            <input
              type="date"
              name="date_to"
              defaultValue={filters.submittedDateTo}
              className={inputClassName}
            />
          </label>
        </div>
      </details>
    </form>
  );
}

export default async function AdminBillsPage({
  searchParams,
}: AdminBillsPageProps) {
  const params = await searchParams;
  const currentPage = parseAdminBillPage(params?.page);
  const filters = normalizeAdminBillSearchFilters(params);
  const [user, billPage] = await Promise.all([
    requireAdmin("/admin/bills"),
    listAdminBills({
      page: currentPage,
      perPage: ADMIN_BILLS_PER_PAGE,
      filters,
    }),
  ]);
  const totalPages = Math.max(
    1,
    Math.ceil(billPage.totalCount / billPage.perPage)
  );
  if (billPage.totalCount > 0 && currentPage > totalPages) {
    redirect(adminBillsHref(filters, totalPages));
  }

  const billsWithPreviewTokens = await Promise.all(
    billPage.bills.map(async (bill) => ({
      ...bill,
      previewToken: await ensurePreviewToken(bill.id),
    }))
  );

  return (
    <AdminShell user={user}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">案件管理</h1>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              追加・編集・下書き保存・公開切替を行います。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={routes.adminDietSessions() as Route}>会期管理</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={routes.adminIssueReports() as Route}>
                問い合わせ管理
              </Link>
            </Button>
            <Button asChild>
              <Link href={routes.adminBillNew() as Route}>
                新しい案件を追加
              </Link>
            </Button>
          </div>
        </div>
        {params?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {params.error}
          </div>
        )}
        {params?.deleted === "1" && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            削除しました。
          </div>
        )}
        {params?.bulk_updated && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            {params.bulk_updated}件を
            {bulkStatusLabel(params.bulk_status)}
            にしました。
          </div>
        )}
        <AdminBillSearchForm filters={filters} />
        <AdminBillList
          bills={billsWithPreviewTokens}
          currentPage={billPage.page}
          filters={filters}
          perPage={billPage.perPage}
          totalCount={billPage.totalCount}
        />
      </div>
    </AdminShell>
  );
}
