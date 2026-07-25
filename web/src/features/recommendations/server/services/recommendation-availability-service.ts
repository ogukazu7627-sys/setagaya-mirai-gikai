import "server-only";

import { getSetagayaMockBills, isSetagayaMockMode } from "@/lib/setagaya-mock";
import {
  normalizeRecommendationTag,
  type RecommendationSmallTag,
} from "../../shared/constants/recommendation-taxonomy";
import type { RecommendationCandidate } from "../../shared/types/recommendation";
import { buildRecommendationAvailability } from "../../shared/utils/recommendation-availability";
import { findRecommendationCandidates } from "../repositories/recommendation-repository";

export async function getRecommendationAvailability() {
  try {
    const candidates = isSetagayaMockMode
      ? getMockRecommendationCandidates()
      : await findRecommendationCandidates();
    return buildRecommendationAvailability(candidates);
  } catch {
    console.error("Failed to load recommendation availability");
    return buildRecommendationAvailability([]);
  }
}

function getMockRecommendationCandidates(): RecommendationCandidate[] {
  return getSetagayaMockBills("normal")
    .map((bill) => ({
      id: bill.id,
      tags: Array.from(
        new Set(
          (bill.tags ?? [])
            .map((tag) => normalizeRecommendationTag(tag.label))
            .filter((tag): tag is RecommendationSmallTag => tag != null)
        )
      ),
    }))
    .filter((candidate) => candidate.tags.length > 0);
}
