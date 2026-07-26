import { syncCouncilorXPosts } from "@/features/councilor-x-posts/server/services/councilor-x-post-sync-service";
import { isCouncilorXPostSyncRequestAuthorized } from "@/features/councilor-x-posts/server/utils/councilor-x-post-sync-auth";
import { jsonResponse } from "@/lib/api/response";

export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  if (!(await isCouncilorXPostSyncRequestAuthorized(request))) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const result = await syncCouncilorXPosts();
    return jsonResponse(result, 200);
  } catch {
    console.error("Councilor X post sync failed");
    return jsonResponse({ error: "X post sync failed" }, 500);
  }
}
