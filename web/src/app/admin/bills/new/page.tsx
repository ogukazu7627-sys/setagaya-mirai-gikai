import { AdminBillForm } from "@/features/admin/components/admin-bill-form";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import { getAdminBillFormData } from "@/features/admin/server/bill-admin";

export const dynamic = "force-dynamic";

interface AdminNewBillPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function AdminNewBillPage({
  searchParams,
}: AdminNewBillPageProps) {
  const params = await searchParams;
  const [user, data] = await Promise.all([
    requireAdmin("/admin/bills/new"),
    getAdminBillFormData(),
  ]);

  return (
    <AdminShell user={user}>
      <AdminBillForm data={data} error={params?.error} />
    </AdminShell>
  );
}
