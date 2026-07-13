import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  type AdminIssueReport,
  listAdminIssueReports,
} from "@/features/issue-report/server/issue-report-admin";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  content_issue: "掲載内容",
  broken_link: "リンク切れ",
  display_issue: "表示不具合",
  other: "その他",
};

const STATUS_LABELS: Record<string, string> = {
  new: "未対応",
  reviewing: "確認中",
  resolved: "対応済み",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function IssueReportCard({ report }: { report: AdminIssueReport }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {CATEGORY_LABELS[report.category] ?? report.category}
              </Badge>
              <Badge variant="outline">
                {STATUS_LABELS[report.status] ?? report.status}
              </Badge>
            </div>
            <CardTitle className="text-lg">
              {report.bill ? report.bill.name : "対象案件なし"}
            </CardTitle>
            <CardDescription>
              {formatDateTime(report.created_at)}
            </CardDescription>
          </div>
          {report.bill && (
            <Link
              href={routes.adminBillEdit(report.bill.id) as Route}
              className="text-sm font-bold text-mirai-primary hover:underline"
            >
              案件を編集
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap rounded-lg bg-mirai-surface-light p-4 text-sm leading-7">
          {report.message}
        </p>

        <dl className="grid gap-2 text-sm md:grid-cols-[120px_1fr]">
          <dt className="font-bold text-mirai-text-secondary">連絡先</dt>
          <dd>
            {[report.contact_name, report.contact_email]
              .filter(Boolean)
              .join(" / ") || "未入力"}
          </dd>

          <dt className="font-bold text-mirai-text-secondary">ページURL</dt>
          <dd className="break-all">
            {report.page_url ? (
              <a
                href={report.page_url}
                target="_blank"
                rel="noreferrer"
                className="text-mirai-primary hover:underline"
              >
                {report.page_url}
              </a>
            ) : (
              "未取得"
            )}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}

export default async function AdminReportsPage() {
  const [user, reports] = await Promise.all([
    requireAdmin(routes.adminIssueReports()),
    listAdminIssueReports(),
  ]);

  return (
    <AdminShell user={user}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">問い合わせ管理</h1>
          <p className="mt-1 text-sm text-mirai-text-secondary">
            公開画面の「問題を報告する」フォームから届いた内容を確認します。
          </p>
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-mirai-text-secondary">
              まだ問い合わせは届いていません。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <IssueReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
