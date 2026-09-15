import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

export async function findMinpakuPendingComments() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_sessions")
    .select(
      "*, public_comment_campaigns!inner(slug), public_comment_drafts(*), public_comment_messages(*)"
    )
    .eq("publication_status", "pending_review")
    .eq("public_comment_campaigns.slug", "minpaku-2026")
    .order("completed_at", { ascending: false });

  if (error) {
    throw new Error(
      `パブリックコメントの確認待ち一覧を取得できませんでした: ${error.message}`
    );
  }
  return data ?? [];
}

export async function updateMinpakuPublicationStatus(params: {
  sessionId: string;
  status: "published" | "rejected" | "unpublished";
  reviewedBy: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("public_comment_sessions")
    .update({
      publication_status: params.status,
    })
    .eq("id", params.sessionId);

  if (error) {
    throw new Error(
      `パブリックコメントの公開状態を更新できませんでした: ${error.message}`
    );
  }

  const { error: draftError } = await supabase
    .from("public_comment_drafts")
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: params.reviewedBy,
    })
    .eq("session_id", params.sessionId);

  if (draftError) {
    throw new Error(
      `パブリックコメントの審査情報を更新できませんでした: ${draftError.message}`
    );
  }
}

export async function findMinpakuPublishedComments() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_sessions")
    .select(
      "id, completed_at, public_comment_campaigns!inner(slug), public_comment_drafts!inner(final_body, target_ordinances)"
    )
    .eq("publication_status", "published")
    .eq("public_comment_campaigns.slug", "minpaku-2026")
    .order("completed_at", { ascending: false });

  if (error) {
    throw new Error(
      `公開済みパブリックコメントを取得できませんでした: ${error.message}`
    );
  }
  return data ?? [];
}
