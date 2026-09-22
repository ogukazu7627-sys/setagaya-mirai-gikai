import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PUBLIC_COMMENT_CONSENT_VERSION,
  PUBLIC_COMMENT_EVENT_INVITATION_CONSENT_VERSION,
} from "../../../web/src/features/public-comment/minpaku/shared/consent";
import { createPublicCommentFixture } from "../public-comment-utils";
import { adminClient, getAnonClient, getAuthenticatedClient } from "../utils";

const url = new URL(process.env.SUPABASE_URL ?? "http://127.0.0.1:54421");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Event completion tests require local Supabase");

describe("event invitation completion RPC (real DB, no external email)", () => {
  let fixture: Awaited<ReturnType<typeof createPublicCommentFixture>>;
  let sessionId: string;

  beforeEach(async () => {
    fixture = await createPublicCommentFixture();
    const session = await fixture.createSession();
    sessionId = session.id;
    const draft = await adminClient.from("public_comment_drafts").insert({
      session_id: sessionId,
      ai_body: "AI draft",
      final_body: "Reviewed final comment",
      target_ordinances: ["Test ordinance"],
    });
    expect(draft.error).toBeNull();
    const message = await adminClient.from("public_comment_messages").insert({
      session_id: sessionId,
      role: "user",
      content: "Private interview answer",
      stage: "interview",
    });
    expect(message.error).toBeNull();
  });

  afterEach(async () => {
    await fixture?.cleanup();
  });

  function args(optIn = true, consentVersion = PUBLIC_COMMENT_CONSENT_VERSION) {
    return {
      p_session_id: sessionId,
      p_user_id: fixture.user.id,
      p_publication_requested: false,
      p_receipt_opt_in: optIn,
      p_event_invitation_opt_in: optIn,
      p_consent_version: consentVersion,
      p_event_invitation_consent_version:
        PUBLIC_COMMENT_EVENT_INVITATION_CONSENT_VERSION,
      p_event_subject: "Event invitation",
      p_event_body: "An invitation without interview answers",
      p_event_html: "<p>Event invitation</p>",
      p_event_click_token: randomUUID(),
    };
  }

  async function read() {
    const [session, receipt, invitation] = await Promise.all([
      adminClient
        .from("public_comment_sessions")
        .select()
        .eq("id", sessionId)
        .single(),
      adminClient
        .from("public_comment_receipts")
        .select()
        .eq("session_id", sessionId)
        .maybeSingle(),
      adminClient
        .from("public_comment_event_invitations")
        .select()
        .eq("session_id", sessionId)
        .maybeSingle(),
    ]);
    expect(session.error).toBeNull();
    expect(receipt.error).toBeNull();
    expect(invitation.error).toBeNull();
    return {
      session: session.data,
      receipt: receipt.data,
      invitation: invitation.data,
    };
  }

  it.each([
    true,
    false,
  ])("accepts the application's current consent with email opt-in %s", async (optIn) => {
    const result = await adminClient.rpc(
      "complete_public_comment_session_with_event_invitation",
      args(optIn)
    );
    expect(result.error).toBeNull();
    expect(result.data).toBe("private");
    const state = await read();
    expect(state.session).toMatchObject({
      consent_version: PUBLIC_COMMENT_CONSENT_VERSION,
      receipt_opt_in: optIn,
      event_invitation_opt_in: optIn,
      publication_status: "private",
    });
    expect(state.session?.completed_at).toBeTruthy();
    if (optIn) {
      expect(state.receipt).toMatchObject({
        recipient: fixture.user.email,
        status: "pending",
        final_body: "Reviewed final comment",
      });
      expect(state.receipt?.body).toContain("Private interview answer");
      expect(state.invitation).toMatchObject({
        recipient: fixture.user.email,
        status: "pending",
        body: args().p_event_body,
        html: args().p_event_html,
      });
      expect(state.invitation?.body).not.toContain("Private interview answer");
    } else {
      expect(state.receipt).toBeNull();
      expect(state.invitation).toBeNull();
    }
  });

  it.each([
    "2026-09-16-receipt-v1",
    "2026-09-18-late-google-auth-v1",
  ])("keeps compatibility with consent %s", async (version) => {
    const result = await adminClient.rpc(
      "complete_public_comment_session_with_event_invitation",
      args(true, version)
    );
    expect(result.error).toBeNull();
  });

  it("keeps compatibility with the previous event invitation consent", async () => {
    const input = args();
    input.p_event_invitation_consent_version = "2026-09-22-event-funnel-v1";
    const result = await adminClient.rpc(
      "complete_public_comment_session_with_event_invitation",
      input
    );
    expect(result.error).toBeNull();
  });

  it.each([
    ["consent", "public_comment_invalid_consent"],
    ["event", "public_comment_invalid_event_invitation"],
    ["draft", "public_comment_draft_required"],
    ["owner", "public_comment_not_found"],
  ])("rolls back all completion and email records for invalid %s", async (invalid, expectedReason) => {
    const input = args();
    if (invalid === "consent") input.p_consent_version = "unsupported";
    if (invalid === "event")
      input.p_event_invitation_consent_version = "unsupported";
    if (invalid === "owner") input.p_user_id = randomUUID();
    if (invalid === "draft") {
      const deleted = await adminClient
        .from("public_comment_drafts")
        .delete()
        .eq("session_id", sessionId);
      expect(deleted.error).toBeNull();
    }
    const result = await adminClient.rpc(
      "complete_public_comment_session_with_event_invitation",
      input
    );
    expect(result.error?.message).toBe(expectedReason);
    const state = await read();
    expect(state.session?.completed_at).toBeNull();
    expect(state.receipt).toBeNull();
    expect(state.invitation).toBeNull();
  });

  it("serializes concurrent completion and freezes both mail snapshots", async () => {
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        adminClient.rpc(
          "complete_public_comment_session_with_event_invitation",
          args()
        )
      )
    );
    for (const result of results) {
      expect(result.error).toBeNull();
      expect(result.data).toBe("private");
    }
    const original = await read();
    const retry = await adminClient.rpc(
      "complete_public_comment_session_with_event_invitation",
      { ...args(false), p_event_body: "Changed body" }
    );
    expect(retry.error).toBeNull();
    expect(await read()).toEqual(original);

    const modified = await adminClient
      .from("public_comment_event_invitations")
      .update({ body: "Changed body" })
      .eq("session_id", sessionId);
    expect(modified.error?.message).toContain(
      "public_comment_event_invitation_immutable"
    );
    const published = await adminClient
      .from("public_comment_sessions")
      .update({ publication_status: "published" })
      .eq("id", sessionId);
    expect(published.error?.message).toContain(
      "completed_private_public_comment_is_immutable"
    );
  });

  it("does not enqueue mail for an existing completed session", async () => {
    const completed = await adminClient.rpc("complete_public_comment_session", {
      p_session_id: sessionId,
      p_user_id: fixture.user.id,
      p_publication_requested: false,
      p_receipt_opt_in: false,
      p_consent_version: PUBLIC_COMMENT_CONSENT_VERSION,
    });
    expect(completed.error).toBeNull();
    const retry = await adminClient.rpc(
      "complete_public_comment_session_with_event_invitation",
      args()
    );
    expect(retry.error).toBeNull();
    const state = await read();
    expect(state.receipt).toBeNull();
    expect(state.invitation).toBeNull();
  });

  it("retries a failed event delivery without duplicating an accepted receipt", async () => {
    expect(
      (
        await adminClient.rpc(
          "complete_public_comment_session_with_event_invitation",
          args()
        )
      ).error
    ).toBeNull();
    const claimArgs = {
      p_session_id: sessionId,
      p_user_id: fixture.user.id,
      p_sender: "noreply@example.test",
    };
    const receipt = await adminClient.rpc(
      "claim_public_comment_receipt",
      claimArgs
    );
    expect(receipt.error).toBeNull();
    expect(receipt.data).toHaveLength(1);
    const receiptRow = receipt.data?.[0];
    if (!receiptRow?.lease_token) throw new Error("Receipt was not claimed");
    const finished = await adminClient.rpc("finish_public_comment_receipt", {
      p_receipt_id: receiptRow.id,
      p_lease_token: receiptRow.lease_token,
      p_provider_id: "test-receipt-id",
    });
    expect(finished.error).toBeNull();
    const claims = await Promise.all(
      Array.from({ length: 2 }, () =>
        adminClient.rpc("claim_public_comment_event_invitation", claimArgs)
      )
    );
    for (const claim of claims) expect(claim.error).toBeNull();
    const claimed = claims.flatMap((claim) => claim.data ?? []);
    expect(claimed).toHaveLength(1);
    if (!claimed[0]?.lease_token) throw new Error("Invitation was not claimed");
    const failed = await adminClient.rpc(
      "finish_public_comment_event_invitation",
      { p_invitation_id: claimed[0].id, p_lease_token: claimed[0].lease_token }
    );
    expect(failed.error).toBeNull();
    const nextAttempt = await adminClient
      .from("public_comment_event_invitations")
      .update({ next_attempt_at: new Date(0).toISOString() })
      .eq("session_id", sessionId);
    expect(nextAttempt.error).toBeNull();
    const retried = await adminClient.rpc(
      "claim_public_comment_event_invitation",
      claimArgs
    );
    expect(retried.error).toBeNull();
    expect(retried.data).toHaveLength(1);
    const retryRow = retried.data?.[0];
    if (!retryRow?.lease_token) throw new Error("Invitation was not reclaimed");
    expect(retryRow.idempotency_key).toBe(claimed[0].idempotency_key);
    const accepted = await adminClient.rpc(
      "finish_public_comment_event_invitation",
      {
        p_invitation_id: retryRow.id,
        p_lease_token: retryRow.lease_token,
        p_provider_id: "test-event-id",
      }
    );
    expect(accepted.error).toBeNull();
    expect(
      (await adminClient.rpc("claim_public_comment_receipt", claimArgs)).data
    ).toEqual([]);
    const state = await read();
    expect(state.session?.completed_at).toBeTruthy();
    expect(state.receipt?.status).toBe("accepted");
    expect(state.invitation?.status).toBe("accepted");
  });

  it("denies direct RPC calls from browsers", async () => {
    if (!fixture.user.email) throw new Error("Missing test user email");
    const authenticated = await getAuthenticatedClient(
      fixture.user.email,
      "test-password-123"
    );
    for (const client of [getAnonClient(), authenticated]) {
      const result = await client.rpc(
        "complete_public_comment_session_with_event_invitation",
        args()
      );
      expect(result.error).not.toBeNull();
    }
    expect((await read()).session?.completed_at).toBeNull();
  });
});
