import { afterEach, describe, expect, it } from "vitest";
import { adminClient } from "../utils";

const installationIds: string[] = [];

afterEach(async () => {
  if (installationIds.length > 0) {
    await adminClient
      .from("recommendation_profiles")
      .delete()
      .in("installation_id", installationIds);
    installationIds.length = 0;
  }
});

describe("claim_daily_push_subscriptions()", () => {
  it("moves an existing browser endpoint to a replacement anonymous profile", async () => {
    const firstInstallationId = crypto.randomUUID();
    const replacementInstallationId = crypto.randomUUID();
    installationIds.push(firstInstallationId, replacementInstallationId);
    const [first, replacement] = await Promise.all([
      createProfile(firstInstallationId),
      createProfile(replacementInstallationId),
    ]);
    const endpoint = `https://push.example.test/${crypto.randomUUID()}`;

    const firstSave = await adminClient.rpc("save_push_subscription", {
      p_profile_id: first.id,
      p_endpoint: endpoint,
      p_p256dh: "p".repeat(32),
      p_auth: "a".repeat(16),
    });
    expect(firstSave.error).toBeNull();

    const replacementSave = await adminClient.rpc("save_push_subscription", {
      p_profile_id: replacement.id,
      p_endpoint: endpoint,
      p_p256dh: "q".repeat(32),
      p_auth: "b".repeat(16),
    });
    expect(replacementSave.error).toBeNull();

    const rows = await adminClient
      .from("push_subscriptions")
      .select("profile_id, p256dh")
      .eq("endpoint", endpoint);
    expect(rows.data).toEqual([
      {
        profile_id: replacement.id,
        p256dh: "q".repeat(32),
      },
    ]);
  });

  it("claims an enabled subscription only once per recommendation date", async () => {
    const installationId = crypto.randomUUID();
    installationIds.push(installationId);
    const saved = await createProfile(installationId);

    await adminClient.from("push_subscriptions").insert({
      profile_id: saved.id,
      endpoint: `https://push.example.test/${crypto.randomUUID()}`,
      p256dh: "p".repeat(32),
      auth: "a".repeat(16),
    });

    const first = await adminClient.rpc("claim_daily_push_subscriptions", {
      p_recommendation_date: "2026-07-25",
      p_limit: 100,
    });
    const claimedProfileIds = first.data?.map((row) => row.profile_id) ?? [];
    expect(claimedProfileIds).toContain(saved.id);

    const second = await adminClient.rpc("claim_daily_push_subscriptions", {
      p_recommendation_date: "2026-07-25",
      p_limit: 100,
    });
    expect(second.data?.map((row) => row.profile_id)).not.toContain(saved.id);
  });
});

async function createProfile(installationId: string) {
  const saved = await adminClient.rpc("save_recommendation_preferences", {
    p_installation_id: installationId,
    p_selected_small_tags: ["不登校支援", "学校改築", "防災情報"],
    p_selected_parent_category_ids: ["education", "disaster-prevention"],
    p_timezone: "Asia/Tokyo",
  });
  if (!saved.data) throw new Error("profile setup failed");
  return saved.data;
}
