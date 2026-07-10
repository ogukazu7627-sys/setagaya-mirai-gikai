import {
  AdminBillSaveError,
  saveAdminDraftBillFromJson,
} from "@/features/admin/server/bill-admin";
import { jsonResponse } from "@/lib/api/response";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  if (!env.adminApiToken) {
    return jsonResponse(
      {
        success: false,
        error: "ADMIN_API_TOKEN is not configured",
        code: "admin_api_token_not_configured",
      },
      500
    );
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${env.adminApiToken}`) {
    return jsonResponse(
      {
        success: false,
        error: "Unauthorized",
        code: "unauthorized",
      },
      401
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        error: "Invalid JSON body",
        code: "invalid_json",
      },
      400
    );
  }

  try {
    const result = await saveAdminDraftBillFromJson(body);
    return jsonResponse(result, 200);
  } catch (error) {
    if (error instanceof AdminBillSaveError) {
      return jsonResponse(
        {
          success: false,
          error: error.message,
          code: error.code,
          billId: error.billId,
        },
        error.status
      );
    }

    console.error("Admin draft bill API error:", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to save draft bill",
        code: "internal_error",
      },
      500
    );
  }
}
