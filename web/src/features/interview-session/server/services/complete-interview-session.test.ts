import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ChatError,
  ChatErrorCode,
} from "@/features/chat/shared/types/errors";
import { env } from "@/lib/env";

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SETAGAYA_MOCK_MODE = "true";
  process.env.SETAGAYA_MOCK_MODE = "true";

  return {
    evaluateModerationScore: vi.fn(),
    findInterviewMessagesBySessionIdDesc: vi.fn(),
    findInterviewReportBySessionId: vi.fn(),
    findInterviewSessionWithConfigById: vi.fn(),
    isWithinDailyCostLimit: vi.fn(),
    isWithinDailyPromptUsageLimit: vi.fn(),
    recordChatUsage: vi.fn(),
    syncInterviewOpinions: vi.fn(),
    updateInterviewSessionCompleted: vi.fn(),
    upsertInterviewReport: vi.fn(),
  };
});

// @ts-expect-error Vitest supports virtual mocks for Next's server-only marker.
vi.mock("server-only", () => ({}), { virtual: true });

vi.mock("@/features/chat/server/services/cost-tracker", () => ({
  isWithinDailyCostLimit: mocks.isWithinDailyCostLimit,
  isWithinDailyPromptUsageLimit: mocks.isWithinDailyPromptUsageLimit,
  recordChatUsage: mocks.recordChatUsage,
}));

vi.mock("@mirai-gikai/shared/interview-report/sync-opinions", () => ({
  syncInterviewOpinions: mocks.syncInterviewOpinions,
}));

vi.mock("../repositories/interview-session-repository", () => ({
  findInterviewMessagesBySessionIdDesc:
    mocks.findInterviewMessagesBySessionIdDesc,
  findInterviewReportBySessionId: mocks.findInterviewReportBySessionId,
  findInterviewSessionWithConfigById: mocks.findInterviewSessionWithConfigById,
  updateInterviewSessionCompleted: mocks.updateInterviewSessionCompleted,
  upsertInterviewReport: mocks.upsertInterviewReport,
}));

vi.mock("./evaluate-moderation-score", () => ({
  evaluateModerationScore: mocks.evaluateModerationScore,
}));

import { completeInterviewSession } from "./complete-interview-session";

const reportMessage = JSON.stringify({
  text: "インタビューのまとめです。",
  report: {
    summary: "防災情報を分かりやすくしてほしい",
    stance: "for",
    role: "general_citizen",
    role_description: "世田谷区民",
    role_title: "区民",
    opinions: [
      {
        title: "情報提供",
        content: "災害時の情報を早く知りたい",
        source_message_id: null,
        contextual_quote: null,
        bill_sentiment: "期待",
      },
    ],
    content_richness: {
      total: 70,
      clarity: 80,
      specificity: 60,
      impact: 70,
      constructiveness: 65,
      reasoning: "具体的な理由がある",
    },
  },
});

const messages = [
  {
    id: "message-2",
    interview_session_id: "session-1",
    role: "assistant",
    content: reportMessage,
    created_at: "2026-07-20T00:01:00.000Z",
  },
  {
    id: "message-1",
    interview_session_id: "session-1",
    role: "user",
    content: "災害時の情報を早く知りたいです",
    created_at: "2026-07-20T00:00:00.000Z",
  },
];

const savedReport = {
  id: "report-1",
  interview_session_id: "session-1",
  summary: "防災情報を分かりやすくしてほしい",
  opinions: [
    {
      title: "情報提供",
      content: "災害時の情報を早く知りたい",
    },
  ],
};

describe("completeInterviewSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findInterviewSessionWithConfigById.mockResolvedValue({
      id: "session-1",
      completed_at: null,
      interview_configs: { bill_id: "bill-1" },
    });
    mocks.findInterviewReportBySessionId.mockResolvedValue(null);
    mocks.isWithinDailyCostLimit.mockResolvedValue(true);
    mocks.isWithinDailyPromptUsageLimit.mockResolvedValue(true);
    mocks.findInterviewMessagesBySessionIdDesc.mockResolvedValue(messages);
    mocks.evaluateModerationScore.mockResolvedValue({
      score: 12,
      status: "ok",
      reasoning: "問題なし",
      model: "openai/gpt-5.2",
      usage: {
        inputTokens: 100,
        outputTokens: 20,
        totalTokens: 120,
      },
      costUsd: 0.0012,
      finishReason: "stop",
    });
    mocks.recordChatUsage.mockResolvedValue(undefined);
    mocks.upsertInterviewReport.mockResolvedValue(savedReport);
    mocks.syncInterviewOpinions.mockResolvedValue(undefined);
    mocks.updateInterviewSessionCompleted.mockResolvedValue(undefined);
  });

  it("未完了セッションではコスト・回数ガード後にモデレーション利用を記録する", async () => {
    const report = await completeInterviewSession({
      sessionId: "session-1",
      userId: "user-1",
      isPublicByUser: true,
    });

    expect(report).toBe(savedReport);
    expect(mocks.isWithinDailyCostLimit).toHaveBeenCalledWith(
      "user-1",
      env.chat.dailyUserCostLimitUsd
    );
    expect(mocks.isWithinDailyPromptUsageLimit).toHaveBeenCalledWith(
      "user-1",
      "interview-complete-moderation",
      env.interviewComplete.dailyUserLimit
    );
    expect(mocks.evaluateModerationScore).toHaveBeenCalledTimes(1);
    expect(mocks.recordChatUsage).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "session-1",
      promptName: "interview-complete-moderation",
      model: "openai/gpt-5.2",
      usage: {
        inputTokens: 100,
        outputTokens: 20,
        totalTokens: 120,
      },
      costUsd: 0.0012,
      metadata: {
        pageType: "interview",
        billId: "bill-1",
        finishReason: "stop",
        stepCount: 0,
        moderationScore: 12,
      },
    });
  });

  it("既存レポートがある場合はLLMとガードを再実行せず既存レポートを返す", async () => {
    mocks.findInterviewReportBySessionId.mockResolvedValue(savedReport);

    const report = await completeInterviewSession({
      sessionId: "session-1",
      userId: "user-1",
    });

    expect(report).toBe(savedReport);
    expect(mocks.isWithinDailyCostLimit).not.toHaveBeenCalled();
    expect(mocks.isWithinDailyPromptUsageLimit).not.toHaveBeenCalled();
    expect(mocks.findInterviewMessagesBySessionIdDesc).not.toHaveBeenCalled();
    expect(mocks.evaluateModerationScore).not.toHaveBeenCalled();
    expect(mocks.recordChatUsage).not.toHaveBeenCalled();
    expect(mocks.upsertInterviewReport).not.toHaveBeenCalled();
    expect(mocks.updateInterviewSessionCompleted).toHaveBeenCalledWith(
      "session-1"
    );
  });

  it("ユーザー日次コスト上限に達している場合はLLMを呼ばない", async () => {
    mocks.isWithinDailyCostLimit.mockResolvedValue(false);

    await expect(
      completeInterviewSession({
        sessionId: "session-1",
        userId: "user-1",
      })
    ).rejects.toMatchObject({
      code: ChatErrorCode.DAILY_COST_LIMIT_REACHED,
    } satisfies Partial<ChatError>);

    expect(mocks.evaluateModerationScore).not.toHaveBeenCalled();
    expect(mocks.recordChatUsage).not.toHaveBeenCalled();
  });

  it("ユーザー日次完了回数上限に達している場合はLLMを呼ばない", async () => {
    mocks.isWithinDailyPromptUsageLimit.mockResolvedValue(false);

    await expect(
      completeInterviewSession({
        sessionId: "session-1",
        userId: "user-1",
      })
    ).rejects.toMatchObject({
      code: ChatErrorCode.DAILY_REQUEST_LIMIT_REACHED,
    } satisfies Partial<ChatError>);

    expect(mocks.evaluateModerationScore).not.toHaveBeenCalled();
    expect(mocks.recordChatUsage).not.toHaveBeenCalled();
  });
});
