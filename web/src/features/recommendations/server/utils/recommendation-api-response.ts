import { PublicApiRequestError } from "@/lib/api/bounded-json";
import { jsonResponse } from "@/lib/api/response";
import { RecommendationProfileNotFoundError } from "../services/daily-recommendation-service";

export function recommendationApiErrorResponse(error: unknown): Response {
  if (error instanceof PublicApiRequestError) {
    return jsonResponse(
      { error: error.message, code: error.code },
      error.status
    );
  }
  if (error instanceof RecommendationProfileNotFoundError) {
    return jsonResponse(
      {
        error: "おすすめ設定が見つかりません",
        code: "profile-not-found",
      },
      404
    );
  }

  console.error("Recommendation API request failed");
  return jsonResponse(
    {
      error: "おすすめ機能を一時的に利用できません",
      code: "recommendation-unavailable",
    },
    500
  );
}

export function rateLimitResponse(): Response {
  return jsonResponse(
    {
      error: "リクエストが多すぎます。少し待ってからお試しください",
      code: "rate-limited",
    },
    429
  );
}
