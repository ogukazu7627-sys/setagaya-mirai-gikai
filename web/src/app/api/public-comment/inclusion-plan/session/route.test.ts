import { beforeEach, describe, expect, it, vi } from "vitest";
import { INCLUSION_PLAN_QUESTIONS } from "@/features/public-comment/inclusion-plan/shared/campaign";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findCampaign: vi.fn(),
  findActiveSession: vi.fn(),
  createSession: vi.fn(),
  saveReceiptConsent: vi.fn(),
  findMessages: vi.fn(),
  findDraft: vi.fn(),
  appendMessage: vi.fn(),
}));

vi.mock("@/lib/telemetry/register", () => ({
  registerNodeTelemetry: vi.fn(),
}));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: mocks.getUser,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  appendMessage: mocks.appendMessage,
  createSession: mocks.createSession,
  findActiveSession: mocks.findActiveSession,
  findCampaign: mocks.findCampaign,
  findDraft: mocks.findDraft,
  findMessages: mocks.findMessages,
  saveSessionReceiptConsent: mocks.saveReceiptConsent,
}));

import { POST } from "./route";

const request = () =>
  new Request("http://localhost/api/public-comment/inclusion-plan/session", {
    method: "POST",
    body: JSON.stringify({
      consented: true,
      receiptOptIn: false,
      consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
    }),
  });

describe("POST /api/public-comment/inclusion-plan/session", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ id: "google-user" });
    mocks.findCampaign.mockResolvedValue({
      id: "campaign-inclusion-plan",
      status: "published",
    });
    mocks.findActiveSession.mockResolvedValue({ id: "session-1" });
    mocks.saveReceiptConsent.mockResolvedValue({ id: "session-1" });
    mocks.findDraft.mockResolvedValue(null);
    mocks.findMessages.mockResolvedValue([
      {
        id: "message-1",
        role: "assistant",
        content: INCLUSION_PLAN_QUESTIONS[0].question,
        question_id: INCLUSION_PLAN_QUESTIONS[0].id,
      },
    ]);
  });

  it("再開時もメール控えなしの同意を本人のセッションへ保存する", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.saveReceiptConsent).toHaveBeenCalledExactlyOnceWith({
      sessionId: "session-1",
      userId: "google-user",
      receiptOptIn: false,
      consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
    });
    await expect(response.json()).resolves.toMatchObject({
      sessionId: "session-1",
      nextStage: "interview",
      quickReplies: INCLUSION_PLAN_QUESTIONS[0].quickReplies,
    });
  });

  it("7問の回答後は下書き作成から再開する", async () => {
    mocks.findMessages.mockResolvedValue(
      INCLUSION_PLAN_QUESTIONS.flatMap((question, index) => [
        {
          id: `assistant-${index}`,
          role: "assistant",
          content: question.question,
          question_id: question.id,
        },
        {
          id: `user-${index}`,
          role: "user",
          content: `回答${index + 1}`,
          question_id: question.id,
        },
      ])
    );

    const response = await POST(request());

    await expect(response.json()).resolves.toMatchObject({
      nextStage: "draft",
      quickReplies: [],
    });
  });
});
