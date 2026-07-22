import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findReportBySessionId: vi.fn(),
  updateReportPublicSetting: vi.fn(),
  verifySessionOwnership: vi.fn(),
}));

vi.mock(
  "@/features/interview-report/server/repositories/interview-report-repository",
  () => ({
    findReportBySessionId: mocks.findReportBySessionId,
    updateReportPublicSetting: mocks.updateReportPublicSetting,
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
  return new Request("http://localhost/api/interview/public-setting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/interview/public-setting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifySessionOwnership.mockResolvedValue({
      authorized: true,
      userId: "user-1",
    });
    mocks.findReportBySessionId.mockResolvedValue({ id: "report-1" });
    mocks.updateReportPublicSetting.mockResolvedValue(undefined);
  });

  it("所有者確認後に公開設定を更新する", async () => {
    const res = await POST(request({ sessionId: "session-1", isPublic: true }));

    expect(res.status).toBe(200);
    expect(mocks.verifySessionOwnership).toHaveBeenCalledWith("session-1");
    expect(mocks.updateReportPublicSetting).toHaveBeenCalledWith(
      "report-1",
      true
    );
    await expect(res.json()).resolves.toEqual({ success: true });
  });

  it("不正な公開設定値は400を返す", async () => {
    const res = await POST(
      request({ sessionId: "session-1", isPublic: "yes" })
    );

    expect(res.status).toBe(400);
    expect(mocks.verifySessionOwnership).not.toHaveBeenCalled();
  });
});
