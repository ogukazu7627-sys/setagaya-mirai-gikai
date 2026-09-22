import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import { getCompletionErrorDiagnostic } from "../shared/utils/completion-error";

type Campaign = Database["public"]["Tables"]["public_comment_campaigns"]["Row"];
type Session = Database["public"]["Tables"]["public_comment_sessions"]["Row"];
type Message = Database["public"]["Tables"]["public_comment_messages"]["Row"];
type Draft = Database["public"]["Tables"]["public_comment_drafts"]["Row"];

export type DraftGenerationClaim =
  | { status: "ready" }
  | { status: "generating" }
  | { status: "claimed"; token: string };

export class PublicCommentCompletedError extends Error {
  constructor() {
    super("public_comment_completed");
  }
}

function checkFrozenError(error: { message: string } | null) {
  if (error?.message.includes("public_comment_completed"))
    throw new PublicCommentCompletedError();
}

export async function findCampaign(slug: string): Promise<Campaign | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_campaigns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error)
    throw new Error(
      `Failed to fetch public comment campaign: ${error.message}`
    );
  return data;
}

export async function findActiveSession(
  campaignId: string,
  userId: string
): Promise<Session | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_sessions")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .is("completed_at", null)
    .is("superseded_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error)
    throw new Error(`Failed to fetch public comment session: ${error.message}`);
  return data;
}

export async function findSessionForUser(
  sessionId: string,
  userId: string
): Promise<Session | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("superseded_at", null)
    .maybeSingle();

  if (error)
    throw new Error(`Failed to fetch public comment session: ${error.message}`);
  return data;
}

export async function findSessionForCampaignUser(
  sessionId: string,
  userId: string,
  campaignId: string
): Promise<Session | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .is("superseded_at", null)
    .maybeSingle();

  if (error)
    throw new Error(`Failed to fetch public comment session: ${error.message}`);
  return data;
}

export async function createSession(params: {
  campaignId: string;
  userId: string;
  receiptOptIn: boolean;
  consentVersion: string;
}): Promise<Session> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_sessions")
    .insert({
      campaign_id: params.campaignId,
      user_id: params.userId,
      consented_at: new Date().toISOString(),
      receipt_opt_in: params.receiptOptIn,
      consent_version: params.consentVersion,
    })
    .select("*")
    .single();

  if (error)
    throw new Error(
      `Failed to create public comment session: ${error.message}`
    );
  return data;
}

export async function saveSessionReceiptConsent(params: {
  sessionId: string;
  userId: string;
  receiptOptIn: boolean;
  consentVersion: string;
}): Promise<Session> {
  const { data, error } = await createAdminClient()
    .from("public_comment_sessions")
    .update({
      receipt_opt_in: params.receiptOptIn,
      consent_version: params.consentVersion,
      consented_at: new Date().toISOString(),
    })
    .eq("id", params.sessionId)
    .eq("user_id", params.userId)
    .is("completed_at", null)
    .is("superseded_at", null)
    .select("*")
    .maybeSingle();
  if (error) throw new Error("public_comment_consent_save_failed");
  if (!data) throw new PublicCommentCompletedError();
  return data;
}

export async function findMessages(sessionId: string): Promise<Message[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error)
    throw new Error(
      `Failed to fetch public comment messages: ${error.message}`
    );
  return data ?? [];
}

export async function appendMessage(params: {
  sessionId: string;
  role: "assistant" | "user";
  stage: "interview" | "draft";
  questionId?: string | null;
  content: string;
}): Promise<Message> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_messages")
    .insert({
      session_id: params.sessionId,
      role: params.role,
      stage: params.stage,
      question_id: params.questionId ?? null,
      content: params.content,
    })
    .select("*")
    .single();

  checkFrozenError(error);
  if (error)
    throw new Error(`Failed to save public comment message: ${error.message}`);
  return data;
}

export async function findDraft(sessionId: string): Promise<Draft | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_drafts")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error)
    throw new Error(`Failed to fetch public comment draft: ${error.message}`);
  return data;
}

export async function claimDraftGeneration(params: {
  sessionId: string;
  userId: string;
}): Promise<DraftGenerationClaim> {
  const { data, error } = await createAdminClient().rpc(
    "claim_public_comment_draft_generation",
    {
      p_session_id: params.sessionId,
      p_user_id: params.userId,
    }
  );
  if (error)
    throw new Error(`Failed to claim public comment draft: ${error.message}`);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("public_comment_invalid_generation_claim");
  const status = data.status;
  if (status === "ready" || status === "generating") return { status };
  if (status === "claimed" && typeof data.token === "string")
    return { status, token: data.token };
  throw new Error("public_comment_invalid_generation_claim");
}

export async function saveGeneratedDraft(params: {
  sessionId: string;
  generationToken: string;
  targetOrdinances: string[];
  aiBody: string;
  finalBody: string;
  sourceRefs: unknown[];
  factCheckNotes: string[];
}): Promise<Draft> {
  const { data, error } = await createAdminClient().rpc(
    "save_public_comment_generated_draft",
    {
      p_session_id: params.sessionId,
      p_generation_token: params.generationToken,
      p_target_ordinances: params.targetOrdinances,
      p_ai_body: params.aiBody,
      p_final_body: params.finalBody,
      p_source_refs:
        params.sourceRefs as Database["public"]["Functions"]["save_public_comment_generated_draft"]["Args"]["p_source_refs"],
      p_fact_check_notes: params.factCheckNotes,
    }
  );
  if (error)
    throw new Error(
      `Failed to save generated public comment: ${error.message}`
    );
  return data;
}

export async function failDraftGeneration(params: {
  sessionId: string;
  generationToken: string;
  errorCode: string;
}) {
  const { error } = await createAdminClient().rpc(
    "fail_public_comment_draft_generation",
    {
      p_session_id: params.sessionId,
      p_generation_token: params.generationToken,
      p_error_code: params.errorCode,
    }
  );
  if (error)
    throw new Error(
      `Failed to mark public comment draft failed: ${error.message}`
    );
}

export async function createAuthHandoff(params: {
  sessionId: string;
  anonymousUserId: string;
  tokenHash: string;
  expiresAt: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("public_comment_auth_handoffs").insert({
    session_id: params.sessionId,
    anonymous_user_id: params.anonymousUserId,
    token_hash: params.tokenHash,
    expires_at: params.expiresAt,
  });
  if (error)
    throw new Error(
      `Failed to create public comment handoff: ${error.message}`
    );
}

export async function consumeAuthHandoff(params: {
  tokenHash: string;
  targetUserId: string;
}) {
  const { data, error } = await createAdminClient().rpc(
    "consume_public_comment_auth_handoff",
    {
      p_token_hash: params.tokenHash,
      p_target_user_id: params.targetUserId,
    }
  );
  if (error)
    throw new Error(
      `Failed to consume public comment handoff: ${error.message}`
    );
  return data;
}

export async function upsertDraft(params: {
  sessionId: string;
  userId: string;
  targetOrdinances: string[];
  aiBody: string;
  finalBody: string;
  sourceRefs: unknown[];
  factCheckNotes: string[];
}): Promise<Draft> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("save_public_comment_draft", {
    p_session_id: params.sessionId,
    p_user_id: params.userId,
    p_target_ordinances: params.targetOrdinances,
    p_ai_body: params.aiBody,
    p_final_body: params.finalBody,
    p_source_refs:
      params.sourceRefs as Database["public"]["Functions"]["save_public_comment_draft"]["Args"]["p_source_refs"],
    p_fact_check_notes: params.factCheckNotes,
  });

  checkFrozenError(error);
  if (error)
    throw new Error(`Failed to save public comment draft: ${error.message}`);
  return data;
}

export async function completeSession(params: {
  sessionId: string;
  userId: string;
  publicationRequested: boolean;
  receiptOptIn: boolean;
  consentVersion: string;
  eventInvitationOptIn: boolean;
  eventInvitationConsentVersion: string | null;
  eventInvitationEmail: {
    subject: string;
    body: string;
    html: string;
  } | null;
  eventInvitationClickToken: string | null;
}): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "complete_public_comment_session_with_event_invitation",
    {
      p_session_id: params.sessionId,
      p_user_id: params.userId,
      p_publication_requested: params.publicationRequested,
      p_receipt_opt_in: params.receiptOptIn,
      p_event_invitation_opt_in: params.eventInvitationOptIn,
      p_consent_version: params.consentVersion,
      p_event_invitation_consent_version:
        params.eventInvitationConsentVersion ?? undefined,
      p_event_subject: params.eventInvitationEmail?.subject,
      p_event_body: params.eventInvitationEmail?.body,
      p_event_html: params.eventInvitationEmail?.html,
      p_event_click_token: params.eventInvitationClickToken ?? undefined,
    }
  );
  if (error) {
    console.error(
      "public_comment_completion_rpc_failed",
      getCompletionErrorDiagnostic(error)
    );
    throw new Error("public_comment_completion_failed");
  }
  return data;
}

export async function findPublishedDrafts(campaignId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_drafts")
    .select(
      "id, final_body, target_ordinances, created_at, public_comment_sessions!inner(campaign_id, publication_status)"
    )
    .eq("public_comment_sessions.campaign_id", campaignId)
    .eq("public_comment_sessions.publication_status", "published")
    .order("created_at", { ascending: false });

  if (error)
    throw new Error(
      `Failed to fetch published public comments: ${error.message}`
    );
  return data ?? [];
}

export async function updateDraft(params: {
  sessionId: string;
  userId: string;
  finalBody: string;
  targetOrdinances: string[];
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("save_public_comment_draft", {
    p_session_id: params.sessionId,
    p_user_id: params.userId,
    p_final_body: params.finalBody,
    p_target_ordinances: params.targetOrdinances,
  });

  checkFrozenError(error);
  if (error)
    throw new Error(`Failed to update public comment draft: ${error.message}`);
  return data;
}

export type { Campaign, Draft, Message, Session };
