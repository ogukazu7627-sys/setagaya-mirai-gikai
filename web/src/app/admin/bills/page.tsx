import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminBillList } from "@/features/admin/components/admin-bill-list";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  ensurePreviewToken,
  listAdminBills,
} from "@/features/admin/server/bill-admin";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface AdminBillsPageProps {
  searchParams?: Promise<{
    deleted?: string;
    error?: string;
  }>;
}

export default async function AdminBillsPage({
  searchParams,
}: AdminBillsPageProps) {
  const [params, user, bills] = await Promise.all([
    searchParams,
    requireAdmin("/admin/bills"),
    listAdminBills(),
  ]);

  const billsWithPreviewTokens = await Promise.all(
    bills.map(async (bill) => ({
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
        <AdminBillList bills={billsWithPreviewTokens} />
      </div>
    </AdminShell>
  );
}
