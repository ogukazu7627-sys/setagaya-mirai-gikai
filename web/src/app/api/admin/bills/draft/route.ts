import {
  AdminBillSaveError,
  getAdminDraftBillForApi,
  listAdminBillKnowledgeSourcesForApi,
  saveAdminDraftBillFromJson,
} from "@/features/admin/server/bill-admin";
import { jsonResponse } from "@/lib/api/response";
import { env } from "@/lib/env";

function authenticateAdminDraftApiRequest(request: Request): Response | null {
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

function handleAdminDraftApiError(error: unknown, fallbackMessage: string) {
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
      error: fallbackMessage,
      code: "internal_error",
    },
    500
  );
}

export async function GET(request: Request) {
  const authError = authenticateAdminDraftApiRequest(request);
  if (authError) return authError;

  const searchParams = new URL(request.url).searchParams;
  const billId = searchParams.get("id");
  const exportType = searchParams.get("export");
  if (exportType === "knowledge_sources") {
    try {
      const result = await listAdminBillKnowledgeSourcesForApi(
        searchParams.get("item_type") ?? "report"
      );
      return jsonResponse(result, 200);
    } catch (error) {
      return handleAdminDraftApiError(
        error,
        "Failed to read bill knowledge sources"
      );
    }
  }

  if (!billId) {
    return jsonResponse(
      {
        success: false,
        error: "id is required",
        code: "missing_id",
      },
      400
    );
  }

  try {
    const result = await getAdminDraftBillForApi(billId);
    return jsonResponse(result, 200);
  } catch (error) {
    return handleAdminDraftApiError(error, "Failed to read draft bill");
  }
}

export async function POST(request: Request) {
  const authError = authenticateAdminDraftApiRequest(request);
  if (authError) return authError;

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
    return handleAdminDraftApiError(error, "Failed to save draft bill");
  }
}
