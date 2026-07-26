import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Json } from "../../../packages/supabase/types/supabase.types";
import { adminClient } from "../utils";

describe("persist_councilor_x_post_sync", () => {
  const councilorIds = [crypto.randomUUID(), crypto.randomUUID()];

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { error } = await adminClient.from("councilors").insert([
      {
        id: councilorIds[0],
        display_name: "X同期テスト議員1",
        normalized_name: `X同期テスト議員1-${suffix}`,
        x_account_url: "https://x.com/test_member_1",
      },
      {
        id: councilorIds[1],
        display_name: "X同期テスト議員2",
        normalized_name: `X同期テスト議員2-${suffix}`,
        x_account_url: "https://x.com/test_member_2",
      },
    ]);
    if (error) {
      throw new Error(`テスト議員作成失敗: ${error.message}`);
    }
  });

  afterEach(async () => {
    await adminClient.from("councilors").delete().in("id", councilorIds);
  });

  it("重複を作らず、議員別上限を設けずに全体の最新50件だけを残す", async () => {
    const firstCouncilorPosts = createPosts(councilorIds[0], 55);
    const secondCouncilorPosts: Json[] = [
      {
        post_id: "1900000000000000100",
        councilor_id: councilorIds[1],
        post_url: "https://x.com/test_member_2/status/1900000000000000100",
        posted_at: "2026-07-27T12:00:00.000Z",
        post_type: "original",
      },
      {
        post_id: "1900000000000000099",
        councilor_id: councilorIds[1],
        post_url: "https://x.com/test_member_2/status/1900000000000000099",
        posted_at: "2026-07-27T11:58:30.000Z",
        post_type: "quote",
      },
    ];
    const posts = [...firstCouncilorPosts, ...secondCouncilorPosts];
    const expectedPostIds = sortPostsNewestFirst(posts)
      .slice(0, 50)
      .map((post) => post.post_id);
    const { data, error } = await adminClient.rpc(
      "persist_councilor_x_post_sync",
      {
        p_active_accounts: createActiveAccounts(),
        p_posts: posts,
        p_sync_states: createSyncStates(
          firstCouncilorPosts[0]?.post_id ?? null
        ),
        p_synced_at: "2026-07-27T12:00:00.000Z",
      }
    );

    expect(error).toBeNull();
    expect(data?.[0]).toEqual({
      stored_count: 50,
      deleted_count: 7,
    });

    const { data: storedPosts } = await adminClient
      .from("councilor_x_posts")
      .select("post_id, councilor_id")
      .in("councilor_id", councilorIds)
      .order("posted_at", { ascending: false })
      .order("post_id", { ascending: false });

    expect(storedPosts).toHaveLength(50);
    expect(storedPosts?.map((post) => post.post_id)).toEqual(expectedPostIds);
    expect(new Set(storedPosts?.map((post) => post.post_id)).size).toBe(50);
    expect(
      storedPosts?.filter((post) => post.councilor_id === councilorIds[0])
    ).toHaveLength(48);

    const { error: duplicateError } = await adminClient.rpc(
      "persist_councilor_x_post_sync",
      {
        p_active_accounts: createActiveAccounts(),
        p_posts: [firstCouncilorPosts[0] as Json],
        p_sync_states: createSyncStates(
          firstCouncilorPosts[0]?.post_id ?? null
        ),
        p_synced_at: "2026-07-27T14:00:00.000Z",
      }
    );
    expect(duplicateError).toBeNull();

    const { count } = await adminClient
      .from("councilor_x_posts")
      .select("*", { count: "exact", head: true })
      .in("councilor_id", councilorIds);
    expect(count).toBe(50);
  });

  it("保存データが不正ならトランザクション全体をロールバックする", async () => {
    const initialPosts = createPosts(councilorIds[0], 2);
    const { error: initialError } = await adminClient.rpc(
      "persist_councilor_x_post_sync",
      {
        p_active_accounts: createActiveAccounts(),
        p_posts: initialPosts,
        p_sync_states: createSyncStates(initialPosts[0]?.post_id ?? null),
        p_synced_at: "2026-07-27T12:00:00.000Z",
      }
    );
    expect(initialError).toBeNull();

    const { data: stateBeforeFailure } = await adminClient
      .from("councilor_x_sync_states")
      .select("last_seen_post_id, last_successful_sync_at")
      .eq("councilor_id", councilorIds[0])
      .single();
    const newPost = {
      post_id: "1999999999999999999",
      councilor_id: councilorIds[0],
      post_url: "https://x.com/test_member_1/status/1999999999999999999",
      posted_at: "2026-07-27T13:00:00.000Z",
      post_type: "original",
    };
    const { error } = await adminClient.rpc("persist_councilor_x_post_sync", {
      p_active_accounts: createActiveAccounts(),
      p_posts: [newPost],
      p_sync_states: createSyncStates(newPost.post_id, "invalid-username"),
      p_synced_at: "2026-07-27T14:00:00.000Z",
    });
    expect(error).not.toBeNull();

    const { data: postsAfterFailure } = await adminClient
      .from("councilor_x_posts")
      .select("post_id")
      .eq("councilor_id", councilorIds[0]);
    expect(postsAfterFailure).toHaveLength(2);
    expect(postsAfterFailure?.map((post) => post.post_id)).not.toContain(
      newPost.post_id
    );

    const { data: stateAfterFailure } = await adminClient
      .from("councilor_x_sync_states")
      .select("last_seen_post_id, last_successful_sync_at")
      .eq("councilor_id", councilorIds[0])
      .single();
    expect(stateAfterFailure).toEqual(stateBeforeFailure);
  });

  it("対象外の議員と変更前アカウントの投稿・同期状態を整理する", async () => {
    const firstPost = createPosts(councilorIds[0], 1)[0] as Json;
    const secondPostId = "1900000000000000100";
    const secondPost = {
      post_id: secondPostId,
      councilor_id: councilorIds[1],
      post_url: `https://x.com/test_member_2/status/${secondPostId}`,
      posted_at: "2026-07-27T11:00:00.000Z",
      post_type: "original",
    };
    const { error: initialError } = await adminClient.rpc(
      "persist_councilor_x_post_sync",
      {
        p_active_accounts: createActiveAccounts(),
        p_posts: [firstPost, secondPost],
        p_sync_states: createSyncStates(
          (firstPost as Record<string, string>).post_id
        ),
        p_synced_at: "2026-07-27T12:00:00.000Z",
      }
    );
    expect(initialError).toBeNull();

    const { data, error } = await adminClient.rpc(
      "persist_councilor_x_post_sync",
      {
        p_active_accounts: [
          {
            councilor_id: councilorIds[0],
            x_username: "renamed_member",
          },
        ],
        p_posts: [],
        p_sync_states: [
          {
            councilor_id: councilorIds[0],
            x_username: "renamed_member",
            x_user_id: "1000000003",
            last_seen_post_id: null,
          },
        ],
        p_synced_at: "2026-07-27T14:00:00.000Z",
      }
    );

    expect(error).toBeNull();
    expect(data?.[0]).toEqual({
      stored_count: 0,
      deleted_count: 2,
    });

    const { data: posts } = await adminClient
      .from("councilor_x_posts")
      .select("post_id")
      .in("councilor_id", councilorIds);
    expect(posts).toEqual([]);

    const { data: states } = await adminClient
      .from("councilor_x_sync_states")
      .select("councilor_id, x_username")
      .in("councilor_id", councilorIds);
    expect(states).toEqual([
      {
        councilor_id: councilorIds[0],
        x_username: "renamed_member",
      },
    ]);
  });

  function createSyncStates(
    lastSeenPostId: string | null,
    firstUsername = "test_member_1"
  ): Json {
    return [
      {
        councilor_id: councilorIds[0],
        x_username: firstUsername,
        x_user_id: "1000000001",
        last_seen_post_id: lastSeenPostId,
      },
      {
        councilor_id: councilorIds[1],
        x_username: "test_member_2",
        x_user_id: "1000000002",
        last_seen_post_id: null,
      },
    ];
  }

  function createActiveAccounts(firstUsername = "test_member_1"): Json {
    return [
      {
        councilor_id: councilorIds[0],
        x_username: firstUsername,
      },
      {
        councilor_id: councilorIds[1],
        x_username: "test_member_2",
      },
    ];
  }
});

function createPosts(councilorId: string, count: number): Json[] {
  const firstPostId = 1_900_000_000_000_000_000n;
  const firstPostedAt = new Date("2026-07-27T12:00:00.000Z").getTime();

  return Array.from({ length: count }, (_, index) => {
    const postId = (firstPostId - BigInt(index)).toString();
    return {
      post_id: postId,
      councilor_id: councilorId,
      post_url: `https://x.com/test_member_1/status/${postId}`,
      posted_at: new Date(firstPostedAt - index * 60_000).toISOString(),
      post_type: index % 2 === 0 ? "original" : "quote",
    };
  });
}

function sortPostsNewestFirst(posts: Json[]) {
  return posts
    .map((post) => post as Record<string, string>)
    .sort((a, b) => {
      const timestampDifference =
        new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
      if (timestampDifference !== 0) {
        return timestampDifference;
      }
      return BigInt(b.post_id) > BigInt(a.post_id) ? 1 : -1;
    });
}
