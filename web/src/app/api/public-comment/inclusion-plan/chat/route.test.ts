import { beforeEach, describe, expect, it, vi } from "vitest";
import { INCLUSION_PLAN_QUESTIONS } from "@/features/public-comment/inclusion-plan/shared/campaign";

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
vi.mock("@/features/public-comment/inclusion-plan/server/ai", () => ({
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
  new Request("http://localhost/api/public-comment/inclusion-plan/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId: "session-1", content: "私の意見" }),
  });

describe("POST /api/public-comment/inclusion-plan/chat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ id: "owner" });
    mocks.findCampaign.mockResolvedValue({ id: "campaign-inclusion-plan" });
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      completed_at: null,
    });
  });

  it("別キャンペーンのセッションに回答を追加できない", async () => {
    mocks.findSession.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(mocks.findSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner",
      "campaign-inclusion-plan"
    );
    expect(mocks.appendMessage).not.toHaveBeenCalled();
  });

  it("最終回答もAIを通し、安全案内を含む応答を保存する", async () => {
    mocks.findMessages.mockResolvedValue(
      INCLUSION_PLAN_QUESTIONS.slice(0, -1).map((question, index) => ({
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
    await expect(response.json()).resolves.toMatchObject({
      nextStage: "draft",
      quickReplies: [],
    });
  });
});
