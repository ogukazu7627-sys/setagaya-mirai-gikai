import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkSystemDailyCostLimit: vi.fn(),
  checkSystemMonthlyCostLimit: vi.fn(),
  getChatSupabaseUser: vi.fn(),
  handleInterviewChatRequest: vi.fn(),
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
  "@/features/interview-session/server/services/handle-interview-chat-request",
  () => ({ handleInterviewChatRequest: mocks.handleInterviewChatRequest })
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

function request() {
  return new Request("http://localhost/api/interview/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      billId: "bill-1",
      currentStage: "chat",
      messages: [],
    }),
  });
}

describe("POST /api/interview/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("匿名認証だけではチャット処理を開始せず401を返す", async () => {
    mocks.getChatSupabaseUser.mockResolvedValue({
      data: {
        user: {
          id: "anonymous-user",
          app_metadata: { provider: "anonymous" },
        },
      },
      error: null,
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Googleログインが必要です",
    });
    expect(mocks.resolveInterviewRuntimeAccess).not.toHaveBeenCalled();
    expect(mocks.handleInterviewChatRequest).not.toHaveBeenCalled();
  });
});
