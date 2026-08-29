import { AdminBillForm } from "@/features/admin/components/admin-bill-form";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import { getAdminBillFormData } from "@/features/admin/server/bill-admin";
import { normalizeAdminBillsReturnPath } from "@/features/admin/shared/admin-bill-return-path";

export const dynamic = "force-dynamic";

interface AdminEditBillPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    return_path?: string;
    saved?: string;
    seo_status?: string;
    seo_warning?: string;
  }>;
}

export default async function AdminEditBillPage({
  params,
  searchParams,
}: AdminEditBillPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [user, data] = await Promise.all([
    requireAdmin(`/admin/bills/${id}/edit`),
    getAdminBillFormData(id),
  ]);

  return (
    <AdminShell user={user}>
      <AdminBillForm
        data={data}
        error={query?.error}
        returnPath={normalizeAdminBillsReturnPath(query?.return_path)}
        saved={query?.saved === "1"}
        seoStatus={query?.seo_status}
        seoWarning={query?.seo_warning}
      />
    </AdminShell>
  );
}
