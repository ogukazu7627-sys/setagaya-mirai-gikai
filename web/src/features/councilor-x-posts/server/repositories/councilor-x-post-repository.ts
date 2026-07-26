import "server-only";

import { createAdminClient, type Json } from "@mirai-gikai/supabase";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import type {
  CouncilorXSyncSource,
  CouncilorXSyncStateInput,
  PublicCouncilorXPost,
  StoredCouncilorXPost,
} from "../../shared/types/councilor-x-post";
import { extractXUsername } from "../../shared/utils/x-account";

export async function findCouncilorXSyncSources(): Promise<
  CouncilorXSyncSource[]
> {
  if (isSetagayaMockMode) {
    return [];
  }

  const supabase = createAdminClient();
  const [councilorsResult, statesResult] = await Promise.all([
    supabase
      .from("councilors")
      .select("id, x_account_url")
      .eq("is_active", true)
      .not("x_account_url", "is", null)
      .order("display_name", { ascending: true }),
    supabase
      .from("councilor_x_sync_states")
      .select("councilor_id, x_username, x_user_id, last_seen_post_id"),
  ]);

  if (councilorsResult.error) {
    throw new Error(
      `Failed to fetch councilor X accounts: ${councilorsResult.error.message}`
    );
  }
  if (statesResult.error) {
    throw new Error(
      `Failed to fetch councilor X sync states: ${statesResult.error.message}`
    );
  }

  const statesByCouncilorId = new Map(
    (statesResult.data ?? []).map((state) => [state.councilor_id, state])
  );

  return (councilorsResult.data ?? []).flatMap((councilor) => {
    if (!councilor.x_account_url) {
      return [];
    }

    const xUsername = extractXUsername(councilor.x_account_url);
    if (!xUsername) {
      return [];
    }

    const state = statesByCouncilorId.get(councilor.id);
    const stateMatchesAccount =
      state?.x_username.toLowerCase() === xUsername.toLowerCase();

    return [
      {
        councilorId: councilor.id,
        xUsername,
        xUserId: stateMatchesAccount ? (state.x_user_id ?? null) : null,
        lastSeenPostId: stateMatchesAccount
          ? (state.last_seen_post_id ?? null)
          : null,
      },
    ];
  });
}

export async function findLatestCouncilorXPosts(
  limit = 50
): Promise<PublicCouncilorXPost[]> {
  if (isSetagayaMockMode) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilor_x_posts")
    .select(
      "post_id, post_url, posted_at, councilors!inner(display_name, is_active, x_account_url)"
    )
    .eq("councilors.is_active", true)
    .not("councilors.x_account_url", "is", null)
    .order("posted_at", { ascending: false })
    .order("post_id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch councilor X posts: ${error.message}`);
  }

  return (data ?? []).flatMap((post) => {
    const currentUsername = extractXUsername(
      post.councilors.x_account_url ?? ""
    );
    const storedUsername = extractXUsername(post.post_url);
    if (
      !currentUsername ||
      !storedUsername ||
      currentUsername.toLowerCase() !== storedUsername.toLowerCase()
    ) {
      return [];
    }

    return [
      {
        postId: post.post_id,
        councilorName: post.councilors.display_name,
        postUrl: post.post_url,
        postedAt: post.posted_at,
      },
    ];
  });
}

export async function persistCouncilorXPostSync(input: {
  activeAccounts: Array<{
    councilorId: string;
    xUsername: string;
  }>;
  posts: StoredCouncilorXPost[];
  syncStates: CouncilorXSyncStateInput[];
  syncedAt: string;
}): Promise<{ storedCount: number; deletedCount: number }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("persist_councilor_x_post_sync", {
    p_active_accounts: input.activeAccounts.map((account) => ({
      councilor_id: account.councilorId,
      x_username: account.xUsername,
    })) as Json,
    p_posts: input.posts.map((post) => ({
      post_id: post.postId,
      councilor_id: post.councilorId,
      post_url: post.postUrl,
      posted_at: post.postedAt,
      post_type: post.postType,
    })) as Json,
    p_sync_states: input.syncStates.map((state) => ({
      councilor_id: state.councilorId,
      x_username: state.xUsername,
      x_user_id: state.xUserId,
      last_seen_post_id: state.lastSeenPostId,
    })) as Json,
    p_synced_at: input.syncedAt,
  });

  if (error) {
    throw new Error(`Failed to persist councilor X posts: ${error.message}`);
  }

  const result = data?.[0];
  return {
    storedCount: result?.stored_count ?? 0,
    deletedCount: result?.deleted_count ?? 0,
  };
}
