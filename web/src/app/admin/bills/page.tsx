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

export const dynamic = "force-dynamic";

export default async function AdminBillsPage() {
  const [user, bills] = await Promise.all([
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
          <Button asChild>
            <Link href={"/admin/bills/new" as Route}>新しい案件を追加</Link>
          </Button>
        </div>
        <AdminBillList bills={billsWithPreviewTokens} />
      </div>
    </AdminShell>
  );
}
