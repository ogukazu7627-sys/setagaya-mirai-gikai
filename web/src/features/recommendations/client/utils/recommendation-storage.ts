import {
  getParentCategoryIdsForTags,
  isRecommendationCategoryId,
  isRecommendationSmallTag,
} from "../../shared/constants/recommendation-taxonomy";
import type { StoredRecommendationProfile } from "../../shared/types/recommendation";

export const RECOMMENDATION_PROFILE_STORAGE_KEY =
  "mirai-gikai:recommendation-profile:v1";

export type StoredProfileReadResult =
  | { status: "valid"; profile: StoredRecommendationProfile }
  | { status: "missing" | "invalid" | "unavailable"; profile: null };

export function getBrowserRecommendationStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readRecommendationProfile(
  storage: Pick<Storage, "getItem">
): StoredProfileReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(RECOMMENDATION_PROFILE_STORAGE_KEY);
  } catch {
    return { status: "unavailable", profile: null };
  }
  if (!raw) {
    return { status: "missing", profile: null };
  }

  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!isStoredProfile(value)) {
      return { status: "invalid", profile: null };
    }
    return { status: "valid", profile: value };
  } catch {
    return { status: "invalid", profile: null };
  }
}

export function writeRecommendationProfile(
  storage: Pick<Storage, "setItem">,
  profile: StoredRecommendationProfile
): boolean {
  try {
    storage.setItem(
      RECOMMENDATION_PROFILE_STORAGE_KEY,
      JSON.stringify(profile)
    );
    return true;
  } catch {
    return false;
  }
}

export function removeRecommendationProfile(
  storage: Pick<Storage, "removeItem">
): boolean {
  try {
    storage.removeItem(RECOMMENDATION_PROFILE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function canPersistRecommendationProfile(
  storage: Pick<Storage, "setItem" | "removeItem">
): boolean {
  const probeKey = `${RECOMMENDATION_PROFILE_STORAGE_KEY}:probe`;
  try {
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function createAnonymousInstallationId(
  cryptoApi: Pick<Crypto, "getRandomValues"> & {
    randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
  }
): string {
  if (typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function isStoredProfile(
  value: Record<string, unknown>
): value is StoredRecommendationProfile {
  const selectedSmallTags = value.selectedSmallTags;
  const selectedParentCategoryIds = value.selectedParentCategoryIds;
  if (
    typeof value.installationId !== "string" ||
    !isUuid(value.installationId) ||
    !Array.isArray(selectedSmallTags) ||
    selectedSmallTags.length !== 3 ||
    !selectedSmallTags.every(
      (tag) => typeof tag === "string" && isRecommendationSmallTag(tag)
    ) ||
    new Set(selectedSmallTags).size !== 3 ||
    !Array.isArray(selectedParentCategoryIds) ||
    !selectedParentCategoryIds.every(
      (id) => typeof id === "string" && isRecommendationCategoryId(id)
    ) ||
    typeof value.completedAt !== "string" ||
    Number.isNaN(Date.parse(value.completedAt)) ||
    !Number.isInteger(value.preferenceVersion) ||
    Number(value.preferenceVersion) < 1
  ) {
    return false;
  }

  const expectedParentIds = getParentCategoryIdsForTags(selectedSmallTags);
  return (
    expectedParentIds.length === selectedParentCategoryIds.length &&
    expectedParentIds.every((id) => selectedParentCategoryIds.includes(id))
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
