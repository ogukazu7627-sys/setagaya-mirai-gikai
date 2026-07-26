import { processCouncilSearchIndexJobs } from "@/features/bills/server/services/council-search-index-service";
import { councilAiSearchJsonResponse } from "@/features/bills/server/utils/council-ai-search-response";

export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
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
