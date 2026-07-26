import { syncCouncilorXPosts } from "@/features/councilor-x-posts/server/services/councilor-x-post-sync-service";
import { jsonResponse } from "@/lib/api/response";

export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
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
