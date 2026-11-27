import {
  createAdminDietSessionFromJson,
  listAdminDietSessionsForApi,
} from "@/features/admin/server/diet-session-admin-api";
import { jsonResponse } from "@/lib/api/response";
import { authenticateAdminApiRequest, handleAdminApiError } from "../_shared";

export async function GET(request: Request) {
  const authError = authenticateAdminApiRequest(request);
  if (authError) return authError;

  try {
    const dietSessions = await listAdminDietSessionsForApi();
    return jsonResponse({ success: true, dietSessions }, 200);
  } catch (error) {
    return handleAdminApiError(
      error,
      "Failed to read diet sessions",
      "Admin diet session API error"
    );
  }
}

export async function POST(request: Request) {
  const authError = authenticateAdminApiRequest(request);
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
    const result = await createAdminDietSessionFromJson(body);
    if (result.mode === "conflict") {
      return jsonResponse(
        {
          success: false,
          error: "同じ名前の会期がすでに登録されています",
          code: "diet_session_name_conflict",
          dietSession: result.dietSession,
        },
        409
      );
    }
    return jsonResponse(
      { success: true, mode: result.mode, dietSession: result.dietSession },
      201
    );
  } catch (error) {
    return handleAdminApiError(
      error,
      "Failed to create diet session",
      "Admin diet session API error"
    );
  }
}
