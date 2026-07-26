import { searchCouncilBills } from "@/features/bills/server/services/council-ai-search-service";
import {
  councilAiSearchErrorResponse,
  councilAiSearchJsonResponse,
} from "@/features/bills/server/utils/council-ai-search-response";
import { COUNCIL_SEARCH_ANONYMOUS_RATE_LIMIT } from "@/features/bills/shared/constants/council-ai-search";
import { councilAiSearchRequestSchema } from "@/features/bills/shared/utils/council-ai-search-schema";
import { consumeAnonymousRateLimit } from "@/lib/api/anonymous-rate-limit";
import { assertSameOrigin, parseBoundedJson } from "@/lib/api/bounded-json";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(request, councilAiSearchRequestSchema);
    const allowed = await consumeAnonymousRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "council-search",
      windowMs: COUNCIL_SEARCH_ANONYMOUS_RATE_LIMIT.windowMs,
      installationLimit: COUNCIL_SEARCH_ANONYMOUS_RATE_LIMIT.installationLimit,
      ipLimit: COUNCIL_SEARCH_ANONYMOUS_RATE_LIMIT.ipLimit,
    });
    if (!allowed) {
      return councilAiSearchJsonResponse(
        {
          error: "検索回数が多すぎます。少し待ってからお試しください",
          code: "rate-limited",
        },
        429
      );
    }

    return councilAiSearchJsonResponse(await searchCouncilBills(input), 200);
  } catch (error) {
    return councilAiSearchErrorResponse(error);
  }
}
