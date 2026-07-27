import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import {
  isRecommendationCategoryId,
  isRecommendationSmallTag,
} from "../../shared/constants/recommendation-taxonomy";
import type { TodayRecommendationsResponse } from "../../shared/types/recommendation";

export const TODAY_RECOMMENDATIONS_CACHE_KEY =
  "mirai-gikai:today-recommendations:v1";
export const TODAY_RECOMMENDATIONS_REVALIDATE_MS = 5 * 60 * 1000;

type TodayRecommendationsCacheIdentity = {
  installationId: string;
  preferenceVersion: number;
  difficultyLevel: DifficultyLevelEnum;
  recommendationDate: string;
};

type StoredTodayRecommendations = TodayRecommendationsCacheIdentity & {
  cachedAt: string;
  data: TodayRecommendationsResponse;
};

export type TodayRecommendationsCacheEntry = Pick<
  StoredTodayRecommendations,
  "cachedAt" | "data"
>;

export function readTodayRecommendationsCache(
  storage: Pick<Storage, "getItem">,
  identity: TodayRecommendationsCacheIdentity
): TodayRecommendationsCacheEntry | null {
  try {
    const raw = storage.getItem(TODAY_RECOMMENDATIONS_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const value = JSON.parse(raw) as unknown;
    if (!isStoredTodayRecommendations(value, identity)) {
      return null;
    }
    return {
      cachedAt: value.cachedAt,
      data: value.data,
    };
  } catch {
    return null;
  }
}

export function isTodayRecommendationsCacheFresh(
  entry: TodayRecommendationsCacheEntry,
  now = Date.now()
): boolean {
  const cachedAt = Date.parse(entry.cachedAt);
  return (
    cachedAt <= now && now - cachedAt < TODAY_RECOMMENDATIONS_REVALIDATE_MS
  );
}

export function writeTodayRecommendationsCache(
  storage: Pick<Storage, "setItem">,
  identity: Omit<TodayRecommendationsCacheIdentity, "recommendationDate">,
  data: TodayRecommendationsResponse
): boolean {
  const value: StoredTodayRecommendations = {
    ...identity,
    recommendationDate: data.recommendationDate,
    cachedAt: new Date().toISOString(),
    data,
  };
  try {
    storage.setItem(TODAY_RECOMMENDATIONS_CACHE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeTodayRecommendationsCache(
  storage: Pick<Storage, "removeItem">
): boolean {
  try {
    storage.removeItem(TODAY_RECOMMENDATIONS_CACHE_KEY);
    return true;
  } catch {
    return false;
  }
}

function isStoredTodayRecommendations(
  value: unknown,
  identity: TodayRecommendationsCacheIdentity
): value is StoredTodayRecommendations {
  if (!isRecord(value) || !isTodayRecommendationsResponse(value.data)) {
    return false;
  }
  return (
    value.installationId === identity.installationId &&
    value.preferenceVersion === identity.preferenceVersion &&
    value.difficultyLevel === identity.difficultyLevel &&
    value.recommendationDate === identity.recommendationDate &&
    value.data.recommendationDate === identity.recommendationDate &&
    value.data.preferenceVersion === identity.preferenceVersion &&
    typeof value.cachedAt === "string" &&
    !Number.isNaN(Date.parse(value.cachedAt))
  );
}

function isTodayRecommendationsResponse(
  value: unknown
): value is TodayRecommendationsResponse {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.recommendationDate === "string" &&
    Array.isArray(value.bills) &&
    value.bills.every(
      (bill) =>
        isRecord(bill) &&
        typeof bill.id === "string" &&
        typeof bill.name === "string" &&
        Array.isArray(bill.tags)
    ) &&
    Array.isArray(value.selectedSmallTags) &&
    value.selectedSmallTags.length === 3 &&
    value.selectedSmallTags.every(
      (tag) => typeof tag === "string" && isRecommendationSmallTag(tag)
    ) &&
    Array.isArray(value.selectedParentCategoryIds) &&
    value.selectedParentCategoryIds.every(
      (id) => typeof id === "string" && isRecommendationCategoryId(id)
    ) &&
    Number.isInteger(value.preferenceVersion) &&
    typeof value.pushEnabled === "boolean" &&
    (value.vapidPublicKey === null || typeof value.vapidPublicKey === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
