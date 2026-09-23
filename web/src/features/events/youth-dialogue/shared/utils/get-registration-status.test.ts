import { describe, expect, it } from "vitest";
import { getRegistrationStatus } from "./get-registration-status";

const startsAt = new Date("2026-10-03T14:00:00+09:00");
const endsAt = new Date("2026-10-03T16:00:00+09:00");

function statusAt(
  now: string,
  overrides: Partial<Parameters<typeof getRegistrationStatus>[0]> = {}
) {
  return getRegistrationStatus({
    now: new Date(now),
    startsAt,
    endsAt,
    registrationClosesAt: null,
    manualStatus: null,
    ...overrides,
  });
}

describe("getRegistrationStatus", () => {
  it("締切も満席もなければ開催前は受付中", () => {
    expect(statusAt("2026-09-23T10:00:00+09:00")).toBe("open");
  });

  it("締切日時を過ぎると受付終了", () => {
    const registrationClosesAt = new Date("2026-10-01T23:59:00+09:00");
    expect(
      statusAt("2026-10-01T23:58:59+09:00", { registrationClosesAt })
    ).toBe("open");
    expect(
      statusAt("2026-10-01T23:59:00+09:00", { registrationClosesAt })
    ).toBe("closed");
  });

  it("運営が満席にすると受付を止める", () => {
    expect(
      statusAt("2026-09-23T10:00:00+09:00", { manualStatus: "full" })
    ).toBe("full");
  });

  it("開始時刻を過ぎると満席の設定より受付終了を優先する", () => {
    expect(
      statusAt("2026-10-03T14:00:00+09:00", { manualStatus: "full" })
    ).toBe("closed");
  });

  it("終了時刻を過ぎると開催終了", () => {
    expect(statusAt("2026-10-03T16:00:00+09:00")).toBe("ended");
  });
});
