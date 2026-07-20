import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";

const mocks = vi.hoisted(() => ({
  checkSystemDailyCostLimit: vi.fn(),
  checkSystemMonthlyCostLimit: vi.fn(),
  completeInterviewSession: vi.fn(),
  verifySessionOwnership: vi.fn(),
}));

vi.mock("@/features/chat/server/services/system-cost-guard", () => ({
  checkSystemDailyCostLimit: mocks.checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit: mocks.checkSystemMonthlyCostLimit,
}));

vi.mock(
  "@/features/interview-session/server/services/complete-interview-session",
  () => ({
    completeInterviewSession: mocks.completeInterviewSession,
  })
);

vi.mock(
  "@/features/interview-session/server/utils/verify-session-ownership",
  () => ({
    verifySessionOwnership: mocks.verifySessionOwnership,
  })
);

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/interview/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/interview/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkSystemDailyCostLimit.mockResolvedValue(undefined);
    mocks.checkSystemMonthlyCostLimit.mockResolvedValue(undefined);
    mocks.verifySessionOwnership.mockResolvedValue({
      authorized: true,
      userId: "user-1",
    });
    mocks.completeInterviewSession.mockResolvedValue({
      id: "report-1",
      interview_session_id: "session-1",
    });
  });

  it("所有者確認後にシステム予算ガードを通し、ユーザーID付きで完了処理を呼ぶ", async () => {
    const res = await POST(request({ sessionId: "session-1", isPublic: true }));

    expect(res.status).toBe(200);
    expect(mocks.checkSystemDailyCostLimit).toHaveBeenCalledTimes(1);
    expect(mocks.checkSystemMonthlyCostLimit).toHaveBeenCalledTimes(1);
    expect(mocks.completeInterviewSession).toHaveBeenCalledWith({
      sessionId: "session-1",
      userId: "user-1",
      isPublicByUser: true,
    });
    await expect(res.json()).resolves.toEqual({
      report: {
        id: "report-1",
        interview_session_id: "session-1",
      },
    });
  });

  it("システム日次上限に達している場合は429を返す", async () => {
    mocks.checkSystemDailyCostLimit.mockRejectedValue(
      new ChatError(ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED)
    );

    const res = await POST(request({ sessionId: "session-1" }));

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      error: "本日の利用上限に達しました。明日0時以降に再度お試しください。",
    });
    expect(mocks.completeInterviewSession).not.toHaveBeenCalled();
  });

  it("システム月次上限に達している場合は429を返す", async () => {
    mocks.checkSystemMonthlyCostLimit.mockRejectedValue(
      new ChatError(ChatErrorCode.SYSTEM_MONTHLY_COST_LIMIT_REACHED)
    );

    const res = await POST(request({ sessionId: "session-1" }));

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      error: "今月の利用上限に達しました。来月1日以降に再度お試しください。",
    });
    expect(mocks.completeInterviewSession).not.toHaveBeenCalled();
  });

  it("所有者でない場合はガードや完了処理を呼ばず403を返す", async () => {
    mocks.verifySessionOwnership.mockResolvedValue({
      authorized: false,
      error: "Forbidden",
    });

    const res = await POST(request({ sessionId: "session-1" }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mocks.checkSystemDailyCostLimit).not.toHaveBeenCalled();
    expect(mocks.completeInterviewSession).not.toHaveBeenCalled();
  });

  it("ユーザー単位の完了回数上限は429に変換する", async () => {
    mocks.completeInterviewSession.mockRejectedValue(
      new ChatError(ChatErrorCode.DAILY_REQUEST_LIMIT_REACHED)
    );

    const res = await POST(request({ sessionId: "session-1" }));

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      error: "本日の利用上限に達しました。明日0時以降に再度お試しください。",
    });
  });
});
