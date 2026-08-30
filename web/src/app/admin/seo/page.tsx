import { RefreshCw } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { regenerateAdminBillSeoAction } from "@/features/admin/server/actions";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  type AdminBillSeoAuditFilters,
  getAdminBillSeoAudit,
} from "@/features/bill-seo/server/loaders/get-admin-bill-seo-audit";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  status?: string;
  issue?: string;
  page?: string;
  seo_status?: string;
  seo_warning?: string;
};

export default async function AdminSeoPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const filters = normalizeFilters(query);
  const [user, data] = await Promise.all([
    requireAdmin(routes.adminSeo()),
    getAdminBillSeoAudit(filters),
  ]);

  return (
    <AdminShell user={user}>
      <div className="grid gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">案件別SEO管理</h1>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              normal版から生成したSEO情報、FAQ構造、重複、更新漏れを確認します。
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={routes.adminBills() as Route}>案件管理へ戻る</Link>
          </Button>
        </div>

        {query?.seo_warning && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {query.seo_warning}
          </div>
        )}
        {query?.seo_status === "ready" && !query.seo_warning && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            案件別SEOを再生成しました。
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["対象案件", data.summary.all],
            ["生成済み", data.summary.ready],
            ["未生成", data.summary.missing],
            ["生成失敗", data.summary.failed],
            ["要確認", data.summary.withIssues],
            ["本日の生成費", `$${data.summary.todayCostUsd.toFixed(4)}`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border bg-white p-4">
              <p className="text-xs font-bold text-mirai-text-secondary">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <form className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-[1fr_180px_180px_auto]">
          <Input
            name="q"
            defaultValue={filters.query}
            placeholder="案件名・SEO・キーワードで検索"
          />
          <select
            name="status"
            defaultValue={filters.status}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">全生成状態</option>
            <option value="missing">未生成</option>
            <option value="pending">生成待ち</option>
            <option value="generating">生成中</option>
            <option value="ready">生成済み</option>
            <option value="failed">生成失敗</option>
          </select>
          <select
            name="issue"
            defaultValue={filters.issue}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">全監査結果</option>
            <option value="error">エラーあり</option>
            <option value="warning">警告あり</option>
            <option value="stale">更新後未生成</option>
            <option value="duplicate">重複あり</option>
            <option value="faq_missing">FAQなし</option>
          </select>
          <Button type="submit">絞り込む</Button>
        </form>

        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-mirai-bg text-xs">
              <tr>
                <th className="p-3">案件</th>
                <th className="p-3">状態</th>
                <th className="p-3">SEO</th>
                <th className="p-3">キーワード / FAQ</th>
                <th className="p-3">監査</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b align-top last:border-b-0"
                >
                  <td className="p-3">
                    <Link
                      href={routes.adminBillEdit(entry.id) as Route}
                      className="font-bold text-primary hover:underline"
                    >
                      {entry.name}
                    </Link>
                    <p className="mt-1 text-xs text-mirai-text-secondary">
                      {entry.publishStatus === "published" ? "公開" : "下書き"}
                    </p>
                  </td>
                  <td className="p-3 font-bold">
                    {seoStatusLabel(entry.profile?.status)}
                  </td>
                  <td className="max-w-[320px] p-3">
                    <p className="font-bold">
                      {entry.profile?.seoTitle ?? "未生成"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-mirai-text-secondary">
                      {entry.profile?.seoDescription ?? "説明文は未生成です。"}
                    </p>
                    <p className="mt-1 text-xs text-mirai-text-secondary">
                      {entry.titleLength ?? "-"}文字 /{" "}
                      {entry.descriptionLength ?? "-"}文字
                    </p>
                  </td>
                  <td className="max-w-[220px] p-3 text-xs leading-5">
                    <p>{entry.profile?.seoKeywords.join("、") || "未生成"}</p>
                    <p className="mt-2 font-bold">FAQ {entry.faqCount}件</p>
                  </td>
                  <td className="max-w-[250px] p-3 text-xs leading-5">
                    {entry.issues.length > 0
                      ? entry.issues.map((issue) => (
                          <p
                            key={`${entry.id}-${issue.code}`}
                            className={
                              issue.severity === "error"
                                ? "text-red-700"
                                : "text-amber-800"
                            }
                          >
                            {issue.message}
                          </p>
                        ))
                      : "問題なし"}
                  </td>
                  <td className="p-3">
                    <form action={regenerateAdminBillSeoAction}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input
                        type="hidden"
                        name="seo_return_path"
                        value={buildCurrentSeoPath(filters)}
                      />
                      <Button type="submit" variant="outline" size="sm">
                        <RefreshCw aria-hidden="true" />
                        再生成
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {data.entries.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-mirai-text-secondary"
                  >
                    条件に一致する案件はありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-mirai-text-secondary">{data.total}件</p>
          <div className="flex items-center gap-2">
            {data.page > 1 && (
              <Button variant="outline" asChild>
                <Link href={buildSeoPagePath(filters, data.page - 1) as Route}>
                  前へ
                </Link>
              </Button>
            )}
            <span className="text-sm font-bold">
              {data.page} / {data.totalPages}
            </span>
            {data.page < data.totalPages && (
              <Button variant="outline" asChild>
                <Link href={buildSeoPagePath(filters, data.page + 1) as Route}>
                  次へ
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function normalizeFilters(
  query: SearchParams | undefined
): AdminBillSeoAuditFilters {
  const statuses = [
    "missing",
    "pending",
    "generating",
    "ready",
    "failed",
  ] as const;
  const issues = [
    "error",
    "warning",
    "stale",
    "duplicate",
    "faq_missing",
  ] as const;
  const page = Number(query?.page);
  return {
    query: query?.q?.trim() ?? "",
    status: statuses.includes(query?.status as (typeof statuses)[number])
      ? (query?.status as AdminBillSeoAuditFilters["status"])
      : "",
    issue: issues.includes(query?.issue as (typeof issues)[number])
      ? (query?.issue as AdminBillSeoAuditFilters["issue"])
      : "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function buildCurrentSeoPath(filters: AdminBillSeoAuditFilters) {
  return buildSeoPagePath(filters, filters.page);
}

function buildSeoPagePath(filters: AdminBillSeoAuditFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.status) params.set("status", filters.status);
  if (filters.issue) params.set("issue", filters.issue);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${routes.adminSeo()}?${query}` : routes.adminSeo();
}

function seoStatusLabel(status: string | undefined) {
  switch (status) {
    case "pending":
      return "生成待ち";
    case "generating":
      return "生成中";
    case "ready":
      return "生成済み";
    case "failed":
      return "生成失敗";
    default:
      return "未生成";
  }
}
