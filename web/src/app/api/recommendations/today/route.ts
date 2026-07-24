import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { consumeRecommendationRateLimit } from "@/features/recommendations/server/services/recommendation-rate-limit-service";
import { getTodayRecommendations } from "@/features/recommendations/server/services/recommendation-service";
import {
  rateLimitResponse,
  recommendationApiErrorResponse,
} from "@/features/recommendations/server/utils/recommendation-api-response";
import { getJstDateKey } from "@/features/recommendations/shared/utils/jst-date";
import { installationRequestSchema } from "@/features/recommendations/shared/utils/recommendation-schemas";
import { assertSameOrigin, parseBoundedJson } from "@/lib/api/bounded-json";
import { jsonResponse } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(request, installationRequestSchema);
    const allowed = await consumeRecommendationRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "today",
      kind: "today",
    });
    if (!allowed) {
      return rateLimitResponse();
    }

    const difficultyLevel = await getDifficultyLevel();
    const result = await getTodayRecommendations({
      installationId: input.installationId,
      date: getJstDateKey(),
      difficultyLevel,
    });
    return jsonResponse(result, 200);
  } catch (error) {
    return recommendationApiErrorResponse(error);
  }
}
