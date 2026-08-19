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
  // 検索語は残さず、原因追跡に必要な種別・メッセージ・スタックだけを記録する。
  console.error(
    "[council-search] request failed:",
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
      : String(error)
  );
  return councilAiSearchJsonResponse(
    {
      error: "議会内検索を一時的に利用できません",
      code: "council-search-unavailable",
    },
    500
  );
}
