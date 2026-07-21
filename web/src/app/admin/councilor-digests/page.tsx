import { AdminCouncilorDigestsPage } from "@/features/admin/components/admin-councilor-digests-page";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function AdminCouncilorDigestsRoute() {
  const user = await requireAdmin(routes.adminCouncilorDigests());

  return (
    <AdminShell user={user}>
      <AdminCouncilorDigestsPage />
    </AdminShell>
  );
}
