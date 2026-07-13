import { afterEach, describe, expect, it } from "vitest";
import { adminClient, cleanupTestBill } from "../utils";

describe("submitted_date calendar date", () => {
  const billIds: string[] = [];

  afterEach(async () => {
    for (const id of billIds) {
      await cleanupTestBill(id);
    }
    billIds.length = 0;
  });

  it("submitted_date is stored as a calendar date and does not set published_at", async () => {
    const { data, error } = await adminClient
      .from("bills")
      .insert({
        name: `テスト議案 ${Date.now()}`,
        originating_house: "HR" as const,
        status: "introduced" as const,
        submitted_date: "2026-04-01",
      })
      .select("id, submitted_date, published_at")
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    if (!data) throw new Error("inserted bill was not returned");
    billIds.push(data.id);
    expect(data.submitted_date).toBe("2026-04-01");
    expect(data.published_at).toBeNull();
  });

  it("published_at does not set submitted_date", async () => {
    const timestamp = "2026-04-02T09:00:00+00:00";
    const { data, error } = await adminClient
      .from("bills")
      .insert({
        name: `テスト議案 ${Date.now()}`,
        originating_house: "HR" as const,
        status: "introduced" as const,
        published_at: timestamp,
      })
      .select("id, submitted_date, published_at")
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    if (!data) throw new Error("inserted bill was not returned");
    billIds.push(data.id);
    expect(data.submitted_date).toBeNull();
    expect(data.published_at).toBe(timestamp);
  });

  it("submitted_date and published_at can be updated independently", async () => {
    const { data: bill } = await adminClient
      .from("bills")
      .insert({
        name: `テスト議案 ${Date.now()}`,
        originating_house: "HR" as const,
        status: "introduced" as const,
      })
      .select("id")
      .single();
    if (!bill) throw new Error("inserted bill was not returned");
    billIds.push(bill.id);

    const publishedAt = "2026-08-01T10:00:00+00:00";
    const { error } = await adminClient
      .from("bills")
      .update({
        submitted_date: "2026-07-01",
        published_at: publishedAt,
      })
      .eq("id", bill.id);
    expect(error).toBeNull();

    const { data: updated } = await adminClient
      .from("bills")
      .select("submitted_date, published_at")
      .eq("id", bill.id)
      .single();

    expect(updated?.submitted_date).toBe("2026-07-01");
    expect(updated?.published_at).toBe(publishedAt);
  });
});
