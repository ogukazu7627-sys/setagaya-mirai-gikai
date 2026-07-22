import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findInterviewSessionWithConfigById: vi.fn(),
  getEmptyReportRecipientSelectionForBill: vi.fn(),
  verifySessionOwnership: vi.fn(),
}));

vi.mock(
  "@/features/councilor-digest/server/repositories/report-recipient-repository",
  () => ({
    getEmptyReportRecipientSelectionForBill:
      mocks.getEmptyReportRecipientSelectionForBill,
  })
);

vi.mock(
  "@/features/interview-session/server/repositories/interview-session-repository",
  () => ({
    findInterviewSessionWithConfigById:
      mocks.findInterviewSessionWithConfigById,
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
  return new Request("http://localhost/api/interview/recipient-candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/interview/recipient-candidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifySessionOwnership.mockResolvedValue({
      authorized: true,
      userId: "user-1",
    });
    mocks.findInterviewSessionWithConfigById.mockResolvedValue({
      id: "session-1",
      user_id: "user-1",
      interview_configs: { bill_id: "bill-1" },
    });
    mocks.getEmptyReportRecipientSelectionForBill.mockResolvedValue({
      candidates: [],
      selectedCouncilorIds: [],
      selectedCouncilors: [],
      shareContact: false,
      alreadySentCouncilorIds: [],
    });
  });

  it("所有者確認後にセッションの案件IDから議員候補を返す", async () => {
    const res = await POST(request({ sessionId: "session-1" }));

    expect(res.status).toBe(200);
    expect(mocks.verifySessionOwnership).toHaveBeenCalledWith("session-1");
    expect(mocks.getEmptyReportRecipientSelectionForBill).toHaveBeenCalledWith(
      "bill-1"
    );
    await expect(res.json()).resolves.toEqual({
      recipientSelection: {
        candidates: [],
        selectedCouncilorIds: [],
        selectedCouncilors: [],
        shareContact: false,
        alreadySentCouncilorIds: [],
      },
    });
  });

  it("所有者でなければ403を返す", async () => {
    mocks.verifySessionOwnership.mockResolvedValue({
      authorized: false,
      error: "Forbidden",
    });

    const res = await POST(request({ sessionId: "session-1" }));

    expect(res.status).toBe(403);
    expect(mocks.findInterviewSessionWithConfigById).not.toHaveBeenCalled();
  });
});
