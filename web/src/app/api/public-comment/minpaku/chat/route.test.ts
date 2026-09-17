import { beforeEach, describe, expect, it, vi } from "vitest";
import { MINPAKU_QUESTIONS } from "@/features/public-comment/minpaku/shared/campaign";
import { composeMinpakuInterviewMessage } from "@/features/public-comment/minpaku/shared/question";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  session: vi.fn(),
  messages: vi.fn(),
  appendMessage: vi.fn(),
  generate: vi.fn(),
}));

vi.mock("@/lib/telemetry/register", () => ({
  registerNodeTelemetry: vi.fn(),
}));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: mocks.user,
}));
vi.mock("@/features/chat/server/services/system-cost-guard", () => ({
  checkSystemDailyCostLimit: vi.fn(),
  checkSystemMonthlyCostLimit: vi.fn(),
}));
vi.mock("@/features/public-comment/minpaku/server/ai", () => ({
  generateInterviewResponse: mocks.generate,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  appendMessage: mocks.appendMessage,
  findMessages: mocks.messages,
  findSessionForUser: mocks.session,
  PublicCommentCompletedError: class PublicCommentCompletedError extends Error {},
}));

import { POST } from "./route";

describe("POST /api/public-comment/minpaku/chat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "owner" });
    mocks.session.mockResolvedValue({ id: "session-1", completed_at: null });
    mocks.messages
      .mockResolvedValueOnce([
        {
          id: "message-1",
          role: "assistant",
          question_id: "relationship",
          content: composeMinpakuInterviewMessage("", MINPAKU_QUESTIONS[0]),
        },
      ])
      .mockResolvedValueOnce([]);
    mocks.generate.mockResolvedValue({
      text: "近隣で暮らしていることが関心につながっているのですね。",
      question_id: "experience",
      topic_title: "AIが返した見出し",
      quick_replies: [],
      next_stage: "interview",
    });
    mocks.appendMessage
      .mockResolvedValueOnce({ id: "message-2" })
      .mockResolvedValueOnce({ id: "message-3" });
  });

  it("直前の回答への受け止めの後ろに固定説明と固定質問を保存する", async () => {
    const response = await POST(
      new Request("http://localhost/api/public-comment/minpaku/chat", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session-1",
          content: "近隣で暮らしています。",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.appendMessage).toHaveBeenNthCalledWith(2, {
      sessionId: "session-1",
      role: "assistant",
      stage: "interview",
      questionId: "priority",
      content: composeMinpakuInterviewMessage(
        "近隣で暮らしていることが関心につながっているのですね。",
        MINPAKU_QUESTIONS[1]
      ),
    });
    expect(await response.json()).toMatchObject({
      nextStage: "interview",
      topicTitle: "関心のある論点",
    });
  });
});
