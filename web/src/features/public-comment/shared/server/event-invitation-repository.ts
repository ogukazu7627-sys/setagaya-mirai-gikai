import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";

export type EventInvitationRecord =
  Database["public"]["Tables"]["public_comment_event_invitations"]["Row"];

export interface EventInvitationRepository {
  find(
    sessionId: string,
    userId: string
  ): Promise<EventInvitationRecord | null>;
  claim(params: {
    sessionId: string;
    userId: string;
    sender: string;
    configFailure: string | null;
  }): Promise<EventInvitationRecord | null>;
  finish(params: {
    invitationId: string;
    leaseToken: string;
    providerId?: string;
    needsReview: boolean;
  }): Promise<void>;
}

export const eventInvitationRepository: EventInvitationRepository = {
  async find(sessionId, userId) {
    const { data, error } = await createAdminClient()
      .from("public_comment_event_invitations")
      .select("*, public_comment_sessions!inner(user_id)")
      .eq("session_id", sessionId)
      .eq("public_comment_sessions.user_id", userId)
      .maybeSingle();
    if (error) throw new Error("event_invitation_read_failed");
    return data;
  },
  async claim({ sessionId, userId, sender, configFailure }) {
    const { data, error } = await createAdminClient().rpc(
      "claim_public_comment_event_invitation",
      {
        p_session_id: sessionId,
        p_user_id: userId,
        p_sender: sender,
        ...(configFailure ? { p_config_failure: configFailure } : {}),
      }
    );
    if (error) throw new Error("event_invitation_claim_failed");
    return data?.[0] ?? null;
  },
  async finish({ invitationId, leaseToken, providerId, needsReview }) {
    const { error } = await createAdminClient().rpc(
      "finish_public_comment_event_invitation",
      {
        p_invitation_id: invitationId,
        p_lease_token: leaseToken,
        ...(providerId ? { p_provider_id: providerId } : {}),
        p_needs_review: needsReview,
      }
    );
    if (error) throw new Error("event_invitation_finish_failed");
  },
};
