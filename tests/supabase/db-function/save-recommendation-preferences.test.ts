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

describe("save_recommendation_preferences()", () => {
  it("creates a profile and only increments the version when preferences change", async () => {
    const installationId = crypto.randomUUID();
    installationIds.push(installationId);

    const first = await adminClient.rpc("save_recommendation_preferences", {
      p_installation_id: installationId,
      p_selected_small_tags: ["不登校支援", "学校改築", "防災情報"],
      p_selected_parent_category_ids: ["education", "disaster-prevention"],
      p_timezone: "Asia/Tokyo",
    });
    expect(first.error).toBeNull();
    expect(first.data?.preference_version).toBe(1);

    const unchanged = await adminClient.rpc("save_recommendation_preferences", {
      p_installation_id: installationId,
      p_selected_small_tags: ["不登校支援", "学校改築", "防災情報"],
      p_selected_parent_category_ids: ["education", "disaster-prevention"],
      p_timezone: "Asia/Tokyo",
    });
    expect(unchanged.data?.preference_version).toBe(1);

    const changed = await adminClient.rpc("save_recommendation_preferences", {
      p_installation_id: installationId,
      p_selected_small_tags: ["保育所", "一時預かり", "居場所"],
      p_selected_parent_category_ids: ["child-rearing"],
      p_timezone: "Asia/Tokyo",
    });
    expect(changed.error).toBeNull();
    expect(changed.data?.preference_version).toBe(2);
  });

  it("accepts more than three interests across more than three categories", async () => {
    const installationId = crypto.randomUUID();
    installationIds.push(installationId);

    const result = await adminClient.rpc("save_recommendation_preferences", {
      p_installation_id: installationId,
      p_selected_small_tags: [
        "不登校支援",
        "学校改築",
        "防災情報",
        "保育所",
        "介護福祉",
        "公園整備",
      ],
      p_selected_parent_category_ids: [
        "education",
        "disaster-prevention",
        "child-rearing",
        "welfare",
        "urban-development",
      ],
      p_timezone: "Asia/Tokyo",
    });

    expect(result.error).toBeNull();
    expect(result.data?.selected_small_tags).toHaveLength(6);
  });

  it("rejects duplicate selections at the DB boundary", async () => {
    const installationId = crypto.randomUUID();
    installationIds.push(installationId);
    const result = await adminClient.rpc("save_recommendation_preferences", {
      p_installation_id: installationId,
      p_selected_small_tags: ["不登校支援", "不登校支援", "防災情報"],
      p_selected_parent_category_ids: ["education", "disaster-prevention"],
      p_timezone: "Asia/Tokyo",
    });
    expect(result.error).not.toBeNull();
  });

  it("still rejects fewer than three interests at the DB boundary", async () => {
    const installationId = crypto.randomUUID();
    installationIds.push(installationId);
    const result = await adminClient.rpc("save_recommendation_preferences", {
      p_installation_id: installationId,
      p_selected_small_tags: ["不登校支援", "学校改築"],
      p_selected_parent_category_ids: ["education"],
      p_timezone: "Asia/Tokyo",
    });
    expect(result.error).not.toBeNull();
  });
});
