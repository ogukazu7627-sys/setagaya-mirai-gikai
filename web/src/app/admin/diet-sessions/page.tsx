import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminDietSessionForm } from "@/features/admin/components/admin-diet-session-form";
import { AdminDietSessionList } from "@/features/admin/components/admin-diet-session-list";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import { listAdminDietSessions } from "@/features/admin/server/diet-session-admin";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface AdminDietSessionsPageProps {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
}

export default async function AdminDietSessionsPage({
  searchParams,
}: AdminDietSessionsPageProps) {
  const [params, user, sessions] = await Promise.all([
    searchParams,
    requireAdmin(routes.adminDietSessions()),
    listAdminDietSessions(),
  ]);

  return (
    <AdminShell user={user}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">会期管理</h1>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              案件に紐づける会期の追加・編集・検索を行います。
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={routes.adminBills() as Route}>案件管理に戻る</Link>
          </Button>
        </div>

        {params?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {params.error}
          </div>
        )}
        {params?.saved === "1" && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            保存しました。
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <section className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-bold">新しい会期を追加</h2>
            <div className="mt-4">
              <AdminDietSessionForm />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-bold">会期一覧</h2>
              <p className="mt-1 text-sm text-mirai-text-secondary">
                名前・日付・slugで検索できます。
              </p>
            </div>
            <AdminDietSessionList sessions={sessions} />
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
