import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import {
  findRecommendationBillsByIds,
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

  const daily = await getOrCreateDailyRecommendations(profile, input.date);
  const [bills, pushEnabled] = await Promise.all([
    findRecommendationBillsByIds(daily.bill_ids, input.difficultyLevel),
    isPushEnabled(profile.id),
  ]);

  return {
    recommendationDate: daily.recommendation_date,
    bills,
    selectedSmallTags: profile.selected_small_tags,
    selectedParentCategoryIds: profile.selected_parent_category_ids,
    preferenceVersion: profile.preference_version,
    pushEnabled,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
  };
}
