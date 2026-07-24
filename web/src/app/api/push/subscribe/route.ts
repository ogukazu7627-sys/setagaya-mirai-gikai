import {
  findRecommendationProfileByInstallationId,
  savePushSubscription,
} from "@/features/recommendations/server/repositories/recommendation-repository";
import { RecommendationProfileNotFoundError } from "@/features/recommendations/server/services/daily-recommendation-service";
import { consumeRecommendationRateLimit } from "@/features/recommendations/server/services/recommendation-rate-limit-service";
import {
  rateLimitResponse,
  recommendationApiErrorResponse,
} from "@/features/recommendations/server/utils/recommendation-api-response";
import { pushSubscriptionRequestSchema } from "@/features/recommendations/shared/utils/recommendation-schemas";
import { assertSameOrigin, parseBoundedJson } from "@/lib/api/bounded-json";
import { jsonResponse } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(
      request,
      pushSubscriptionRequestSchema
    );
    const allowed = await consumeRecommendationRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "push-subscribe",
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
    await savePushSubscription({
      profileId: profile.id,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
    });
    return jsonResponse({ success: true }, 200);
  } catch (error) {
    return recommendationApiErrorResponse(error);
  }
}
