import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { getRandomRecommendations } from "@/features/recommendations/server/services/random-recommendation-service";
import { recommendationApiErrorResponse } from "@/features/recommendations/server/utils/recommendation-api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const difficultyLevel = await getDifficultyLevel();
    const result = await getRandomRecommendations({ difficultyLevel });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return recommendationApiErrorResponse(error);
  }
}
