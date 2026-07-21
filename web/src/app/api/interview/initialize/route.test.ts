import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkSystemDailyCostLimit: vi.fn(),
  checkSystemMonthlyCostLimit: vi.fn(),
  getChatSupabaseUser: vi.fn(),
  getInterviewQuestions: vi.fn(),
  initializeInterviewChat: vi.fn(),
  registerNodeTelemetry: vi.fn(),
  resolveInterviewRuntimeAccess: vi.fn(),
}));

vi.mock("@/features/chat/server/services/system-cost-guard", () => ({
  checkSystemDailyCostLimit: mocks.checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit: mocks.checkSystemMonthlyCostLimit,
}));

vi.mock("@/features/chat/server/utils/supabase-server", () => ({
  getChatSupabaseUser: mocks.getChatSupabaseUser,
}));

vi.mock(
  "@/features/interview-config/server/loaders/get-interview-questions",
  () => ({
    getInterviewQuestions: mocks.getInterviewQuestions,
  })
);

vi.mock(
  "@/features/interview-session/server/loaders/initialize-interview-chat",
  () => ({
    initializeInterviewChat: mocks.initializeInterviewChat,
  })
);

vi.mock(
  "@/features/interview-session/server/services/resolve-interview-runtime-access",
  () => ({
    resolveInterviewRuntimeAccess: mocks.resolveInterviewRuntimeAccess,
  })
);

vi.mock("@/lib/telemetry/register", () => ({
  registerNodeTelemetry: mocks.registerNodeTelemetry,
}));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/interview/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/interview/initialize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkSystemDailyCostLimit.mockResolvedValue(undefined);
    mocks.checkSystemMonthlyCostLimit.mockResolvedValue(undefined);
    mocks.getInterviewQuestions.mockResolvedValue([{ id: "q-1" }]);
  });

  it("未ログインなら401を返す", async () => {
    mocks.getChatSupabaseUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const res = await POST(request({ billId: "bill-1" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Googleログインが必要です",
    });
    expect(mocks.initializeInterviewChat).not.toHaveBeenCalled();
  });

  it("公開中の対象インタビューがなければ404を返す", async () => {
    mocks.getChatSupabaseUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.resolveInterviewRuntimeAccess.mockResolvedValue(null);

    const res = await POST(request({ billId: "bill-1" }));

    expect(res.status).toBe(404);
    expect(mocks.initializeInterviewChat).not.toHaveBeenCalled();
  });

  it("ログイン済みで公開対象なら既存初期化処理の結果を返す", async () => {
    mocks.getChatSupabaseUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.resolveInterviewRuntimeAccess.mockResolvedValue({
      bill: {
        id: "bill-1",
        name: "正式案件名",
        bill_content: { title: "区民向けタイトル" },
      },
      interviewConfig: {
        id: "config-1",
        mode: "loop",
        estimated_duration: 7,
      },
    });
    mocks.initializeInterviewChat.mockResolvedValue({
      session: {
        id: "session-1",
        started_at: "2026-07-19T00:00:00.000Z",
        rating: null,
      },
      messages: [
        {
          id: "message-1",
          role: "assistant",
          content: "最初の質問です",
          created_at: "2026-07-19T00:00:00.000Z",
        },
      ],
    });

    const res = await POST(request({ billId: "bill-1" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      billTitle: "区民向けタイトル",
      estimatedDuration: 7,
      hasRated: false,
      mode: "loop",
      totalQuestions: 1,
      session: { id: "session-1" },
      messages: [{ id: "message-1" }],
    });
    expect(mocks.initializeInterviewChat).toHaveBeenCalledWith(
      "bill-1",
      "config-1",
      expect.objectContaining({
        generateInitialQuestion: true,
        getUser: expect.any(Function),
      })
    );
  });

  it("初回質問を後回しにする指定ならセッションだけ初期化する", async () => {
    mocks.getChatSupabaseUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.resolveInterviewRuntimeAccess.mockResolvedValue({
      bill: {
        id: "bill-1",
        name: "正式案件名",
        bill_content: { title: "区民向けタイトル" },
      },
      interviewConfig: {
        id: "config-1",
        mode: "loop",
        estimated_duration: 7,
      },
    });
    mocks.initializeInterviewChat.mockResolvedValue({
      session: {
        id: "session-1",
        started_at: "2026-07-19T00:00:00.000Z",
        rating: null,
      },
      messages: [],
    });

    const res = await POST(
      request({ billId: "bill-1", deferInitialQuestion: true })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      session: { id: "session-1" },
      messages: [],
    });
    expect(mocks.initializeInterviewChat).toHaveBeenCalledWith(
      "bill-1",
      "config-1",
      expect.objectContaining({
        generateInitialQuestion: false,
        getUser: expect.any(Function),
      })
    );
  });
});
