import {
  findDailyRecommendation,
  findPublishedBillIds,
  findRecommendationProfileByInstallationId,
  insertRecommendationImpressions,
} from "@/features/recommendations/server/repositories/recommendation-repository";
import { RecommendationProfileNotFoundError } from "@/features/recommendations/server/services/daily-recommendation-service";
import { consumeRecommendationRateLimit } from "@/features/recommendations/server/services/recommendation-rate-limit-service";
import {
  rateLimitResponse,
  recommendationApiErrorResponse,
} from "@/features/recommendations/server/utils/recommendation-api-response";
import { getJstDateKey } from "@/features/recommendations/shared/utils/jst-date";
import { impressionRequestSchema } from "@/features/recommendations/shared/utils/recommendation-schemas";
import {
  assertSameOrigin,
  PublicApiRequestError,
  parseBoundedJson,
} from "@/lib/api/bounded-json";
import { jsonResponse } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(request, impressionRequestSchema);
    const allowed = await consumeRecommendationRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "impressions",
      kind: "impressions",
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
    const daily = await findDailyRecommendation(
      profile.id,
      getJstDateKey(),
      profile.preference_version
    );
    const dailyIds = new Set(daily?.bill_ids ?? []);
    if (!input.billIds.every((billId) => dailyIds.has(billId))) {
      throw new PublicApiRequestError(
        "当日のおすすめではない案件が含まれています",
        400,
        "invalid-bill-id"
      );
    }
    const publishedIds = await findPublishedBillIds(input.billIds);
    if (publishedIds.size !== input.billIds.length) {
      throw new PublicApiRequestError(
        "公開されていない案件が含まれています",
        400,
        "invalid-bill-id"
      );
    }

    await insertRecommendationImpressions({
      profileId: profile.id,
      billIds: input.billIds,
      source: "homepage",
    });
    return jsonResponse({ success: true }, 200);
  } catch (error) {
    return recommendationApiErrorResponse(error);
  }
}
