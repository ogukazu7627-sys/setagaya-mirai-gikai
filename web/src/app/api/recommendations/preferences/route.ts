import { saveRecommendationPreferences } from "@/features/recommendations/server/repositories/recommendation-repository";
import { consumeRecommendationRateLimit } from "@/features/recommendations/server/services/recommendation-rate-limit-service";
import {
  rateLimitResponse,
  recommendationApiErrorResponse,
} from "@/features/recommendations/server/utils/recommendation-api-response";
import { preferenceRequestSchema } from "@/features/recommendations/shared/utils/recommendation-schemas";
import { assertSameOrigin, parseBoundedJson } from "@/lib/api/bounded-json";
import { jsonResponse } from "@/lib/api/response";

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(request, preferenceRequestSchema);
    const allowed = await consumeRecommendationRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "preferences",
      kind: "mutation",
    });
    if (!allowed) {
      return rateLimitResponse();
    }

    const profile = await saveRecommendationPreferences(input);
    return jsonResponse(
      {
        selectedSmallTags: profile.selected_small_tags,
        selectedParentCategoryIds: profile.selected_parent_category_ids,
        preferenceVersion: profile.preference_version,
      },
      200
    );
  } catch (error) {
    return recommendationApiErrorResponse(error);
  }
}
