import { describe, expect, it } from "vitest";
import {
  COMMITTEE_KIND_LABELS,
  getCommitteeProfile,
  PUBLIC_COMMITTEE_NAMES,
} from "./committee-profiles";

describe("committee profiles", () => {
  it("covers every public Setagaya committee", () => {
    expect(PUBLIC_COMMITTEE_NAMES).toHaveLength(10);

    for (const name of PUBLIC_COMMITTEE_NAMES) {
      const profile = getCommitteeProfile(name);
      expect(profile.name).toBe(name);
      expect(profile.summary.length).toBeGreaterThan(0);
      expect(profile.responsibilities.length).toBeGreaterThan(0);
      expect(COMMITTEE_KIND_LABELS[profile.kind]).toBeTruthy();
    }
  });

  it("falls back safely when a committee master is added first", () => {
    expect(getCommitteeProfile("新しい特別委員会")).toMatchObject({
      name: "新しい特別委員会",
      kind: "special",
    });
  });
});
