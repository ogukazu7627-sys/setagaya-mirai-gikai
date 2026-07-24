import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import {
  getRecommendationCategoryById,
  isRecommendationCategoryId,
} from "../../shared/constants/recommendation-taxonomy";
import {
  findImpressedBillIds,
  findRecommendationBillsByIds,
  findRecommendationCandidates,
  findRecommendationProfileByInstallationId,
  isPushEnabled,
} from "../repositories/recommendation-repository";
import {
  getOrCreateDailyRecommendations,
  RecommendationProfileNotFoundError,
} from "./daily-recommendation-service";

export async function getTodayRecommendations(input: {
  installationId: string;
  date: string;
  difficultyLevel: DifficultyLevelEnum;
}) {
  const profile = await findRecommendationProfileByInstallationId(
    input.installationId
  );
  if (!profile) {
    throw new RecommendationProfileNotFoundError();
  }

  const daily = await getOrCreateDailyRecommendations(profile.id, input.date);
  const [bills, pushEnabled, candidates, impressions] = await Promise.all([
    findRecommendationBillsByIds(daily.bill_ids, input.difficultyLevel),
    isPushEnabled(profile.id),
    findRecommendationCandidates(),
    findImpressedBillIds(profile.id),
  ]);
  const dailyBillIds = new Set(daily.bill_ids);
  const parentTagSet = new Set(
    profile.selected_parent_category_ids
      .filter(isRecommendationCategoryId)
      .flatMap(
        (categoryId) =>
          getRecommendationCategoryById(categoryId)?.smallTags ?? []
      )
  );
  const hasRemainingCandidates = candidates.some(
    (candidate) =>
      !impressions.has(candidate.id) &&
      !dailyBillIds.has(candidate.id) &&
      candidate.tags.some((tag) => parentTagSet.has(tag))
  );

  return {
    recommendationDate: daily.recommendation_date,
    bills,
    hasRemainingCandidates,
    selectedSmallTags: profile.selected_small_tags,
    selectedParentCategoryIds: profile.selected_parent_category_ids,
    preferenceVersion: profile.preference_version,
    pushEnabled,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
  };
}
