import { PublicApiRequestError } from "@/lib/api/bounded-json";

export function councilAiSearchJsonResponse(
  body: unknown,
  status: number
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function councilAiSearchErrorResponse(error: unknown): Response {
  if (error instanceof PublicApiRequestError) {
    return councilAiSearchJsonResponse(
      { error: error.message, code: error.code },
      error.status
    );
  }
  console.error("Council search API request failed");
  return councilAiSearchJsonResponse(
    {
      error: "議会内検索を一時的に利用できません",
      code: "council-search-unavailable",
    },
    500
  );
}
