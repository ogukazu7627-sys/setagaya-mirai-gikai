import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { savePublicCommentEmailPreference } from "../../web/src/features/public-comment/minpaku/server/email-preference-repository";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "../../web/src/features/public-comment/minpaku/shared/consent";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  getAnonClient,
  getAuthenticatedClient,
  type TestUser,
} from "./utils";

describe("public_comment_email_preferences", () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await createTestUser();
  });
  afterAll(async () => {
    if (user) await cleanupTestUser(user.id);
  });

  it("明示同意・文面の版を保存し、停止・再同意を1ユーザー1件で更新する", async () => {
    await savePublicCommentEmailPreference(user.id, true);
    let result = await adminClient
      .from("public_comment_email_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      user_id: user.id,
      opted_in: true,
      consent_version: PUBLIC_COMMENT_CONSENT_VERSION,
    });
    expect(result.data?.consented_at).toBeTruthy();
    await savePublicCommentEmailPreference(user.id, false);
    result = await adminClient
      .from("public_comment_email_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();
    expect(result.data).toMatchObject({ opted_in: false, consented_at: null });
    await savePublicCommentEmailPreference(user.id, true);
    const all = await adminClient
      .from("public_comment_email_preferences")
      .select("*")
      .eq("user_id", user.id);
    expect(all.error).toBeNull();
    expect(all.data).toHaveLength(1);
    expect(all.data?.[0].opted_in).toBe(true);
  });

  it("匿名・認証済みブラウザークライアントから直接読取・変更できない", async () => {
    const clients = [
      getAnonClient(),
      await getAuthenticatedClient(user.email, user.password),
    ];
    for (const client of clients) {
      const read = await client
        .from("public_comment_email_preferences")
        .select("*");
      expect(read.data ?? []).toEqual([]);
      const write = await client
        .from("public_comment_email_preferences")
        .upsert({
          user_id: user.id,
          opted_in: false,
          consent_version: "spoofed",
        });
      expect(write.error).toBeTruthy();
    }
    const row = await adminClient
      .from("public_comment_email_preferences")
      .select("opted_in, consent_version")
      .eq("user_id", user.id)
      .single();
    expect(row.data).toEqual({
      opted_in: true,
      consent_version: PUBLIC_COMMENT_CONSENT_VERSION,
    });
  });

  it("存在しないユーザーへの保存は失敗を返す", async () => {
    await expect(
      savePublicCommentEmailPreference(crypto.randomUUID(), true)
    ).rejects.toThrow("Failed to save");
  });
});
