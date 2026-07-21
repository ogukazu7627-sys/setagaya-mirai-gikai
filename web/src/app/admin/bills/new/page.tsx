import { AdminBillForm } from "@/features/admin/components/admin-bill-form";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import { getAdminBillFormData } from "@/features/admin/server/bill-admin";
import { normalizeAdminBillsReturnPath } from "@/features/admin/shared/admin-bill-return-path";

export const dynamic = "force-dynamic";

interface AdminNewBillPageProps {
  searchParams?: Promise<{
    error?: string;
    return_path?: string;
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
      <AdminBillForm
        data={data}
        error={params?.error}
        returnPath={normalizeAdminBillsReturnPath(params?.return_path)}
      />
    </AdminShell>
  );
}
