import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findCampaign: vi.fn(),
  findActiveSession: vi.fn(),
  createSession: vi.fn(),
  findMessages: vi.fn(),
  appendMessage: vi.fn(),
  saveEmailPreference: vi.fn(),
}));

vi.mock("@/lib/telemetry/register", () => ({
  registerNodeTelemetry: vi.fn(),
}));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: mocks.getUser,
}));
vi.mock(
  "@/features/public-comment/minpaku/server/email-preference-repository",
  () => ({
    savePublicCommentEmailPreference: mocks.saveEmailPreference,
  })
);
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  appendMessage: mocks.appendMessage,
  createSession: mocks.createSession,
  findActiveSession: mocks.findActiveSession,
  findCampaign: mocks.findCampaign,
  findMessages: mocks.findMessages,
}));

import { POST } from "./route";

describe("POST /api/public-comment/minpaku/session", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ id: "google-user" });
    mocks.findCampaign.mockResolvedValue({
      id: "campaign-1",
      status: "published",
    });
    mocks.findActiveSession.mockResolvedValue(null);
    mocks.createSession.mockResolvedValue({ id: "session-1" });
    mocks.findMessages.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "message-1",
        role: "assistant",
        content: "最初の質問",
      },
    ]);
    mocks.appendMessage.mockResolvedValue({ id: "message-1" });
  });

  it("同意前はユーザー・キャンペーン・DBへ進まない", async () => {
    const response = await POST(
      new Request("http://localhost/api/public-comment/minpaku/session", {
        method: "POST",
        body: JSON.stringify({ consented: false }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("同意後にだけ専用セッションと最初の質問を作る", async () => {
    const response = await POST(
      new Request("http://localhost/api/public-comment/minpaku/session", {
        method: "POST",
        body: JSON.stringify({
          consented: true,
          emailOptIn: false,
          consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.createSession).toHaveBeenCalledWith({
      campaignId: "campaign-1",
      userId: "google-user",
    });
    expect(mocks.appendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        role: "assistant",
        stage: "interview",
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      sessionId: "session-1",
      quickReplies: expect.any(Array),
    });
    expect(mocks.saveEmailPreference).toHaveBeenCalledWith(
      "google-user",
      false
    );
  });

  it("メールの明示同意を認証済み本人のIDに保存する", async () => {
    const response = await POST(
      new Request("http://localhost/api/public-comment/minpaku/session", {
        method: "POST",
        body: JSON.stringify({
          consented: true,
          emailOptIn: true,
          consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
          userId: "other-user",
          email: "other@example.com",
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(mocks.saveEmailPreference).toHaveBeenCalledWith("google-user", true);
  });

  it.each([
    { consented: true },
    {
      consented: true,
      emailOptIn: "true",
      consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
    },
    { consented: true, emailOptIn: true, consentVersion: "old" },
  ])("不完全・古い同意では保存しない: %j", async (body) => {
    const response = await POST(
      new Request("http://localhost/api/public-comment/minpaku/session", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );
    expect(response.status).toBe(400);
    expect(mocks.saveEmailPreference).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("未ログインではメール設定・セッションを保存しない", async () => {
    mocks.getUser.mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/public-comment/minpaku/session", {
        method: "POST",
        body: JSON.stringify({
          consented: true,
          emailOptIn: false,
          consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
        }),
      })
    );
    expect(response.status).toBe(401);
    expect(mocks.saveEmailPreference).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("メール設定の保存失敗時はセッションを開始しない", async () => {
    mocks.saveEmailPreference.mockRejectedValue(
      new Error("database unavailable")
    );
    const response = await POST(
      new Request("http://localhost/api/public-comment/minpaku/session", {
        method: "POST",
        body: JSON.stringify({
          consented: true,
          emailOptIn: true,
          consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
        }),
      })
    );
    expect(response.status).toBe(500);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
