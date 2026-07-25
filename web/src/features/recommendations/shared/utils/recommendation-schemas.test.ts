import { describe, expect, it } from "vitest";
import {
  impressionRequestSchema,
  preferenceRequestSchema,
  pushSubscriptionRequestSchema,
} from "./recommendation-schemas";

const installationId = "11111111-1111-4111-8111-111111111111";

describe("preferenceRequestSchema", () => {
  it("accepts exactly three canonical tags and derives parent IDs", () => {
    expect(
      preferenceRequestSchema.parse({
        installationId,
        selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
        timezone: "Asia/Tokyo",
      })
    ).toMatchObject({
      selectedParentCategoryIds: ["education", "disaster-prevention"],
    });
  });

  it("rejects a non-canonical, duplicate, or wrong-size tag selection", () => {
    expect(
      preferenceRequestSchema.safeParse({
        installationId,
        selectedSmallTags: ["学校", "学校改築", "防災情報"],
        timezone: "Asia/Tokyo",
      }).success
    ).toBe(false);
    expect(
      preferenceRequestSchema.safeParse({
        installationId,
        selectedSmallTags: ["不登校支援", "不登校支援", "防災情報"],
        timezone: "Asia/Tokyo",
      }).success
    ).toBe(false);
    expect(
      preferenceRequestSchema.safeParse({
        installationId,
        selectedSmallTags: ["不登校支援", "防災情報"],
        timezone: "Asia/Tokyo",
      }).success
    ).toBe(false);
  });
});

describe("impressionRequestSchema", () => {
  it("only accepts up to five unique public-format IDs from homepage", () => {
    expect(
      impressionRequestSchema.safeParse({
        installationId,
        billIds: [installationId],
        source: "homepage",
      }).success
    ).toBe(true);
    expect(
      impressionRequestSchema.safeParse({
        installationId,
        billIds: [installationId],
        source: "push",
      }).success
    ).toBe(false);
  });
});

describe("pushSubscriptionRequestSchema", () => {
  it("requires an HTTPS endpoint and bounded browser keys", () => {
    expect(
      pushSubscriptionRequestSchema.safeParse({
        installationId,
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/subscription",
          keys: {
            p256dh: "p".repeat(32),
            auth: "a".repeat(16),
          },
        },
      }).success
    ).toBe(true);
    expect(
      pushSubscriptionRequestSchema.safeParse({
        installationId,
        subscription: {
          endpoint: "http://fcm.googleapis.com/fcm/send/subscription",
          keys: {
            p256dh: "p".repeat(32),
            auth: "a".repeat(16),
          },
        },
      }).success
    ).toBe(false);
  });
});
