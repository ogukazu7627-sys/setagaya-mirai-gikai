import {
  adminClient,
  cleanupTestBill,
  createTestBill,
  createTestBillContent,
  createTestBillTag,
} from "@test-utils/utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendDailyRecommendationPushes } from "./daily-push-service";
import type { WebPushSender } from "./web-push-sender";

const installationIds: string[] = [];
const billIds: string[] = [];

afterEach(async () => {
  if (installationIds.length > 0) {
    await adminClient
      .from("recommendation_profiles")
      .delete()
      .in("installation_id", installationIds);
    installationIds.length = 0;
  }
  for (const billId of billIds) {
    await cleanupTestBill(billId);
  }
  billIds.length = 0;
});

describe("sendDailyRecommendationPushes", () => {
  it("sends once, records only the first title as push impression, and skips a same-day rerun", async () => {
    const { profileId } = await createPushFixture();
    const send = vi.fn().mockResolvedValue(undefined);
    const sender: WebPushSender = { send };

    const first = await sendDailyRecommendationPushes({
      date: "2099-07-25",
      sender,
    });
    expect(first.sent).toBeGreaterThanOrEqual(1);
    expect(send).toHaveBeenCalledTimes(1);

    const { data: daily } = await adminClient
      .from("daily_recommendations")
      .select("bill_ids")
      .eq("profile_id", profileId)
      .eq("recommendation_date", "2099-07-25")
      .single();
    const firstBillId = daily?.bill_ids[0];
    expect(firstBillId).toBeTruthy();

    const { data: impressions } = await adminClient
      .from("recommendation_impressions")
      .select("bill_id, display_source")
      .eq("profile_id", profileId);
    expect(impressions).toEqual([
      {
        bill_id: firstBillId,
        display_source: "push",
      },
    ]);

    const second = await sendDailyRecommendationPushes({
      date: "2099-07-25",
      sender,
    });
    expect(second.sent).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("disables subscriptions that return 410 without exposing keys", async () => {
    const { profileId } = await createPushFixture();
    const sender: WebPushSender = {
      send: vi.fn().mockRejectedValue({ statusCode: 410 }),
    };

    await sendDailyRecommendationPushes({
      date: "2099-07-26",
      sender,
    });
    const { data: subscription } = await adminClient
      .from("push_subscriptions")
      .select("enabled, last_notification_status")
      .eq("profile_id", profileId)
      .single();
    expect(subscription).toEqual({
      enabled: false,
      last_notification_status: "expired",
    });
  });
});

async function createPushFixture() {
  const installationId = crypto.randomUUID();
  installationIds.push(installationId);
  const saved = await adminClient.rpc("save_recommendation_preferences", {
    p_installation_id: installationId,
    p_selected_small_tags: ["不登校支援", "学校改築", "防災情報"],
    p_selected_parent_category_ids: ["education", "disaster-prevention"],
    p_timezone: "Asia/Tokyo",
  });
  if (!saved.data) throw new Error("profile setup failed");

  const bill = await createTestBill({ publish_status: "published" });
  billIds.push(bill.id);
  await createTestBillContent(bill.id, {
    difficulty_level: "normal",
    title: "Push統合テスト案件",
  });
  const { data: tag } = await adminClient
    .from("tags")
    .select("id")
    .eq("label", "不登校支援")
    .single();
  if (!tag) throw new Error("canonical tag not found");
  await createTestBillTag(bill.id, tag.id);
  await adminClient.from("push_subscriptions").insert({
    profile_id: saved.data.id,
    endpoint: `https://push.example.test/${crypto.randomUUID()}`,
    p256dh: "p".repeat(32),
    auth: "a".repeat(16),
  });

  return { profileId: saved.data.id, billId: bill.id };
}
