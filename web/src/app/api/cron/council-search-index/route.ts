import { processCouncilSearchIndexJobs } from "@/features/bills/server/services/council-search-index-service";
import { councilAiSearchJsonResponse } from "@/features/bills/server/utils/council-ai-search-response";
import { isCouncilSearchIndexRequestAuthorized } from "@/features/bills/server/utils/council-search-index-auth";

export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  if (!(await isCouncilSearchIndexRequestAuthorized(request))) {
    return councilAiSearchJsonResponse(
      { error: "Unauthorized", code: "unauthorized" },
      401
    );
  }

  try {
    const result = await processCouncilSearchIndexJobs({
      limit: 20,
      concurrency: 4,
    });
    return councilAiSearchJsonResponse(result, 200);
  } catch {
    console.error("Council search index cron failed");
    return councilAiSearchJsonResponse(
      { error: "Index update failed", code: "index-update-failed" },
      500
    );
  }
}
