import { PublicApiRequestError } from "@/lib/api/bounded-json";

export function budgetApiJsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function budgetApiErrorResponse(error: unknown): Response {
  if (error instanceof PublicApiRequestError) {
    return budgetApiJsonResponse(
      { error: error.message, code: error.code },
      error.status
    );
  }
  console.error("Budget search API request failed");
  return budgetApiJsonResponse(
    {
      error: "予算検索を一時的に利用できません",
      code: "budget-search-unavailable",
    },
    500
  );
}
