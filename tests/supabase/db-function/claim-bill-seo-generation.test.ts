import { afterEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestBill,
  createTestBill,
  getAnonClient,
} from "../utils";

describe("claim_bill_seo_generation()", () => {
  let billId: string | undefined;

  afterEach(async () => {
    if (billId) {
      await cleanupTestBill(billId);
      billId = undefined;
    }
  });

  it("同じ案件・同じsource hashの同時生成を1回だけ許可する", async () => {
    const bill = await createTestBill();
    billId = bill.id;

    const first = await claim(bill.id, "hash-a");
    const duplicate = await claim(bill.id, "hash-a");

    expect(first.data).toBe(true);
    expect(first.error).toBeNull();
    expect(duplicate.data).toBe(false);
    expect(duplicate.error).toBeNull();
  });

  it("本文更新によるhash変更は生成中でも新しい生成へ切り替える", async () => {
    const bill = await createTestBill();
    billId = bill.id;
    await claim(bill.id, "hash-a");

    const changed = await claim(bill.id, "hash-b");
    const { data: profile } = await adminClient
      .from("bill_seo_profiles")
      .select("source_hash, status")
      .eq("bill_id", bill.id)
      .single();

    expect(changed.data).toBe(true);
    expect(profile).toEqual({ source_hash: "hash-b", status: "generating" });
  });

  it("生成済みの同一hashは通常省略し、force時だけ再生成する", async () => {
    const bill = await createTestBill();
    billId = bill.id;
    await claim(bill.id, "hash-a");
    await adminClient
      .from("bill_seo_profiles")
      .update({
        status: "ready",
        seo_title: "SEOタイトル",
        seo_description:
          "世田谷区議会の案件について、内容と重要な論点を分かりやすく紹介するためのSEO説明文です。",
        seo_keywords: ["世田谷区議会", "教育", "学校"],
      })
      .eq("bill_id", bill.id);

    const unchanged = await claim(bill.id, "hash-a");
    const forced = await claim(bill.id, "hash-a", true);

    expect(unchanged.data).toBe(false);
    expect(forced.data).toBe(true);
  });

  it("匿名利用者は生成ロックを取得できずSEOプロフィールも読めない", async () => {
    const bill = await createTestBill();
    billId = bill.id;
    const anonClient = getAnonClient();

    const claimResult = await anonClient.rpc("claim_bill_seo_generation", {
      p_bill_id: bill.id,
      p_source_hash: "hash-a",
      p_force: false,
    });
    const profileResult = await anonClient
      .from("bill_seo_profiles")
      .select("bill_id")
      .eq("bill_id", bill.id);

    expect(claimResult.data).toBeNull();
    expect(claimResult.error).not.toBeNull();
    expect(profileResult.data).toEqual([]);
    expect(profileResult.error).toBeNull();
  });
});

function claim(billId: string, sourceHash: string, force = false) {
  return adminClient.rpc("claim_bill_seo_generation", {
    p_bill_id: billId,
    p_source_hash: sourceHash,
    p_force: force,
  });
}
