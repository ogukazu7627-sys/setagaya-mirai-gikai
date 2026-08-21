import {
  getPublishedBudgetKnowledgeSourceForApi,
  patchPublishedBudgetKnowledgeSourceForApi,
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

function privateJsonResponse(body: unknown, status: number): Response {
  return asPrivateNoStore(jsonResponse(body, status));
}

function privateApiError(
  error: unknown,
  fallbackMessage: string,
  logLabel: string
): Response {
  return asPrivateNoStore(
    handleAdminBillsApiError(error, fallbackMessage, logLabel)
  );
}

export async function GET(request: Request) {
  const authError = authenticateAdminBillsApiRequest(request);
  if (authError) return asPrivateNoStore(authError);

  const input = Object.fromEntries(new URL(request.url).searchParams.entries());

  try {
    const result = await getPublishedBudgetKnowledgeSourceForApi(input);
    return privateJsonResponse(result, 200);
  } catch (error) {
    return privateApiError(
      error,
      "Failed to read published budget knowledge source",
      "Admin budget knowledge source API error"
    );
  }
}

export async function PATCH(request: Request) {
  const authError = authenticateAdminBillsApiRequest(request);
  if (authError) return asPrivateNoStore(authError);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateJsonResponse(
      {
        success: false,
        error: "Invalid JSON body",
        code: "invalid_json",
      },
      400
    );
  }

  try {
    const result = await patchPublishedBudgetKnowledgeSourceForApi(body);
    return privateJsonResponse(result, 200);
  } catch (error) {
    return privateApiError(
      error,
      "Failed to update published budget knowledge source",
      "Admin budget knowledge source API error"
    );
  }
}
