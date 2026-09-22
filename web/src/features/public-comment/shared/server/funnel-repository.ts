import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { InterviewState } from "../interview-state";
import type { FunnelAttributionInput } from "../funnel";

type DeliveryStatus = "delivered" | "bounced" | "complained" | "suppressed";

function now() {
  return new Date().toISOString();
}

export async function createShortLinkFunnelVisit(params: {
  journeyType: "interview" | "event_direct";
  adTheme: string;
  landingPath: string;
  utmCampaign: string;
  utmContent: string;
}) {
  const { data, error } = await createAdminClient()
    .from("public_comment_funnel_visits")
    .insert({
      journey_type: params.journeyType,
      ad_theme: params.adTheme,
      landing_path: params.landingPath,
      utm_source: "instagram",
      utm_medium: "paid_social",
      utm_campaign: params.utmCampaign,
      utm_content: params.utmContent,
      short_link_opened_at: now(),
    })
    .select("public_token")
    .single();
  if (error) throw new Error("public_comment_funnel_short_link_failed");
  return data.public_token;
}

export async function arrivePublicCommentFunnelVisit(
  input: FunnelAttributionInput
) {
  const supabase = createAdminClient();
  if (input.publicToken) {
    const { data, error } = await supabase
      .from("public_comment_funnel_visits")
      .update({ arrived_at: now() })
      .eq("public_token", input.publicToken)
      .is("arrived_at", null)
      .select("public_token")
      .maybeSingle();
    if (error) throw new Error("public_comment_funnel_arrival_failed");
    if (data) return data.public_token;

    const { data: existing, error: existingError } = await supabase
      .from("public_comment_funnel_visits")
      .select("public_token")
      .eq("public_token", input.publicToken)
      .maybeSingle();
    if (existingError) throw new Error("public_comment_funnel_arrival_failed");
    if (existing) return existing.public_token;
  }

  const { data, error } = await supabase
    .from("public_comment_funnel_visits")
    .insert({
      journey_type: input.journeyType,
      ad_theme: input.adTheme,
      landing_path: input.landingPath,
      utm_source: input.utmSource,
      utm_medium: input.utmMedium,
      utm_campaign: input.utmCampaign,
      utm_content: input.utmContent,
      arrived_at: now(),
    })
    .select("public_token")
    .single();
  if (error) throw new Error("public_comment_funnel_arrival_failed");
  return data.public_token;
}

export async function attachFunnelVisitToSession(params: {
  sessionId: string;
  campaignId: string;
  publicToken?: string | null;
}) {
  const { data, error } = await createAdminClient().rpc(
    "start_public_comment_funnel_session",
    {
      p_session_id: params.sessionId,
      p_campaign_id: params.campaignId,
      p_public_token: params.publicToken ?? undefined,
    }
  );
  if (error) throw new Error("public_comment_funnel_session_failed");
  return data;
}

export async function markInterviewFunnelProgress(params: {
  sessionId: string;
  state: InterviewState;
  checkpointChoice?: "simple" | "detailed";
}) {
  const timestamp = now();
  const visitUpdate: {
    checkpoint_choice?: "simple" | "detailed";
    completion_mode?: "simple" | "detailed";
  } = {};
  if (params.checkpointChoice) {
    visitUpdate.checkpoint_choice = params.checkpointChoice;
    visitUpdate.completion_mode = params.checkpointChoice;
  }

  const supabase = createAdminClient();
  if (params.state.checkpoint === "after_core" || params.checkpointChoice) {
    const { error } = await supabase
      .from("public_comment_funnel_visits")
      .update({ core_completed_at: timestamp })
      .eq("session_id", params.sessionId)
      .is("core_completed_at", null);
    if (error) throw new Error("public_comment_funnel_progress_failed");
  }

  if (Object.keys(visitUpdate).length > 0) {
    const { error } = await supabase
      .from("public_comment_funnel_visits")
      .update(visitUpdate)
      .eq("session_id", params.sessionId);
    if (error) throw new Error("public_comment_funnel_progress_failed");
  }

  if (params.checkpointChoice) {
    const { error: sessionError } = await supabase
      .from("public_comment_sessions")
      .update({ funnel_completion_mode: params.checkpointChoice })
      .eq("id", params.sessionId)
      .is("completed_at", null);
    if (sessionError)
      throw new Error("public_comment_funnel_completion_mode_failed");
  }
}

export async function markPublicCommentGoogleClaimed(sessionId: string) {
  const { error } = await createAdminClient()
    .from("public_comment_funnel_visits")
    .update({ google_claimed_at: now() })
    .eq("session_id", sessionId)
    .is("google_claimed_at", null);
  if (error) throw new Error("public_comment_funnel_google_claim_failed");
}

export async function recordEventInvitationClick(clickToken: string) {
  const supabase = createAdminClient();
  const { data: invitation, error: invitationError } = await supabase
    .from("public_comment_event_invitations")
    .select("session_id")
    .eq("click_token", clickToken)
    .maybeSingle();
  if (invitationError || !invitation)
    throw new Error("public_comment_event_invitation_link_invalid");

  const timestamp = now();
  const { data, error } = await supabase
    .from("public_comment_funnel_visits")
    .update({
      event_invitation_clicked_at: timestamp,
      event_signup_link_clicked_at: timestamp,
    })
    .eq("session_id", invitation.session_id)
    .select("public_token")
    .maybeSingle();
  if (error || !data)
    throw new Error("public_comment_event_invitation_click_failed");
  return data.public_token;
}

export async function recordEventSignupLinkClick(publicToken: string) {
  const { data, error } = await createAdminClient()
    .from("public_comment_funnel_visits")
    .update({ event_signup_link_clicked_at: now() })
    .eq("public_token", publicToken)
    .select("public_token")
    .maybeSingle();
  if (error || !data) throw new Error("public_comment_event_link_invalid");
  return data.public_token;
}

export async function registerYouthDialogueEvent(params: {
  publicToken: string;
  email: string;
  attendeeName: string;
  interests: string[];
  agreementVersion: string;
  note?: string | null;
}) {
  const { data, error } = await createAdminClient().rpc(
    "register_public_comment_event",
    {
      p_public_token: params.publicToken,
      p_event_slug: "youth-dialogue-2026-10-03",
      p_email: params.email,
      p_attendee_name: params.attendeeName,
      p_interests: params.interests,
      p_agreement_version: params.agreementVersion,
      p_note: params.note ?? undefined,
    }
  );
  if (error) throw new Error("public_comment_event_registration_failed");
  return data;
}

export async function updateEventInvitationDelivery(params: {
  providerId: string;
  status: DeliveryStatus;
}) {
  const timestamp = now();
  const update =
    params.status === "delivered"
      ? { delivery_status: params.status, delivered_at: timestamp }
      : { delivery_status: params.status };
  const { data, error } = await createAdminClient()
    .from("public_comment_event_invitations")
    .update(update)
    .eq("provider_id", params.providerId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("public_comment_event_delivery_update_failed");
  return Boolean(data);
}
