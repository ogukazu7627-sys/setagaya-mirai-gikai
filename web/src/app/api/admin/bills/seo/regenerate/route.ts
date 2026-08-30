import { revalidateTag } from "next/cache";
import { z } from "zod";
import { syncBillSeoProfileSafely } from "@/features/bill-seo/server/services/generate-bill-seo";
import { jsonResponse } from "@/lib/api/response";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  authenticateAdminBillsApiRequest,
  handleAdminBillsApiError,
} from "../../_shared";

const regenerateBillSeoSchema = z.object({
  id: z.string().uuid("idはUUID形式で指定してください。"),
});

export async function POST(request: Request) {
  const authError = authenticateAdminBillsApiRequest(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON body", code: "invalid_json" },
      400
    );
  }

  const parsed = regenerateBillSeoSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
        code: "invalid_request",
      },
      400
    );
  }

  try {
    const seoGeneration = await syncBillSeoProfileSafely(parsed.data.id, {
      force: true,
    });
    revalidateTag(CACHE_TAGS.BILLS);
    const success = seoGeneration.status !== "failed";

    return jsonResponse(
      {
        success,
        billId: parsed.data.id,
        seoGeneration,
      },
      success ? 200 : 502
    );
  } catch (error) {
    return handleAdminBillsApiError(
      error,
      "Failed to regenerate bill SEO",
      "Admin regenerate bill SEO API error"
    );
  }
}
