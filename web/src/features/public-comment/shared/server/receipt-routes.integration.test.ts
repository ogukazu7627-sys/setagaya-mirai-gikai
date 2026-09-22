import { createPublicCommentFixture } from "@test-utils/public-comment-utils";
import { adminClient } from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "../../minpaku/shared/consent";

const external = vi.hoisted(() => ({ getUser: vi.fn(), send: vi.fn() }));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: external.getUser,
}));
// Exercise the real repositories, transactions and delivery leases. Only the
// external authentication boundary and email provider are replaced.
vi.mock(
  "@/features/public-comment/minpaku/server/receipt",
  async (importOriginal) => {
    const actual =
      await importOriginal<typeof import("../../minpaku/server/receipt")>();
    return {
      ...actual,
      sendPublicCommentReceipt: (sessionId: string, userId: string) =>
        actual.sendPublicCommentReceipt(sessionId, userId, {
          provider: { send: external.send },
          env: {
            PUBLIC_COMMENT_RECEIPT_EMAIL_ENABLED: "true",
            PUBLIC_COMMENT_RECEIPT_FROM: "noreply@example.test",
          },
        }),
    };
  }
);
vi.mock("./event-invitation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./event-invitation")>();
  return {
    ...actual,
    sendPublicCommentEventInvitation: (sessionId: string, userId: string) =>
      actual.sendPublicCommentEventInvitation(sessionId, userId, {
        provider: { send: external.send },
        env: {
          PUBLIC_COMMENT_EVENT_EMAIL_ENABLED: "true",
          PUBLIC_COMMENT_EVENT_FROM: "noreply@example.test",
        },
      }),
  };
});

import { POST as minpakuComplete } from "@/app/api/public-comment/minpaku/complete/route";
import { createPublicCommentCompleteHandler } from "./receipt-routes";

const url = new URL(process.env.SUPABASE_URL ?? "http://127.0.0.1:54421");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Completion integration tests require local Supabase");

describe.each([
  "minpaku",
  "shared",
])("%s completion HTTP and real DB", (route) => {
  let fixture: Awaited<ReturnType<typeof createPublicCommentFixture>>;
  let sessionId: string;
  let complete: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    fixture = await createPublicCommentFixture();
    sessionId = (await fixture.createSession()).id;
    const draft = await adminClient.from("public_comment_drafts").insert({
      session_id: sessionId,
      ai_body: "Original draft",
      final_body: "User's final edited comment",
      target_ordinances: ["Test ordinance"],
    });
    expect(draft.error).toBeNull();
    const messages = await adminClient.from("public_comment_messages").insert({
      session_id: sessionId,
      role: "user",
      content: "Private interview answer",
      stage: "interview",
    });
    expect(messages.error).toBeNull();
    external.getUser.mockResolvedValue(fixture.user);
    external.send.mockResolvedValue({
      status: "accepted",
      id: "fake-provider-id",
    });
    complete =
      route === "minpaku"
        ? minpakuComplete
        : createPublicCommentCompleteHandler(fixture.campaign.slug);
  });

  afterEach(async () => {
    await fixture?.cleanup();
  });

  const request = (optIn = true) =>
    new Request("http://localhost/complete", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        publicationRequested: false,
        receiptOptIn: optIn,
        eventInvitationOptIn: optIn,
        consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
      }),
    });

  it.each([
    true,
    false,
  ])("completes with current UI consent and opt-in %s", async (optIn) => {
    const response = await complete(request(optIn));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "private",
      receipt: {
        status: optIn ? "accepted" : "not_requested",
        canRetry: false,
      },
      eventInvitation: {
        status: optIn ? "accepted" : "not_requested",
        canRetry: false,
      },
    });
    expect(external.send).toHaveBeenCalledTimes(optIn ? 2 : 0);
    if (optIn) {
      const emails = external.send.mock.calls.map(([email]) => email);
      for (const email of emails) {
        expect(email.to).toBe(fixture.user.email);
        expect(email.text).toBeTruthy();
        expect(email.html).toBeTruthy();
      }
      const receipt = emails.find((email) =>
        email.idempotencyKey.startsWith("public-comment-receipt/")
      );
      expect(receipt.text).toContain("User's final edited comment");
      expect(receipt.text).toContain("Private interview answer");
      const event = emails.find((email) =>
        email.idempotencyKey.startsWith("public-comment-event-invitation/")
      );
      expect(event.text).not.toContain("Private interview answer");
      expect(event.text).toMatch(
        /http:\/\/localhost:3000\/events\/youth-dialogue-2026-10-03\/invite\/[0-9a-f-]{36}/
      );
      expect(event.text).not.toContain("forms.gle");
    }
    // A lost response or repeated click must not generate a second delivery.
    expect((await complete(request(optIn))).status).toBe(200);
    expect(external.send).toHaveBeenCalledTimes(optIn ? 2 : 0);
  });

  it("keeps the interview complete if only the event email fails", async () => {
    external.send.mockImplementation(async (email) =>
      email.idempotencyKey.startsWith("public-comment-event-invitation/")
        ? { status: "failed" }
        : { status: "accepted", id: "fake-receipt-id" }
    );
    const response = await complete(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "private",
      receipt: { status: "accepted" },
      eventInvitation: { status: "failed" },
    });
    const session = await adminClient
      .from("public_comment_sessions")
      .select("completed_at")
      .eq("id", sessionId)
      .single();
    expect(session.error).toBeNull();
    expect(session.data?.completed_at).toBeTruthy();
  });
});
