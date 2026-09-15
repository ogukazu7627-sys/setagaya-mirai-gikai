import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findCampaign: vi.fn(),
  findActiveSession: vi.fn(),
  createSession: vi.fn(),
  findMessages: vi.fn(),
  appendMessage: vi.fn(),
}));

vi.mock("@/lib/telemetry/register", () => ({
  registerNodeTelemetry: vi.fn(),
}));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getAnonymousPublicCommentUser: mocks.getUser,
}));
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
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: "anonymous-user" });
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
        body: JSON.stringify({ consented: true }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.createSession).toHaveBeenCalledWith({
      campaignId: "campaign-1",
      userId: "anonymous-user",
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
  });
});
