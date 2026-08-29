import "server-only";

import type { Route } from "next";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { syncBillSeoProfileSafely } from "@/features/bill-seo/server/services/generate-bill-seo";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { routes } from "@/lib/routes";
import { requireAdmin } from "./auth";

const LOCAL_BASE_URL = "http://admin.local";

export async function regenerateAdminBillSeo(formData: FormData) {
  const billIdResult = z.string().uuid().safeParse(formData.get("id"));
  if (!billIdResult.success) {
    const params = new URLSearchParams({
      seo_warning: "案件IDを確認できませんでした。",
    });
    redirect(`${routes.adminSeo()}?${params.toString()}` as Route);
  }

  const billId = billIdResult.data;
  await requireAdmin(routes.adminBillEdit(billId));
  const result = await syncBillSeoProfileSafely(billId, { force: true });
  revalidateTag(CACHE_TAGS.BILLS);
  const returnPath = normalizeSeoReturnPath(
    formData.get("seo_return_path"),
    billId
  );
  const url = new URL(returnPath, LOCAL_BASE_URL);
  url.searchParams.set("seo_status", result.status);
  if (result.warning) {
    url.searchParams.set("seo_warning", result.warning.slice(0, 500));
  } else {
    url.searchParams.delete("seo_warning");
  }

  redirect(`${url.pathname}?${url.searchParams.toString()}` as Route);
}

function normalizeSeoReturnPath(
  value: FormDataEntryValue | null,
  billId: string
) {
  const fallback = routes.adminBillEdit(billId);
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    const url = new URL(value, LOCAL_BASE_URL);
    const isAllowed =
      url.origin === LOCAL_BASE_URL &&
      (url.pathname === routes.adminSeo() ||
        url.pathname === routes.adminBillEdit(billId));
    return isAllowed ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}
