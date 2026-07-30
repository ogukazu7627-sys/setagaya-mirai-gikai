import { searchBudgetPrograms } from "@/features/budget/server/services/budget-query-service";
import {
  budgetApiErrorResponse,
  budgetApiJsonResponse,
} from "@/features/budget/server/utils/budget-api-response";
import { BUDGET_SEARCH_ANONYMOUS_RATE_LIMIT } from "@/features/budget/shared/constants/budget";
import { budgetProgramSearchRequestSchema } from "@/features/budget/shared/utils/budget-search-schema";
import { consumeAnonymousRateLimit } from "@/lib/api/anonymous-rate-limit";
import { assertSameOrigin, parseBoundedJson } from "@/lib/api/bounded-json";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const input = await parseBoundedJson(
      request,
      budgetProgramSearchRequestSchema
    );
    const allowed = await consumeAnonymousRateLimit({
      request,
      installationId: input.installationId,
      routeKey: "budget-search",
      windowMs: BUDGET_SEARCH_ANONYMOUS_RATE_LIMIT.windowMs,
      installationLimit: BUDGET_SEARCH_ANONYMOUS_RATE_LIMIT.installationLimit,
      ipLimit: BUDGET_SEARCH_ANONYMOUS_RATE_LIMIT.ipLimit,
    });
    if (!allowed) {
      return budgetApiJsonResponse(
        {
          error: "検索回数が多すぎます。少し待ってからお試しください",
          code: "rate-limited",
        },
        429
      );
    }

    const { installationId: _installationId, ...searchInput } = input;
    return budgetApiJsonResponse(await searchBudgetPrograms(searchInput), 200);
  } catch (error) {
    return budgetApiErrorResponse(error);
  }
}
