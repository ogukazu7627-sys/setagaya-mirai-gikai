import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";

type Campaign = Database["public"]["Tables"]["public_comment_campaigns"]["Row"];
type Session = Database["public"]["Tables"]["public_comment_sessions"]["Row"];
type Message = Database["public"]["Tables"]["public_comment_messages"]["Row"];
type Draft = Database["public"]["Tables"]["public_comment_drafts"]["Row"];

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
}): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "complete_public_comment_session",
    {
      p_session_id: params.sessionId,
      p_user_id: params.userId,
      p_publication_requested: params.publicationRequested,
      p_receipt_opt_in: params.receiptOptIn,
      p_consent_version: params.consentVersion,
    }
  );
  if (error) throw new Error("public_comment_completion_failed");
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
