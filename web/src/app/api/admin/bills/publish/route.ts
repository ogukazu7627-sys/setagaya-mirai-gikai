import { publishAdminDraftBillFromJson } from "@/features/admin/server/bill-admin";
import { jsonResponse } from "@/lib/api/response";
import {
  authenticateAdminBillsApiRequest,
  handleAdminBillsApiError,
} from "../_shared";

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
    const result = await publishAdminDraftBillFromJson(body);
    return jsonResponse(result, 200);
  } catch (error) {
    return handleAdminBillsApiError(
      error,
      "Failed to publish draft bill",
      "Admin publish bill API error"
    );
  }
}
