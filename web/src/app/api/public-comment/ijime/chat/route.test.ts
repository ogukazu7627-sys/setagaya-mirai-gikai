import { beforeEach, describe, expect, it, vi } from "vitest";
import { IJIME_QUESTIONS } from "@/features/public-comment/ijime/shared/campaign";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findCampaign: vi.fn(),
  findSession: vi.fn(),
  findMessages: vi.fn(),
  appendMessage: vi.fn(),
  generate: vi.fn(),
  checkDaily: vi.fn(),
  checkMonthly: vi.fn(),
}));

vi.mock("@/lib/telemetry/register", () => ({
  registerNodeTelemetry: vi.fn(),
}));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: mocks.getUser,
}));
vi.mock("@/features/chat/server/services/system-cost-guard", () => ({
  checkSystemDailyCostLimit: mocks.checkDaily,
  checkSystemMonthlyCostLimit: mocks.checkMonthly,
}));
vi.mock("@/features/public-comment/ijime/server/ai", () => ({
  generateInterviewResponse: mocks.generate,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  appendMessage: mocks.appendMessage,
  findCampaign: mocks.findCampaign,
  findMessages: mocks.findMessages,
  findSessionForCampaignUser: mocks.findSession,
  PublicCommentCompletedError: class PublicCommentCompletedError extends Error {},
}));

import { POST } from "./route";

const request = () =>
  new Request("http://localhost/api/public-comment/ijime/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId: "session-1", content: "私の意見" }),
  });

describe("POST /api/public-comment/ijime/chat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ id: "owner" });
    mocks.findCampaign.mockResolvedValue({ id: "campaign-ijime" });
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      completed_at: null,
    });
  });

  it("他キャンペーンのセッションに回答を追加できない", async () => {
    mocks.findSession.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(mocks.findSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner",
      "campaign-ijime"
    );
    expect(mocks.appendMessage).not.toHaveBeenCalled();
  });

  it("最後の回答後に追加の回答を保存しない", async () => {
    mocks.findMessages.mockResolvedValue(
      IJIME_QUESTIONS.map((question, index) => ({
        id: `user-${index}`,
        role: "user",
        content: `回答${index + 1}`,
        question_id: question.id,
      }))
    );

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.checkDaily).not.toHaveBeenCalled();
    expect(mocks.appendMessage).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("最終回答もAI応答を通し、危険の訴えを見逃さない", async () => {
    mocks.findMessages.mockResolvedValue(
      IJIME_QUESTIONS.slice(0, -1).map((question, index) => ({
        id: `user-${index}`,
        role: "user",
        content: `回答${index + 1}`,
        question_id: question.id,
      }))
    );
    mocks.generate.mockResolvedValue({
      text: "今すぐ危険がある場合は110または119へつながってください。",
      question_id: null,
      topic_title: null,
      quick_replies: [],
      next_stage: "draft",
    });
    mocks.appendMessage
      .mockResolvedValueOnce({ id: "user-final" })
      .mockResolvedValueOnce({
        id: "assistant-final",
        role: "assistant",
        content: "今すぐ危険がある場合は110または119へつながってください。",
        question_id: null,
      });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ nextQuestionId: "" })
    );
    expect(mocks.appendMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        role: "assistant",
        questionId: null,
        content: expect.stringContaining("110または119"),
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      nextStage: "draft",
      quickReplies: [],
    });
  });

  it("AI応答の生成失敗時は回答数を進めず再試行できる", async () => {
    mocks.findMessages.mockResolvedValue([]);
    mocks.generate.mockRejectedValue(new Error("provider unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.appendMessage).not.toHaveBeenCalled();
  });
});
