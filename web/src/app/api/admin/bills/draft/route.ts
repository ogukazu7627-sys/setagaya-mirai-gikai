import {
  getAdminDraftBillForApi,
  listAdminBillKnowledgeSourcesForApi,
  saveAdminDraftBillFromJson,
} from "@/features/admin/server/bill-admin";
import { jsonResponse } from "@/lib/api/response";
import {
  authenticateAdminBillsApiRequest,
  handleAdminBillsApiError,
} from "../_shared";

const PRIVATE_NO_STORE = "private, no-store";

function asPrivateNoStore(response: Response): Response {
  response.headers.set("Cache-Control", PRIVATE_NO_STORE);
  return response;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const billId = searchParams.get("id");
  const exportType = searchParams.get("export");
  const authError = authenticateAdminBillsApiRequest(request);
  if (authError) {
    return exportType === "knowledge_sources"
      ? asPrivateNoStore(authError)
      : authError;
  }

  if (exportType === "knowledge_sources") {
    try {
      const result = await listAdminBillKnowledgeSourcesForApi(
        searchParams.get("item_type") ?? "report",
        {
          offset: searchParams.get("offset"),
          limit: searchParams.get("limit"),
        }
      );
      return asPrivateNoStore(jsonResponse(result, 200));
    } catch (error) {
      return asPrivateNoStore(
        handleAdminBillsApiError(
          error,
          "Failed to read bill knowledge sources",
          "Admin draft bill API error"
        )
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
    return handleAdminBillsApiError(
      error,
      "Failed to read draft bill",
      "Admin draft bill API error"
    );
  }
}

export async function POST(request: Request) {
  const authError = authenticateAdminBillsApiRequest(request);
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
    return handleAdminBillsApiError(
      error,
      "Failed to save draft bill",
      "Admin draft bill API error"
    );
  }
}
