import "server-only";

import type { ReceiptProvider } from "@/features/public-comment/minpaku/server/receipt-provider";
import type { PublicCommentEventInvitationResult } from "../event-invitation";
import {
  type EventInvitationRepository,
  eventInvitationRepository,
} from "./event-invitation-repository";

type EventInvitationEnvironment = {
  PUBLIC_COMMENT_EVENT_EMAIL_ENABLED?: string;
  PUBLIC_COMMENT_EVENT_FROM?: string;
  PUBLIC_COMMENT_EVENT_TEST_EMAIL?: string;
  PUBLIC_COMMENT_RECEIPT_EMAIL_ENABLED?: string;
  PUBLIC_COMMENT_RECEIPT_FROM?: string;
  PUBLIC_COMMENT_RECEIPT_TEST_EMAIL?: string;
  RESEND_API_KEY?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

function statusOf(
  record: {
    status: string;
    attempt_count: number;
    first_attempt_at: string | null;
    next_attempt_at: string | null;
  } | null,
  now = Date.now()
): PublicCommentEventInvitationResult {
  if (!record) return { status: "not_requested", canRetry: false };
  if (record.status === "accepted")
    return { status: "accepted", canRetry: false };
  if (record.status === "needs_review")
    return { status: "needs_review", canRetry: false };
  const expired =
    !!record.first_attempt_at &&
    now - Date.parse(record.first_attempt_at) >= 23 * 60 * 60 * 1000;
  const canRetry =
    !expired &&
    record.attempt_count < 10 &&
    (!record.next_attempt_at || Date.parse(record.next_attempt_at) <= now);
  return {
    status: record.status === "failed" ? "failed" : "pending",
    canRetry,
  };
}

export async function sendPublicCommentEventInvitation(
  sessionId: string,
  userId: string,
  dependencies: {
    repository?: EventInvitationRepository;
    provider?: ReceiptProvider;
    env?: EventInvitationEnvironment;
  } = {}
): Promise<PublicCommentEventInvitationResult> {
  const repository = dependencies.repository ?? eventInvitationRepository;
  const env = dependencies.env ?? process.env;
  try {
    const existing = await repository.find(sessionId, userId);
    const current = statusOf(existing);
    if (!existing || !current.canRetry) return current;
    const production = env.VERCEL_ENV === "production";
    const sender =
      env.PUBLIC_COMMENT_EVENT_FROM ?? env.PUBLIC_COMMENT_RECEIPT_FROM ?? "";
    const testRecipient =
      env.PUBLIC_COMMENT_EVENT_TEST_EMAIL ??
      env.PUBLIC_COMMENT_RECEIPT_TEST_EMAIL;
    const enabled =
      (env.PUBLIC_COMMENT_EVENT_EMAIL_ENABLED ??
        env.PUBLIC_COMMENT_RECEIPT_EMAIL_ENABLED) === "true";
    const recipientAllowed = production || existing.recipient === testRecipient;
    const configured =
      enabled &&
      !!(existing.sender || sender) &&
      (dependencies.provider ||
        (env.NODE_ENV !== "test" && !!env.RESEND_API_KEY && recipientAllowed));
    const claimed = await repository.claim({
      sessionId,
      userId,
      sender,
      configFailure: configured ? null : "configuration",
    });
    if (!claimed?.lease_token || !claimed.sender || !claimed.recipient) {
      if (!configured)
        console.warn(
          "public_comment_event_invitation_configuration_unavailable"
        );
      return statusOf(await repository.find(sessionId, userId));
    }
    const expired =
      !claimed.first_attempt_at ||
      Date.now() - Date.parse(claimed.first_attempt_at) >= 23 * 60 * 60 * 1000;
    const result = expired
      ? { status: "needs_review" as const }
      : await (
          dependencies.provider ??
          createEventInvitationProvider(env.RESEND_API_KEY ?? "")
        ).send({
          from: claimed.sender,
          to: claimed.recipient,
          subject: claimed.subject,
          text: claimed.body,
          html: claimed.html,
          idempotencyKey: claimed.idempotency_key,
        });
    await repository.finish({
      invitationId: claimed.id,
      leaseToken: claimed.lease_token,
      providerId: result.status === "accepted" ? result.id : undefined,
      needsReview: result.status === "needs_review",
    });
    if (result.status !== "accepted")
      console.warn("public_comment_event_invitation_send_failed");
    return statusOf(await repository.find(sessionId, userId));
  } catch {
    console.warn("public_comment_event_invitation_processing_failed");
    return { status: "pending", canRetry: true };
  }
}

function createEventInvitationProvider(apiKey: string): ReceiptProvider {
  return {
    async send(email) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": email.idempotencyKey,
          },
          body: JSON.stringify({
            from: email.from,
            to: [email.to],
            subject: email.subject,
            text: email.text,
            html: email.html,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          return {
            status:
              response.status === 409 &&
              body?.name === "invalid_idempotent_request"
                ? ("needs_review" as const)
                : ("failed" as const),
          };
        }
        const body = await response.json();
        return typeof body?.id === "string" && body.id.length > 0
          ? { status: "accepted" as const, id: body.id }
          : { status: "failed" as const };
      } catch {
        return { status: "failed" as const };
      }
    },
  };
}
