import { describe, expect, it } from "vitest";
import {
  COUNCILOR_OFFICIAL_ROSTER_AS_OF,
  COUNCILOR_OFFICIAL_ROSTER_SOURCES,
  COUNCILOR_PROFILE_CATALOG,
  COUNCILOR_PROFILE_SUMMARY_AS_OF,
  getCouncilorProfile,
} from "./councilor-profile-catalog";

describe("councilor profile catalog", () => {
  it("contains one reviewed affiliation and profile for all 50 councilors", () => {
    expect(COUNCILOR_PROFILE_CATALOG).toHaveLength(50);
    expect(
      new Set(
        COUNCILOR_PROFILE_CATALOG.map(({ normalizedName }) => normalizedName)
      ).size
    ).toBe(50);

    for (const profile of COUNCILOR_PROFILE_CATALOG) {
      expect(profile.normalizedName).not.toBe("");
      expect(profile.factionName).not.toBe("");
      expect(profile.summary).toMatch(/^このサイトに掲載中の質問では、/);
      expect(profile.themes.length).toBeGreaterThan(0);
      expect(profile.themes.length).toBeLessThanOrEqual(3);
      expect(new Set(profile.themes).size).toBe(profile.themes.length);
      expect(profile.questionCount).toBeGreaterThan(0);
      expect(profile.summaryAsOf).toBe(COUNCILOR_PROFILE_SUMMARY_AS_OF);

      const sentenceCount = profile.summary?.match(/。/g)?.length ?? 0;
      expect(sentenceCount).toBeGreaterThanOrEqual(2);
      expect(sentenceCount).toBeLessThanOrEqual(3);
    }
  });

  it("keeps the reviewed question counts aligned with the generation snapshot", () => {
    expect(
      COUNCILOR_PROFILE_CATALOG.reduce(
        (total, profile) => total + (profile.questionCount ?? 0),
        0
      )
    ).toBe(1170);
    expect(getCouncilorProfile("いたいひとし")?.questionCount).toBe(23);
    expect(getCouncilorProfile("おぎのけんじ")?.questionCount).toBe(24);
    expect(getCouncilorProfile("オルズグル")?.questionCount).toBe(11);
  });

  it("uses the official 2026-08-25 roster and preserves current faction names", () => {
    expect(COUNCILOR_OFFICIAL_ROSTER_AS_OF).toBe("2026-08-25");
    expect(COUNCILOR_OFFICIAL_ROSTER_SOURCES).toEqual({
      factions: "https://www.city.setagaya.lg.jp/02030/9511.html",
      committees: "https://www.city.setagaya.lg.jp/02030/9510.html",
    });
    expect(getCouncilorProfile("おぎのけんじ")?.factionName).toBe(
      "世田谷自民の会"
    );
    expect(getCouncilorProfile("未登録議員")).toBeNull();
  });
});
