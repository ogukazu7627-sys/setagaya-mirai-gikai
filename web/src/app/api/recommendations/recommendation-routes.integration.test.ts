import {
  adminClient,
  cleanupTestBill,
  createTestBill,
  createTestBillContent,
  createTestBillTag,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import { POST as recordImpressions } from "./impressions/route";
import { PUT as savePreferences } from "./preferences/route";
import { POST as getToday } from "./today/route";

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
  await adminClient
    .from("recommendation_api_rate_limits")
    .delete()
    .in("route_key", ["preferences", "today", "impressions"]);
});

describe("recommendation API routes", () => {
  it("rejects invalid tag counts, unknown tags, and oversized requests", async () => {
    const installationId = crypto.randomUUID();
    const invalid = await savePreferences(
      request("/api/recommendations/preferences", "PUT", {
        installationId,
        selectedSmallTags: ["不登校支援", "防災情報"],
        timezone: "Asia/Tokyo",
      })
    );
    expect(invalid.status).toBe(400);

    const unknown = await savePreferences(
      request("/api/recommendations/preferences", "PUT", {
        installationId,
        selectedSmallTags: ["不登校支援", "防災情報", "存在しないタグ"],
        timezone: "Asia/Tokyo",
      })
    );
    expect(unknown.status).toBe(400);

    const oversized = await savePreferences(
      new Request("http://localhost:3000/api/recommendations/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ value: "x".repeat(17 * 1024) }),
      })
    );
    expect(oversized.status).toBe(413);
  });

  it("creates one stable daily row under concurrent requests and records impressions idempotently", async () => {
    const installationId = crypto.randomUUID();
    installationIds.push(installationId);
    const bill = await createTestBill({
      publish_status: "published",
      name: "おすすめ統合テスト案件",
    });
    billIds.push(bill.id);
    await createTestBillContent(bill.id, {
      difficulty_level: "normal",
      title: "おすすめ統合テスト",
    });
    const { data: tag, error: tagError } = await adminClient
      .from("tags")
      .select("id")
      .eq("label", "不登校支援")
      .single();
    if (tagError || !tag) throw new Error("canonical tag not found");
    await createTestBillTag(bill.id, tag.id);

    const preferenceResponse = await savePreferences(
      request("/api/recommendations/preferences", "PUT", {
        installationId,
        selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
        timezone: "Asia/Tokyo",
      })
    );
    expect(preferenceResponse.status).toBe(200);

    const [firstResponse, secondResponse] = await Promise.all([
      getToday(
        request("/api/recommendations/today", "POST", { installationId })
      ),
      getToday(
        request("/api/recommendations/today", "POST", { installationId })
      ),
    ]);
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    const firstBody = (await firstResponse.json()) as {
      bills: Array<{ id: string }>;
    };
    const secondBody = (await secondResponse.json()) as {
      bills: Array<{ id: string }>;
    };
    expect(firstBody.bills.map((item) => item.id)).toEqual(
      secondBody.bills.map((item) => item.id)
    );
    expect(firstBody.bills.map((item) => item.id)).toContain(bill.id);

    const { data: profile } = await adminClient
      .from("recommendation_profiles")
      .select("id")
      .eq("installation_id", installationId)
      .single();
    if (!profile) throw new Error("profile not found");
    const { count: dailyCount } = await adminClient
      .from("daily_recommendations")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profile.id);
    expect(dailyCount).toBe(1);

    const impressionBody = {
      installationId,
      billIds: [bill.id],
      source: "homepage",
    };
    const firstImpression = await recordImpressions(
      request("/api/recommendations/impressions", "POST", impressionBody)
    );
    const secondImpression = await recordImpressions(
      request("/api/recommendations/impressions", "POST", impressionBody)
    );
    expect(firstImpression.status).toBe(200);
    expect(secondImpression.status).toBe(200);
    const { count: impressionCount } = await adminClient
      .from("recommendation_impressions")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("bill_id", bill.id);
    expect(impressionCount).toBe(1);
  });

  it("rate limits the eleventh preference mutation in one hour", async () => {
    const installationId = crypto.randomUUID();
    installationIds.push(installationId);
    const responses: Response[] = [];

    for (let index = 0; index < 11; index += 1) {
      responses.push(
        await savePreferences(
          request("/api/recommendations/preferences", "PUT", {
            installationId,
            selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
            timezone: "Asia/Tokyo",
          })
        )
      );
    }

    expect(
      responses.slice(0, 10).every((response) => response.status === 200)
    ).toBe(true);
    expect(responses[10]?.status).toBe(429);
  });

  it("does not allow clients to submit push impressions", async () => {
    const response = await recordImpressions(
      request("/api/recommendations/impressions", "POST", {
        installationId: crypto.randomUUID(),
        billIds: [crypto.randomUUID()],
        source: "push",
      })
    );
    expect(response.status).toBe(400);
  });
});

function request(path: string, method: string, body: unknown): Request {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      "x-forwarded-for": "192.0.2.10",
    },
    body: JSON.stringify(body),
  });
}
