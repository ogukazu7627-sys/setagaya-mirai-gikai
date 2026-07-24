import { deleteRecommendationProfile } from "@/features/recommendations/server/repositories/recommendation-repository";
import { RecommendationProfileNotFoundError } from "@/features/recommendations/server/services/daily-recommendation-service";
import { consumeRecommendationRateLimit } from "@/features/recommendations/server/services/recommendation-rate-limit-service";
import {
  rateLimitResponse,
  recommendationApiErrorResponse,
} from "@/features/recommendations/server/utils/recommendation-api-response";
import { installationRequestSchema } from "@/features/recommendations/shared/utils/recommendation-schemas";
import { assertSameOrigin, parseBoundedJson } from "@/lib/api/bounded-json";
import { jsonResponse } from "@/lib/api/response";

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(request, installationRequestSchema);
    const allowed = await consumeRecommendationRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "delete-profile",
      kind: "mutation",
    });
    if (!allowed) {
      return rateLimitResponse();
    }

    const deleted = await deleteRecommendationProfile(input.installationId);
    if (!deleted) {
      throw new RecommendationProfileNotFoundError();
    }
    return jsonResponse({ success: true }, 200);
  } catch (error) {
    return recommendationApiErrorResponse(error);
  }
}
