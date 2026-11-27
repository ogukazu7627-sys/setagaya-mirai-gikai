import { AdminBillSaveError } from "@/features/admin/server/bill-admin-shared";
import { jsonResponse } from "@/lib/api/response";
import { env } from "@/lib/env";

/** 管理API（Bearer ADMIN_API_TOKEN）の共通認証。案件APIと会期APIで使う。 */
export function authenticateAdminApiRequest(request: Request): Response | null {
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

  return null;
}

export function handleAdminApiError(
  error: unknown,
  fallbackMessage: string,
  logLabel: string
) {
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

  console.error(`${logLabel}:`, error);
  return jsonResponse(
    {
      success: false,
      error: fallbackMessage,
      code: "internal_error",
    },
    500
  );
}
