import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

export type PublicCommentReviewStatus =
  | "published"
  | "rejected"
  | "unpublished";

export type PublicCommentReviewItem = {
  id: string;
  completed_at: string | null;
  publication_status: string;
  campaign: {
    slug: string;
    title: string;
    official_url: string;
  };
  draft: {
    final_body: string;
    target_ordinances: string[];
    fact_check_notes: string[];
    reviewed_at: string | null;
  } | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
  }>;
};

type NestedReviewRow = {
  id: string;
  completed_at: string | null;
  publication_status: string;
  public_comment_campaigns:
    | {
        slug: string;
        title: string;
        official_url: string;
      }
    | Array<{
        slug: string;
        title: string;
        official_url: string;
      }>;
  public_comment_drafts:
    | {
        final_body: string;
        target_ordinances: string[];
        fact_check_notes: string[];
        reviewed_at: string | null;
      }
    | Array<{
        final_body: string;
        target_ordinances: string[];
        fact_check_notes: string[];
        reviewed_at: string | null;
      }>
    | null;
  public_comment_messages: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
  }>;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapReviewItem(row: NestedReviewRow): PublicCommentReviewItem {
  const campaign = first(row.public_comment_campaigns);
  const draft = first(row.public_comment_drafts);

  return {
    id: row.id,
    completed_at: row.completed_at,
    publication_status: row.publication_status,
    campaign: campaign ?? {
      slug: "",
      title: "不明なキャンペーン",
      official_url: "",
    },
    draft,
    messages: [...(row.public_comment_messages ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    ),
  };
}

const REVIEW_SELECT = `
  id,
  completed_at,
  publication_status,
  public_comment_campaigns!inner(slug, title, official_url),
  public_comment_drafts(final_body, target_ordinances, fact_check_notes, reviewed_at),
  public_comment_messages(id, role, content, created_at)
`;

export async function listPendingPublicCommentReviews() {
  const { data, error } = await createAdminClient()
    .from("public_comment_sessions")
    .select(REVIEW_SELECT)
    .eq("publication_status", "pending_review")
    .order("completed_at", { ascending: false });

  if (error) {
    throw new Error(
      `パブコメ確認待ち一覧を取得できませんでした: ${error.message}`
    );
  }

  return ((data ?? []) as unknown as NestedReviewRow[]).map(mapReviewItem);
}

export async function listPublishedPublicCommentReviews() {
  const { data, error } = await createAdminClient()
    .from("public_comment_sessions")
    .select(REVIEW_SELECT)
    .eq("publication_status", "published")
    .order("completed_at", { ascending: false });

  if (error) {
    throw new Error(
      `公開済みパブコメ一覧を取得できませんでした: ${error.message}`
    );
  }

  return ((data ?? []) as unknown as NestedReviewRow[]).map(mapReviewItem);
}

export async function updatePublicCommentReviewStatus(params: {
  sessionId: string;
  status: PublicCommentReviewStatus;
  reviewedBy: string | null;
}) {
  const currentStatus =
    params.status === "unpublished" ? "published" : "pending_review";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_sessions")
    .update({ publication_status: params.status })
    .eq("id", params.sessionId)
    .eq("publication_status", currentStatus)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `パブコメの公開状態を更新できませんでした: ${error.message}`
    );
  }
  if (!data) {
    throw new Error("対象のパブコメはすでに別の管理者によって処理されています");
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
      `パブコメの確認記録を保存できませんでした: ${draftError.message}`
    );
  }
}
