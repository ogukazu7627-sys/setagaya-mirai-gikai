import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUICIDE_PREVENTION_QUESTIONS } from "@/features/public-comment/suicide-prevention/shared/campaign";

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
vi.mock("@/features/public-comment/suicide-prevention/server/ai", () => ({
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

const request = (content = "私の意見") =>
  new Request("http://localhost/api/public-comment/suicide-prevention/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId: "session-1", content }),
  });

describe("POST /api/public-comment/suicide-prevention/chat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ id: "owner" });
    mocks.findCampaign.mockResolvedValue({ id: "campaign-suicide-prevention" });
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      completed_at: null,
    });
    mocks.findMessages.mockResolvedValue([]);
    mocks.generate.mockResolvedValue({
      text: "ありがとうございます。次の質問です。",
      question_id: SUICIDE_PREVENTION_QUESTIONS[1].id,
      topic_title: SUICIDE_PREVENTION_QUESTIONS[1].topic,
      quick_replies: [],
      next_stage: "interview",
    });
    mocks.appendMessage
      .mockResolvedValueOnce({ id: "user-1" })
      .mockResolvedValueOnce({
        id: "assistant-1",
        role: "assistant",
        content: "ありがとうございます。次の質問です。",
      });
  });

  it("別キャンペーンのセッションに回答を追加できない", async () => {
    mocks.findSession.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(mocks.findSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner",
      "campaign-suicide-prevention"
    );
    expect(mocks.appendMessage).not.toHaveBeenCalled();
  });

  it("通常の政策意見は保存して次の質問へ進む", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.appendMessage).toHaveBeenCalledTimes(2);
    await expect(response.json()).resolves.toMatchObject({
      userMessageStored: true,
      nextStage: "interview",
      topicTitle: SUICIDE_PREVENTION_QUESTIONS[1].topic,
    });
  });

  it("最終質問中でも危機が示されたら下書きへ進めず、安全案内を優先する", async () => {
    mocks.findMessages.mockResolvedValue(
      SUICIDE_PREVENTION_QUESTIONS.slice(0, -1).map((question, index) => ({
        id: `user-${index}`,
        role: "user",
        content: `回答${index + 1}`,
        question_id: question.id,
      }))
    );
    mocks.generate.mockResolvedValue({
      text: "今すぐ危険がある場合は119または110へ連絡してください。",
      question_id: null,
      topic_title: null,
      quick_replies: [],
      next_stage: "interview",
    });
    mocks.appendMessage.mockReset().mockResolvedValueOnce({
      id: "assistant-final",
      role: "assistant",
      content: "今すぐ危険がある場合は119または110へ連絡してください。",
      question_id: null,
    });

    const response = await POST(request("最終回答"));

    expect(response.status).toBe(200);
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ nextQuestionId: "" })
    );
    expect(mocks.appendMessage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        role: "assistant",
        questionId: null,
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      userMessageStored: false,
      nextStage: "interview",
      quickReplies: [],
      topicTitle: null,
    });
  });

  it("危機を示す入力は保存せず、次の質問や選択肢を重ねない", async () => {
    mocks.generate.mockResolvedValue({
      text: "今すぐ危険がある場合は119または110へ連絡し、近くの人にも助けを求めてください。",
      question_id: null,
      topic_title: null,
      quick_replies: [],
      next_stage: "interview",
    });
    mocks.appendMessage.mockReset().mockResolvedValueOnce({
      id: "assistant-safety",
      role: "assistant",
      content:
        "今すぐ危険がある場合は119または110へ連絡し、近くの人にも助けを求めてください。",
      question_id: null,
    });

    const response = await POST(request("いま安全を保てない状況です"));

    expect(response.status).toBe(200);
    expect(mocks.appendMessage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        role: "assistant",
        questionId: null,
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      userMessageStored: false,
      nextStage: "interview",
      quickReplies: [],
      topicTitle: null,
    });
  });
});
