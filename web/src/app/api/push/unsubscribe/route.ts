import {
  disablePushSubscription,
  findRecommendationProfileByInstallationId,
} from "@/features/recommendations/server/repositories/recommendation-repository";
import { RecommendationProfileNotFoundError } from "@/features/recommendations/server/services/daily-recommendation-service";
import { consumeRecommendationRateLimit } from "@/features/recommendations/server/services/recommendation-rate-limit-service";
import {
  rateLimitResponse,
  recommendationApiErrorResponse,
} from "@/features/recommendations/server/utils/recommendation-api-response";
import { pushUnsubscribeRequestSchema } from "@/features/recommendations/shared/utils/recommendation-schemas";
import { assertSameOrigin, parseBoundedJson } from "@/lib/api/bounded-json";
import { jsonResponse } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(request, pushUnsubscribeRequestSchema);
    const allowed = await consumeRecommendationRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "push-unsubscribe",
      kind: "mutation",
    });
    if (!allowed) {
      return rateLimitResponse();
    }

    const profile = await findRecommendationProfileByInstallationId(
      input.installationId
    );
    if (!profile) {
      throw new RecommendationProfileNotFoundError();
    }
    await disablePushSubscription({
      profileId: profile.id,
      endpoint: input.endpoint,
    });
    return jsonResponse({ success: true }, 200);
  } catch (error) {
    return recommendationApiErrorResponse(error);
  }
}
