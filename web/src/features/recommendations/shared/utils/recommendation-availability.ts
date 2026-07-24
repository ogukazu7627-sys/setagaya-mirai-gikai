import {
  RECOMMENDATION_SMALL_TAGS,
  type RecommendationSmallTag,
} from "../constants/recommendation-taxonomy";
import type {
  RecommendationAvailability,
  RecommendationCandidate,
} from "../types/recommendation";

export function buildRecommendationAvailability(
  candidates: readonly RecommendationCandidate[]
): RecommendationAvailability {
  const availability = Object.fromEntries(
    RECOMMENDATION_SMALL_TAGS.map((tag) => [tag, 0])
  ) as RecommendationAvailability;

  for (const candidate of candidates) {
    for (const tag of new Set(candidate.tags)) {
      availability[tag] += 1;
    }
  }

  return availability;
}

export function getAvailableTags(
  availability: RecommendationAvailability
): RecommendationSmallTag[] {
  return RECOMMENDATION_SMALL_TAGS.filter((tag) => availability[tag] > 0);
}
