import { describe, expect, it, vi } from "vitest";
import type { StoredRecommendationProfile } from "../../shared/types/recommendation";
import {
  canPersistRecommendationProfile,
  createAnonymousInstallationId,
  RECOMMENDATION_PROFILE_STORAGE_KEY,
  readRecommendationProfile,
  writeRecommendationProfile,
} from "./recommendation-storage";

const profile: StoredRecommendationProfile = {
  installationId: "11111111-1111-4111-8111-111111111111",
  selectedParentCategoryIds: ["education", "disaster-prevention"],
  selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
  completedAt: "2026-07-25T00:00:00.000Z",
  preferenceVersion: 1,
};

describe("recommendation storage", () => {
  it("round-trips a valid versioned profile", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    expect(writeRecommendationProfile(storage, profile)).toBe(true);
    expect(readRecommendationProfile(storage)).toEqual({
      status: "valid",
      profile,
    });
  });

  it("rejects invalid or unavailable storage without throwing", () => {
    expect(
      readRecommendationProfile({
        getItem: () => JSON.stringify({ installationId: "bad" }),
      })
    ).toEqual({ status: "invalid", profile: null });
    expect(
      readRecommendationProfile({
        getItem: () => {
          throw new Error("blocked");
        },
      })
    ).toEqual({ status: "unavailable", profile: null });
  });

  it("checks write availability with a removable probe", () => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    expect(canPersistRecommendationProfile({ setItem, removeItem })).toBe(true);
    expect(setItem).toHaveBeenCalledWith(
      `${RECOMMENDATION_PROFILE_STORAGE_KEY}:probe`,
      "1"
    );
    expect(removeItem).toHaveBeenCalled();
  });
});

describe("createAnonymousInstallationId", () => {
  it("uses randomUUID when available", () => {
    expect(
      createAnonymousInstallationId({
        randomUUID: () => "11111111-1111-4111-8111-111111111111",
        getRandomValues: ((array: Uint8Array) =>
          array) as Crypto["getRandomValues"],
      })
    ).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("creates an RFC 4122 v4 UUID from secure random bytes", () => {
    const id = createAnonymousInstallationId({
      getRandomValues: ((array: Uint8Array) => {
        array.fill(1);
        return array;
      }) as Crypto["getRandomValues"],
    });
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
