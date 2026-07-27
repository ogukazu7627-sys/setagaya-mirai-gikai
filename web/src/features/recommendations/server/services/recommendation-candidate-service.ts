import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { findRecommendationCandidates } from "../repositories/recommendation-repository";

const getCachedRecommendationCandidates = unstable_cache(
  findRecommendationCandidates,
  ["recommendation-candidates"],
  {
    revalidate: 600,
    tags: [CACHE_TAGS.BILLS],
  }
);

export function getRecommendationCandidates() {
  if (process.env.NODE_ENV === "test") {
    return findRecommendationCandidates();
  }
  return getCachedRecommendationCandidates();
}
