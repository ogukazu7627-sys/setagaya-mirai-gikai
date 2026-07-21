import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appendAdminBillsReturnPath } from "@/features/admin/shared/admin-bill-return-path";
import { getBillItemTypeLabel } from "@/features/bills/shared/types";
import { routes } from "@/lib/routes";
import {
  bulkUpdateAdminBillPublishStatusAction,
  deleteAdminBillAction,
} from "../server/actions";
import {
  type AdminBillListItem,
  type AdminBillSearchFilters,
  type AdminBillSort,
  type AdminBillSortDirection,
  type AdminBillSortKey,
  formatAdminDateTime,
  getPreviewPath,
} from "../server/bill-admin";
import { AdminBillBulkSelectAll } from "./admin-bill-bulk-select-all";
import { AdminDeleteBillButton } from "./admin-delete-bill-button";

interface AdminBillListProps {
  bills: Array<AdminBillListItem & { previewToken?: string | null }>;
  currentPage: number;
  filters: AdminBillSearchFilters;
  perPage: number;
  sort: AdminBillSort;
  totalCount: number;
}

function publishStatusLabel(status: string) {
  switch (status) {
    case "published":
      return "公開";
    default:
      return "下書き";
  }
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

function adminBillsPageHref(
  page: number,
  filters: AdminBillSearchFilters,
  sort: AdminBillSort
): Route {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  params.set("sort_by", sort.key);
  params.set("sort_order", sort.direction);
  setSearchParamIfPresent(params, "q", filters.query);
  setSearchParamIfPresent(params, "publish_status", filters.publishStatus);
  setSearchParamIfPresent(params, "item_type", filters.itemType);
  setSearchParamIfPresent(params, "major_category", filters.majorCategory);
  setSearchParamIfPresent(params, "status_label", filters.statusLabel);
  setSearchParamIfPresent(params, "thumbnail", filters.thumbnail);
  setSearchParamIfPresent(params, "date_from", filters.submittedDateFrom);
  setSearchParamIfPresent(params, "date_to", filters.submittedDateTo);

  const query = params.toString();
  if (query) {
    return `${routes.adminBills()}?${query}` as Route;
  }

  if (page <= 1) {
    return routes.adminBills() as Route;
  }

  return `${routes.adminBills()}?page=${page}` as Route;
}

function hasActiveFilters(filters: AdminBillSearchFilters) {
  return Object.values(filters).some((value) => value !== "");
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5;
  const halfVisiblePages = Math.floor(maxVisiblePages / 2);
  const startPage = Math.max(
    1,
    Math.min(currentPage - halfVisiblePages, totalPages - maxVisiblePages + 1)
  );
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );
}

function nextSortDirection(
  sortKey: AdminBillSortKey,
  currentSort: AdminBillSort
): AdminBillSortDirection {
  if (currentSort.key === sortKey) {
    return currentSort.direction === "asc" ? "desc" : "asc";
  }

  return sortKey === "updated_at" ? "desc" : "asc";
}

function sortIndicator(sortKey: AdminBillSortKey, currentSort: AdminBillSort) {
  if (currentSort.key !== sortKey) {
    return "↕";
  }

  return currentSort.direction === "asc" ? "↑" : "↓";
}

function SortableHeader({
  filters,
  label,
  sort,
  sortKey,
}: {
  filters: AdminBillSearchFilters;
  label: string;
  sort: AdminBillSort;
  sortKey: AdminBillSortKey;
}) {
  const isActive = sort.key === sortKey;
  const nextSort: AdminBillSort = {
    key: sortKey,
    direction: nextSortDirection(sortKey, sort),
  };

  return (
    <Link
      href={adminBillsPageHref(1, filters, nextSort)}
      className="inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`${label}を${
        nextSort.direction === "asc" ? "昇順" : "降順"
      }で並び替え`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className={isActive ? "" : "text-gray-400"}>
        {sortIndicator(sortKey, sort)}
      </span>
    </Link>
  );
}

export function AdminBillList({
  bills,
  currentPage,
  filters,
  perPage,
  sort,
  totalCount,
}: AdminBillListProps) {
  const bulkFormId = "admin-bill-bulk-publish-status-form";
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const endIndex =
    totalCount === 0 ? 0 : Math.min(startIndex + bills.length - 1, totalCount);
  const pageNumbers = buildPageNumbers(currentPage, totalPages);
  const returnPath = adminBillsPageHref(currentPage, filters, sort);

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <form
        id={bulkFormId}
        action={bulkUpdateAdminBillPublishStatusAction}
        className="flex flex-col gap-3 border-b bg-mirai-surface px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
      >
        <input type="hidden" name="return_path" value={returnPath} />
        <span className="font-bold">選択した案件を一斉編集</span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            name="bulk_publish_status"
            value="published"
            variant="outline"
            size="sm"
            disabled={bills.length === 0}
          >
            公開にする
          </Button>
          <Button
            type="submit"
            name="bulk_publish_status"
            value="draft"
            variant="outline"
            size="sm"
            disabled={bills.length === 0}
          >
            下書きにする
          </Button>
        </div>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-mirai-surface">
            <tr className="text-left">
              <th className="w-12 px-4 py-3 font-bold">
                <AdminBillBulkSelectAll
                  disabled={bills.length === 0}
                  formId={bulkFormId}
                />
              </th>
              <th className="px-4 py-3 font-bold">案件</th>
              <th className="px-4 py-3 font-bold">
                <SortableHeader
                  filters={filters}
                  label="種別"
                  sort={sort}
                  sortKey="item_type"
                />
              </th>
              <th className="px-4 py-3 font-bold">
                <SortableHeader
                  filters={filters}
                  label="大分類"
                  sort={sort}
                  sortKey="major_category"
                />
              </th>
              <th className="px-4 py-3 font-bold">状態</th>
              <th className="px-4 py-3 font-bold">
                <SortableHeader
                  filters={filters}
                  label="公開"
                  sort={sort}
                  sortKey="publish_status"
                />
              </th>
              <th className="px-4 py-3 font-bold">
                <SortableHeader
                  filters={filters}
                  label="更新日時"
                  sort={sort}
                  sortKey="updated_at"
                />
              </th>
              <th className="px-4 py-3 font-bold">操作</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => {
              const title =
                bill.bill_contents?.find(
                  (content) => content.difficulty_level === "normal"
                )?.title ?? bill.name;
              return (
                <tr key={bill.id} className="border-t align-top">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      name="bulk_bill_ids"
                      value={bill.id}
                      form={bulkFormId}
                      data-admin-bill-bulk-checkbox={bulkFormId}
                      aria-label={`${title}を選択`}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                  <td className="max-w-[360px] px-4 py-4">
                    <p className="font-bold leading-relaxed">{title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-mirai-text-secondary">
                      {bill.name}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="outline">
                      {getBillItemTypeLabel(bill.item_type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">{bill.major_category ?? "-"}</td>
                  <td className="px-4 py-4">
                    {bill.status_label ?? bill.status}
                    {bill.status_note && (
                      <p className="mt-1 text-xs text-mirai-text-secondary">
                        {bill.status_note}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant={
                        bill.publish_status === "published"
                          ? "default"
                          : "outline"
                      }
                    >
                      {publishStatusLabel(bill.publish_status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    {formatAdminDateTime(bill.updated_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={
                            appendAdminBillsReturnPath(
                              routes.adminBillEdit(bill.id),
                              returnPath
                            ) as Route
                          }
                        >
                          編集
                        </Link>
                      </Button>
                      {bill.previewToken && (
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={
                              getPreviewPath(
                                bill.id,
                                bill.previewToken
                              ) as Route
                            }
                            target="_blank"
                          >
                            プレビュー
                          </Link>
                        </Button>
                      )}
                      {bill.publish_status === "published" && (
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/bills/${bill.id}` as Route}
                            target="_blank"
                          >
                            公開ページ
                          </Link>
                        </Button>
                      )}
                      <AdminDeleteBillButton
                        billId={bill.id}
                        returnPath={returnPath}
                        title={title}
                        action={deleteAdminBillAction}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {bills.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-mirai-text-secondary">
          {hasActiveFilters(filters)
            ? "条件に一致する案件がありません。"
            : "まだ案件がありません。"}
        </div>
      )}
      {totalCount > 0 && (
        <div className="flex flex-col gap-3 border-t px-4 py-4 text-sm text-mirai-text-secondary md:flex-row md:items-center md:justify-between">
          <span>
            全 {totalCount} 件中 {startIndex}〜{endIndex} 件を表示
          </span>
          {totalPages > 1 && (
            <nav
              aria-label="案件一覧ページ"
              className="flex flex-wrap items-center gap-2"
            >
              {currentPage > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={adminBillsPageHref(currentPage - 1, filters, sort)}
                  >
                    前へ
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  前へ
                </Button>
              )}
              {pageNumbers.map((page) =>
                page === currentPage ? (
                  <Button key={page} size="sm" aria-current="page">
                    {page}
                  </Button>
                ) : (
                  <Button key={page} variant="outline" size="sm" asChild>
                    <Link href={adminBillsPageHref(page, filters, sort)}>
                      {page}
                    </Link>
                  </Button>
                )
              )}
              {currentPage < totalPages ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={adminBillsPageHref(currentPage + 1, filters, sort)}
                  >
                    次へ
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  次へ
                </Button>
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
