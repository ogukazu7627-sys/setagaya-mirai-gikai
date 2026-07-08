import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminDietSessionForm } from "@/features/admin/components/admin-diet-session-form";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import { getAdminDietSession } from "@/features/admin/server/diet-session-admin";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface AdminEditDietSessionPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function AdminEditDietSessionPage({
  params,
  searchParams,
}: AdminEditDietSessionPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [user, session] = await Promise.all([
    requireAdmin(routes.adminDietSessionEdit(id)),
    getAdminDietSession(id),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <AdminShell user={user}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">会期を編集</h1>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              {session.name}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={routes.adminDietSessions() as Route}>会期一覧</Link>
          </Button>
        </div>

        {query?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {query.error}
          </div>
        )}

        <section className="max-w-2xl rounded-xl border bg-white p-5">
          <AdminDietSessionForm session={session} submitLabel="保存" />
        </section>
      </div>
    </AdminShell>
  );
}
