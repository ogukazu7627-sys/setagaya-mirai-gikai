import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";

type Campaign = Database["public"]["Tables"]["public_comment_campaigns"]["Row"];
type Session = Database["public"]["Tables"]["public_comment_sessions"]["Row"];
type Message = Database["public"]["Tables"]["public_comment_messages"]["Row"];
type Draft = Database["public"]["Tables"]["public_comment_drafts"]["Row"];

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

export async function createSession(params: {
  campaignId: string;
  userId: string;
}): Promise<Session> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_sessions")
    .insert({
      campaign_id: params.campaignId,
      user_id: params.userId,
      consented_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error)
    throw new Error(
      `Failed to create public comment session: ${error.message}`
    );
  return data;
}

export async function findMessages(sessionId: string): Promise<Message[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

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
  targetOrdinances: string[];
  aiBody: string;
  finalBody: string;
  sourceRefs: unknown[];
  factCheckNotes: string[];
}): Promise<Draft> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_drafts")
    .upsert(
      {
        session_id: params.sessionId,
        target_ordinances: params.targetOrdinances,
        ai_body: params.aiBody,
        final_body: params.finalBody,
        source_refs:
          params.sourceRefs as Database["public"]["Tables"]["public_comment_drafts"]["Insert"]["source_refs"],
        fact_check_notes: params.factCheckNotes,
      },
      { onConflict: "session_id" }
    )
    .select("*")
    .single();

  if (error)
    throw new Error(`Failed to save public comment draft: ${error.message}`);
  return data;
}

export async function completeSession(params: {
  sessionId: string;
  publicationRequested: boolean;
}): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("public_comment_sessions")
    .update({
      completed_at: now,
      publication_status: params.publicationRequested
        ? "pending_review"
        : "private",
    })
    .eq("id", params.sessionId);

  if (error)
    throw new Error(
      `Failed to complete public comment session: ${error.message}`
    );

  if (params.publicationRequested) {
    const { error: draftError } = await supabase
      .from("public_comment_drafts")
      .update({ publication_requested_at: now })
      .eq("session_id", params.sessionId);
    if (draftError)
      throw new Error(
        `Failed to request public comment publication: ${draftError.message}`
      );
  }
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
  finalBody: string;
  targetOrdinances: string[];
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("public_comment_drafts")
    .update({
      final_body: params.finalBody,
      target_ordinances: params.targetOrdinances,
    })
    .eq("session_id", params.sessionId)
    .select("*")
    .single();

  if (error)
    throw new Error(`Failed to update public comment draft: ${error.message}`);
  return data;
}

export type { Campaign, Draft, Message, Session };
