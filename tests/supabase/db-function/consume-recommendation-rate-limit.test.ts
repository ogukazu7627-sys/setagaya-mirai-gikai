import { afterEach, describe, expect, it } from "vitest";
import { adminClient } from "../utils";

const keyHashes: string[] = [];

afterEach(async () => {
  if (keyHashes.length > 0) {
    await adminClient
      .from("recommendation_api_rate_limits")
      .delete()
      .in("key_hash", keyHashes);
    keyHashes.length = 0;
  }
});

describe("consume_recommendation_rate_limit()", () => {
  it("atomically allows requests through the limit and rejects the next one", async () => {
    const keyHash = crypto.randomUUID().replaceAll("-", "").repeat(2);
    keyHashes.push(keyHash);
    const args = {
      p_key_hash: keyHash,
      p_route_key: "test-route",
      p_window_start: "2026-07-25T00:00:00.000Z",
      p_limit: 2,
    };

    const first = await adminClient.rpc(
      "consume_recommendation_rate_limit",
      args
    );
    const second = await adminClient.rpc(
      "consume_recommendation_rate_limit",
      args
    );
    const third = await adminClient.rpc(
      "consume_recommendation_rate_limit",
      args
    );

    expect(first.data).toBe(true);
    expect(second.data).toBe(true);
    expect(third.data).toBe(false);
  });

  it("removes expired short-term rate-limit rows", async () => {
    const expiredKeyHash = crypto.randomUUID().replaceAll("-", "").repeat(2);
    const currentKeyHash = crypto.randomUUID().replaceAll("-", "").repeat(2);
    keyHashes.push(expiredKeyHash, currentKeyHash);
    const { error: insertError } = await adminClient
      .from("recommendation_api_rate_limits")
      .insert({
        key_hash: expiredKeyHash,
        route_key: "expired-test-route",
        window_start: "2000-01-01T00:00:00.000Z",
        updated_at: "2000-01-01T00:00:00.000Z",
      });
    if (insertError) {
      throw insertError;
    }

    await adminClient.rpc("consume_recommendation_rate_limit", {
      p_key_hash: currentKeyHash,
      p_route_key: "current-test-route",
      p_window_start: new Date().toISOString(),
      p_limit: 1,
    });

    const { count } = await adminClient
      .from("recommendation_api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key_hash", expiredKeyHash);
    expect(count).toBe(0);
  });
});
