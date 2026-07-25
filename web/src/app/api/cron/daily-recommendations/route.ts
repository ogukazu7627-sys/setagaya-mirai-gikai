import { sendDailyRecommendationPushes } from "@/features/recommendations/server/services/daily-push-service";
import { getJstDateKey } from "@/features/recommendations/shared/utils/jst-date";
import { jsonResponse } from "@/lib/api/response";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const result = await sendDailyRecommendationPushes({
      date: getJstDateKey(),
    });
    return jsonResponse(result, 200);
  } catch {
    console.error("Daily recommendation push cron failed");
    return jsonResponse({ error: "Cron failed" }, 500);
  }
}
