import { searchCouncilBillsByKeyword } from "@/features/bills/server/services/council-keyword-search-service";
import {
  councilSearchErrorResponse,
  councilSearchJsonResponse,
} from "@/features/bills/server/utils/council-search-response";
import { COUNCIL_SEARCH_ANONYMOUS_RATE_LIMIT } from "@/features/bills/shared/constants/council-search";
import { councilKeywordSearchRequestSchema } from "@/features/bills/shared/utils/council-keyword-search-schema";
import { consumeAnonymousRateLimit } from "@/lib/api/anonymous-rate-limit";
import { assertSameOrigin, parseBoundedJson } from "@/lib/api/bounded-json";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(
      request,
      councilKeywordSearchRequestSchema
    );
    const allowed = await consumeAnonymousRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "council-search",
      windowMs: COUNCIL_SEARCH_ANONYMOUS_RATE_LIMIT.windowMs,
      installationLimit: COUNCIL_SEARCH_ANONYMOUS_RATE_LIMIT.installationLimit,
      ipLimit: COUNCIL_SEARCH_ANONYMOUS_RATE_LIMIT.ipLimit,
    });
    if (!allowed) {
      return councilSearchJsonResponse(
        {
          error: "検索回数が多すぎます。少し待ってからお試しください",
          code: "rate-limited",
        },
        429
      );
    }

    return councilSearchJsonResponse(
      await searchCouncilBillsByKeyword(input),
      200
    );
  } catch (error) {
    return councilSearchErrorResponse(error);
  }
}
