import "server-only";

import type { Database } from "@mirai-gikai/supabase";
import {
  isRecommendationCategoryId,
  isRecommendationSmallTag,
  MIN_SELECTED_SMALL_TAGS,
  type RecommendationCategoryId,
  type RecommendationSmallTag,
} from "../../shared/constants/recommendation-taxonomy";
import type { RecommendationPick } from "../../shared/types/recommendation";
import { isJstDateKey } from "../../shared/utils/jst-date";
import { selectDailyRecommendations } from "../../shared/utils/select-daily-recommendations";
import {
  findDailyRecommendation,
  findImpressedBillIds,
  findRecommendationProfileById,
  insertDailyRecommendation,
  type RecommendationProfileRow,
  updateDailyRecommendationPicks,
} from "../repositories/recommendation-repository";
import { getRecommendationCandidates } from "./recommendation-candidate-service";

type DailyRecommendationRow =
  Database["public"]["Tables"]["daily_recommendations"]["Row"];

export async function getOrCreateDailyRecommendations(
  profile: RecommendationProfileRow,
  date: string
): Promise<DailyRecommendationRow> {
  if (!isJstDateKey(date)) {
    throw new Error("Invalid JST recommendation date");
  }

  const existing = await findDailyRecommendation(
    profile.id,
    date,
    profile.preference_version
  );
  if (existing && existing.bill_ids.length > 0) {
    return existing;
  }

  const picks = await selectRecommendationsForProfile(profile, date);
  if (existing) {
    if (picks.length === 0) {
      return existing;
    }
    return updateDailyRecommendationPicks({
      dailyRecommendationId: existing.id,
      picks,
    });
  }

  const inserted = await insertDailyRecommendation({
    profileId: profile.id,
    date,
    preferenceVersion: profile.preference_version,
    picks,
  });

  if (inserted) {
    return inserted;
  }

  const winner = await findDailyRecommendation(
    profile.id,
    date,
    profile.preference_version
  );
  if (!winner) {
    throw new Error("Failed to resolve concurrent daily recommendation");
  }
  return winner;
}

async function selectRecommendationsForProfile(
  profile: RecommendationProfileRow,
  date: string
): Promise<RecommendationPick[]> {
  const selectedSmallTags = profile.selected_small_tags.filter(
    isRecommendationSmallTag
  ) as RecommendationSmallTag[];
  const selectedParentCategoryIds = profile.selected_parent_category_ids.filter(
    isRecommendationCategoryId
  ) as RecommendationCategoryId[];
  if (
    selectedSmallTags.length < MIN_SELECTED_SMALL_TAGS ||
    selectedParentCategoryIds.length === 0
  ) {
    throw new Error("Recommendation profile contains invalid preferences");
  }

  const [candidates, displayedBillIds] = await Promise.all([
    getRecommendationCandidates(),
    findImpressedBillIds(profile.id),
  ]);
  const picks = selectDailyRecommendations({
    candidates,
    selectedSmallTags,
    selectedParentCategoryIds,
    displayedBillIds,
    seed: `${profile.id}:${date}:${profile.preference_version}`,
  });
  return picks;
}

export async function getOrCreateDailyRecommendationsByProfileId(
  profileId: string,
  date: string
): Promise<DailyRecommendationRow> {
  const profile = await findRecommendationProfileById(profileId);
  if (!profile) {
    throw new RecommendationProfileNotFoundError();
  }
  return getOrCreateDailyRecommendations(profile, date);
}

export class RecommendationProfileNotFoundError extends Error {
  constructor() {
    super("Recommendation profile not found");
    this.name = "RecommendationProfileNotFoundError";
  }
}
