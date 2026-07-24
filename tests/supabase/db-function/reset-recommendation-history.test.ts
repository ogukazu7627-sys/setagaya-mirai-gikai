import { afterEach, describe, expect, it } from "vitest";
import { adminClient, cleanupTestBill, createTestBill } from "../utils";

let installationId: string | null = null;
let billId: string | null = null;

afterEach(async () => {
  if (installationId) {
    await adminClient
      .from("recommendation_profiles")
      .delete()
      .eq("installation_id", installationId);
  }
  if (billId) {
    await cleanupTestBill(billId);
  }
  installationId = null;
  billId = null;
});

describe("reset_recommendation_history()", () => {
  it("deletes impressions and daily rows while retaining preferences", async () => {
    installationId = crypto.randomUUID();
    const saved = await adminClient.rpc("save_recommendation_preferences", {
      p_installation_id: installationId,
      p_selected_small_tags: ["不登校支援", "学校改築", "防災情報"],
      p_selected_parent_category_ids: ["education", "disaster-prevention"],
      p_timezone: "Asia/Tokyo",
    });
    if (!saved.data) throw new Error("profile setup failed");

    const bill = await createTestBill();
    billId = bill.id;
    await adminClient.from("daily_recommendations").insert({
      profile_id: saved.data.id,
      recommendation_date: "2026-07-25",
      preference_version: saved.data.preference_version,
      bill_ids: [bill.id],
      sources: ["selected-subcategory"],
    });
    await adminClient.from("recommendation_impressions").insert({
      profile_id: saved.data.id,
      bill_id: bill.id,
      display_source: "homepage",
    });

    const reset = await adminClient.rpc("reset_recommendation_history", {
      p_installation_id: installationId,
    });
    expect(reset.error).toBeNull();
    expect(reset.data?.preference_version).toBe(2);
    expect(reset.data?.selected_small_tags).toEqual([
      "不登校支援",
      "学校改築",
      "防災情報",
    ]);

    const [dailyRows, impressionRows] = await Promise.all([
      adminClient
        .from("daily_recommendations")
        .select("id")
        .eq("profile_id", saved.data.id),
      adminClient
        .from("recommendation_impressions")
        .select("bill_id")
        .eq("profile_id", saved.data.id),
    ]);
    expect(dailyRows.data).toEqual([]);
    expect(impressionRows.data).toEqual([]);
  });
});
