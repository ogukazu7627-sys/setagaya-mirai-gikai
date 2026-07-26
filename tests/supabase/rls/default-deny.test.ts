import { describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  getAnonClient,
  getAuthenticatedClient,
} from "../utils";

/**
 * 全テーブルは RLS 有効 + ポリシーなし（default deny）。
 * anon / authenticated どちらからも SELECT・INSERT できないことを確認する。
 */

const tables = [
  "bills",
  "bill_contents",
  "mirai_stances",
  "chats",
  "tags",
  "bills_tags",
  "preview_tokens",
  "diet_sessions",
  "interview_configs",
  "interview_questions",
  "interview_sessions",
  "interview_messages",
  "interview_report",
  "recommendation_profiles",
  "daily_recommendations",
  "recommendation_impressions",
  "push_subscriptions",
  "recommendation_api_rate_limits",
  "council_search_chunks",
  "council_search_index_jobs",
  "councilor_x_posts",
  "councilor_x_sync_states",
] as const;

const xRlsCouncilorId = crypto.randomUUID();
const xRlsInsertCouncilorId = crypto.randomUUID();
const xRlsPostId = "1888888888888888888";
const xRlsInsertPostId = "1777777777777777777";

describe("RLS default deny（全テーブル共通）", () => {
  beforeAll(async () => {
    const suffix = crypto.randomUUID();
    const { error: councilorError } = await adminClient
      .from("councilors")
      .insert([
        {
          id: xRlsCouncilorId,
          display_name: "X RLS表示テスト議員",
          normalized_name: `X RLS表示テスト議員-${suffix}`,
          x_account_url: "https://x.com/rls_test_user",
        },
        {
          id: xRlsInsertCouncilorId,
          display_name: "X RLS挿入テスト議員",
          normalized_name: `X RLS挿入テスト議員-${suffix}`,
          x_account_url: "https://x.com/rls_insert_user",
        },
      ]);
    if (councilorError) {
      throw councilorError;
    }

    const { error: stateError } = await adminClient
      .from("councilor_x_sync_states")
      .insert({
        councilor_id: xRlsCouncilorId,
        x_username: "rls_test_user",
        x_user_id: "188888888888888888",
      });
    if (stateError) {
      throw stateError;
    }

    const { error: postError } = await adminClient
      .from("councilor_x_posts")
      .insert({
        post_id: xRlsPostId,
        councilor_id: xRlsCouncilorId,
        post_url: `https://x.com/rls_test_user/status/${xRlsPostId}`,
        posted_at: "2026-07-27T00:00:00.000Z",
        post_type: "original",
      });
    if (postError) {
      throw postError;
    }
  });

  afterAll(async () => {
    await adminClient
      .from("councilors")
      .delete()
      .in("id", [xRlsCouncilorId, xRlsInsertCouncilorId]);
  });

  describe("anon クライアント", () => {
    const anon = getAnonClient();

    for (const table of tables) {
      it(`${table}: SELECT が空結果になる`, async () => {
        const { data, error } = await anon.from(table).select("*").limit(1);
        // RLS で拒否される場合、エラーか空配列が返る
        if (error) {
          expect(error).toBeTruthy();
        } else {
          expect(data).toEqual([]);
        }
      });
    }

    it("bills: INSERT が拒否される", async () => {
      const { error } = await anon.from("bills").insert({
        name: "不正な挿入テスト",
        originating_house: "HR",
        status: "introduced",
        publish_status: "draft",
      });
      expect(error).not.toBeNull();
    });

    it("diet_sessions: INSERT が拒否される", async () => {
      const { error } = await anon.from("diet_sessions").insert({
        name: "不正な挿入テスト",
        start_date: "2025-01-01",
        end_date: "2025-06-30",
        slug: "rls-test",
      });
      expect(error).not.toBeNull();
    });

    it("search_council_bills: 直接実行が拒否される", async () => {
      const { error } = await anon.rpc(
        "search_council_bills",
        councilSearchRpcArgs()
      );
      expect(error).not.toBeNull();
    });

    it("persist_councilor_x_post_sync: 直接実行が拒否される", async () => {
      const { error } = await anon.rpc("persist_councilor_x_post_sync", {
        p_active_accounts: [],
        p_posts: [],
        p_sync_states: [],
        p_synced_at: new Date().toISOString(),
      });
      expect(error).not.toBeNull();
    });

    it("councilor_x_posts / sync_states: INSERT が拒否される", async () => {
      const { error: postError } = await anon.from("councilor_x_posts").insert({
        post_id: xRlsInsertPostId,
        councilor_id: xRlsInsertCouncilorId,
        post_url: `https://x.com/rls_insert_user/status/${xRlsInsertPostId}`,
        posted_at: "2026-07-27T01:00:00.000Z",
        post_type: "original",
      });
      const { error: stateError } = await anon
        .from("councilor_x_sync_states")
        .insert({
          councilor_id: xRlsInsertCouncilorId,
          x_username: "rls_insert_user",
        });

      expect(postError).not.toBeNull();
      expect(stateError).not.toBeNull();
    });
  });

  describe("authenticated クライアント", () => {
    let userId: string;
    let email: string;
    const password = "test-password-123";

    beforeAll(async () => {
      email = `rls-test-${Date.now()}@example.com`;
      const user = await createTestUser(email, password);
      userId = user.id;
    });

    afterAll(async () => {
      await cleanupTestUser(userId);
    });

    for (const table of tables) {
      it(`${table}: SELECT が空結果になる`, async () => {
        const client = await getAuthenticatedClient(email, password);
        const { data, error } = await client.from(table).select("*").limit(1);
        if (error) {
          expect(error).toBeTruthy();
        } else {
          expect(data).toEqual([]);
        }
      });
    }

    it("bills: INSERT が拒否される", async () => {
      const client = await getAuthenticatedClient(email, password);
      const { error } = await client.from("bills").insert({
        name: "不正な挿入テスト",
        originating_house: "HR",
        status: "introduced",
        publish_status: "draft",
      });
      expect(error).not.toBeNull();
    });

    it("diet_sessions: INSERT が拒否される", async () => {
      const client = await getAuthenticatedClient(email, password);
      const { error } = await client.from("diet_sessions").insert({
        name: "不正な挿入テスト",
        start_date: "2025-01-01",
        end_date: "2025-06-30",
        slug: "rls-test",
      });
      expect(error).not.toBeNull();
    });

    it("search_council_bills: 直接実行が拒否される", async () => {
      const client = await getAuthenticatedClient(email, password);
      const { error } = await client.rpc(
        "search_council_bills",
        councilSearchRpcArgs()
      );
      expect(error).not.toBeNull();
    });

    it("persist_councilor_x_post_sync: 直接実行が拒否される", async () => {
      const client = await getAuthenticatedClient(email, password);
      const { error } = await client.rpc("persist_councilor_x_post_sync", {
        p_active_accounts: [],
        p_posts: [],
        p_sync_states: [],
        p_synced_at: new Date().toISOString(),
      });
      expect(error).not.toBeNull();
    });

    it("councilor_x_posts / sync_states: INSERT が拒否される", async () => {
      const client = await getAuthenticatedClient(email, password);
      const { error: postError } = await client
        .from("councilor_x_posts")
        .insert({
          post_id: xRlsInsertPostId,
          councilor_id: xRlsInsertCouncilorId,
          post_url: `https://x.com/rls_insert_user/status/${xRlsInsertPostId}`,
          posted_at: "2026-07-27T01:00:00.000Z",
          post_type: "original",
        });
      const { error: stateError } = await client
        .from("councilor_x_sync_states")
        .insert({
          councilor_id: xRlsInsertCouncilorId,
          x_username: "rls_insert_user",
        });

      expect(postError).not.toBeNull();
      expect(stateError).not.toBeNull();
    });
  });
});

function councilSearchRpcArgs() {
  return {
    p_query_embedding: null,
    p_query_terms: ["防災"],
    p_diet_session_ids: [crypto.randomUUID()],
    p_content_type: null,
    p_major_category: null,
    p_committee_name: null,
    p_councilor_ids: [],
    p_councilor_names: [],
    p_similarity_threshold: 0.3,
    p_limit: 5,
  };
}
