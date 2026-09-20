import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  sendReceipt: vi.fn(),
  sendEventInvitation: vi.fn(),
  findCampaign: vi.fn(),
  findSession: vi.fn(),
  findDraft: vi.fn(),
  completeSession: vi.fn(),
}));

vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: mocks.getUser,
}));
vi.mock("@/features/public-comment/minpaku/server/receipt", () => ({
  sendPublicCommentReceipt: mocks.sendReceipt,
}));
vi.mock("./event-invitation", () => ({
  sendPublicCommentEventInvitation: mocks.sendEventInvitation,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  completeSession: mocks.completeSession,
  findCampaign: mocks.findCampaign,
  findDraft: mocks.findDraft,
  findSessionForCampaignUser: mocks.findSession,
}));

import {
  createPublicCommentCompleteHandler,
  createPublicCommentEventInvitationHandler,
  createPublicCommentReceiptHandler,
} from "./receipt-routes";

const complete = createPublicCommentCompleteHandler("campaign-slug");
const retryReceipt = createPublicCommentReceiptHandler("campaign-slug");
const retryEventInvitation =
  createPublicCommentEventInvitationHandler("campaign-slug");

function completionRequest(
  receiptOptIn: boolean,
  eventInvitationOptIn = false
) {
  return new Request("http://localhost/complete", {
    method: "POST",
    body: JSON.stringify({
      sessionId: "session-1",
      publicationRequested: false,
      receiptOptIn,
      eventInvitationOptIn,
      consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
    }),
  });
}

function receiptRequest() {
  return new Request("http://localhost/receipt", {
    method: "POST",
    body: JSON.stringify({ sessionId: "session-1" }),
  });
}

describe("public comment receipt routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ id: "owner" });
    mocks.findCampaign.mockResolvedValue({ id: "campaign-1" });
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      completed_at: null,
      publication_status: null,
    });
    mocks.findDraft.mockResolvedValue({ final_body: "確認済み本文" });
    mocks.completeSession.mockResolvedValue("private");
    mocks.sendReceipt.mockResolvedValue({
      status: "accepted",
      canRetry: false,
    });
    mocks.sendEventInvitation.mockResolvedValue({
      status: "accepted",
      canRetry: false,
    });
  });

  it("希望した本人の完了処理後に控えメールを送る", async () => {
    const response = await complete(completionRequest(true));

    expect(response.status).toBe(200);
    expect(mocks.completeSession).toHaveBeenCalledExactlyOnceWith({
      sessionId: "session-1",
      userId: "owner",
      publicationRequested: false,
      receiptOptIn: true,
      consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
      eventInvitationOptIn: false,
      eventInvitationConsentVersion: null,
      eventInvitationEmail: null,
    });
    expect(mocks.sendReceipt).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
    expect(mocks.sendEventInvitation).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "private",
      receipt: { status: "accepted", canRetry: false },
      eventInvitation: { status: "not_requested", canRetry: false },
    });
  });

  it("控えと同じ完了処理でイベント案内も送る", async () => {
    const response = await complete(completionRequest(true, true));

    expect(response.status).toBe(200);
    expect(mocks.completeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        eventInvitationOptIn: true,
        eventInvitationConsentVersion: "2026-09-20-event-invitation-v1",
        eventInvitationEmail: expect.objectContaining({
          subject: expect.stringContaining("若者と地域を語る会"),
        }),
      })
    );
    expect(mocks.sendEventInvitation).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
    await expect(response.json()).resolves.toEqual({
      status: "private",
      receipt: { status: "accepted", canRetry: false },
      eventInvitation: { status: "accepted", canRetry: false },
    });
  });

  it("控えを希望しない場合は送信処理を呼ばない", async () => {
    const response = await complete(completionRequest(false));

    expect(response.status).toBe(200);
    expect(mocks.sendReceipt).not.toHaveBeenCalled();
    expect(mocks.sendEventInvitation).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "private",
      receipt: { status: "not_requested", canRetry: false },
      eventInvitation: { status: "not_requested", canRetry: false },
    });
  });

  it("完了済みの本人セッションだけ控えメールを再試行できる", async () => {
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      completed_at: "2026-09-18T00:00:00.000Z",
      publication_status: "private",
    });
    const response = await retryReceipt(receiptRequest());

    expect(response.status).toBe(200);
    expect(mocks.sendReceipt).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
  });

  it("完了済みの本人セッションだけイベント案内を再試行できる", async () => {
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      completed_at: "2026-09-18T00:00:00.000Z",
      publication_status: "private",
    });
    const response = await retryEventInvitation(receiptRequest());

    expect(response.status).toBe(200);
    expect(mocks.sendEventInvitation).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
  });

  it("完了済みセッションの再送では完了RPCを再実行しない", async () => {
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      completed_at: "2026-09-18T00:00:00.000Z",
      publication_status: "private",
    });

    const response = await complete(completionRequest(true));

    expect(response.status).toBe(200);
    expect(mocks.completeSession).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "private",
      receipt: { status: "accepted", canRetry: false },
      eventInvitation: { status: "not_requested", canRetry: false },
    });
  });

  it("別キャンペーンのセッションでは再試行できない", async () => {
    mocks.findSession.mockResolvedValue(null);

    const response = await retryReceipt(receiptRequest());

    expect(response.status).toBe(404);
    expect(mocks.sendReceipt).not.toHaveBeenCalled();
  });

  it("未完了セッションでは再試行できない", async () => {
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      completed_at: null,
    });

    const response = await retryReceipt(receiptRequest());

    expect(response.status).toBe(409);
    expect(mocks.sendReceipt).not.toHaveBeenCalled();
  });
});
