import { loadCouncilBillPage } from "@/features/bills/server/services/council-bill-page-service";
import {
  councilAiSearchErrorResponse,
  councilAiSearchJsonResponse,
} from "@/features/bills/server/utils/council-ai-search-response";
import { COUNCIL_BILLS_ANONYMOUS_RATE_LIMIT } from "@/features/bills/shared/constants/council-ai-search";
import { councilBillPageRequestSchema } from "@/features/bills/shared/utils/council-bill-page-schema";
import { consumeAnonymousRateLimit } from "@/lib/api/anonymous-rate-limit";
import { assertSameOrigin, parseBoundedJson } from "@/lib/api/bounded-json";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(request, councilBillPageRequestSchema);
    const allowed = await consumeAnonymousRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "council-bills",
      windowMs: COUNCIL_BILLS_ANONYMOUS_RATE_LIMIT.windowMs,
      installationLimit: COUNCIL_BILLS_ANONYMOUS_RATE_LIMIT.installationLimit,
      ipLimit: COUNCIL_BILLS_ANONYMOUS_RATE_LIMIT.ipLimit,
    });
    if (!allowed) {
      return councilAiSearchJsonResponse(
        {
          error: "操作回数が多すぎます。少し待ってからお試しください",
          code: "rate-limited",
        },
        429
      );
    }

    return councilAiSearchJsonResponse(await loadCouncilBillPage(input), 200);
  } catch (error) {
    return councilAiSearchErrorResponse(error);
  }
}
