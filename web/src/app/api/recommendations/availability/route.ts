import { getRecommendationAvailability } from "@/features/recommendations/server/services/recommendation-availability-service";

export async function GET() {
  const availability = await getRecommendationAvailability();
  return new Response(JSON.stringify(availability), {
    status: 200,
    headers: {
      "Cache-Control":
        "public, max-age=60, s-maxage=600, stale-while-revalidate=86400",
      "Content-Type": "application/json",
    },
  });
}
