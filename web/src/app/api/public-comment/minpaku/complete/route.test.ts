import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findSession: vi.fn(),
  findDraft: vi.fn(),
  completeSession: vi.fn(),
  sendReceipt: vi.fn(),
}));

vi.mock("@/features/chat/server/utils/supabase-server", () => ({
  getChatSupabaseUser: mocks.getUser,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  findSessionForUser: mocks.findSession,
  findDraft: mocks.findDraft,
  completeSession: mocks.completeSession,
}));
vi.mock("@/features/public-comment/minpaku/server/receipt", () => ({
  sendPublicCommentReceipt: mocks.sendReceipt,
}));

import { POST } from "./route";

function request(extra: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/public-comment/minpaku/complete", {
    method: "POST",
    body: JSON.stringify({
      sessionId: "session-1",
      publicationRequested: false,
      receiptOptIn: true,
      consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
      ...extra,
    }),
  });
}

describe("POST /api/public-comment/minpaku/complete", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "owner",
          email: "owner@example.test",
          app_metadata: { provider: "google" },
        },
      },
      error: null,
    });
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      user_id: "owner",
      completed_at: null,
      publication_status: null,
    });
    mocks.findDraft.mockResolvedValue({
      final_body: "Confirmed final comment",
    });
    mocks.completeSession.mockResolvedValue("private");
    mocks.sendReceipt.mockResolvedValue({
      status: "accepted",
      canRetry: false,
    });
  });

  it.each([
    {},
    {
      userId: "forged-user",
      email: "forged@example.test",
      recipient: "forged@example.test",
      to: "forged@example.test",
    },
  ])("completes and sends using only the authenticated owner: %j", async (extra) => {
    const response = await POST(request(extra));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "private",
      receipt: { status: "accepted", canRetry: false },
    });
    expect(mocks.findSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
    expect(mocks.findDraft).toHaveBeenCalledExactlyOnceWith("session-1");
    expect(mocks.completeSession).toHaveBeenCalledExactlyOnceWith({
      sessionId: "session-1",
      userId: "owner",
      publicationRequested: false,
      receiptOptIn: true,
      consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
    });
    expect(mocks.sendReceipt).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
    expect(mocks.completeSession.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendReceipt.mock.invocationCallOrder[0]
    );
  });

  it("cannot complete or send another owner's session using a forged userId", async () => {
    mocks.findSession.mockResolvedValue(null);

    const response = await POST(request({ userId: "other-owner" }));

    expect(response.status).toBe(404);
    expect(mocks.findSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
    expect(mocks.findDraft).not.toHaveBeenCalled();
    expect(mocks.completeSession).not.toHaveBeenCalled();
    expect(mocks.sendReceipt).not.toHaveBeenCalled();
  });

  it("preserves completion success when receipt delivery fails", async () => {
    mocks.sendReceipt.mockResolvedValue({ status: "failed", canRetry: true });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "private",
      receipt: { status: "failed", canRetry: true },
    });
    expect(mocks.completeSession).toHaveBeenCalledTimes(1);
    expect(mocks.sendReceipt).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
  });

  it("returns the existing completion when the browser retries after a committed completion", async () => {
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      user_id: "owner",
      completed_at: "2026-09-19T00:00:00.000Z",
      publication_status: "private",
    });
    mocks.completeSession.mockRejectedValue(new Error("already completed"));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "private",
      receipt: { status: "accepted", canRetry: false },
    });
    expect(mocks.completeSession).not.toHaveBeenCalled();
    expect(mocks.sendReceipt).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
  });

  it("recovers when the completion commit succeeded but its response was lost", async () => {
    mocks.findSession
      .mockResolvedValueOnce({
        id: "session-1",
        user_id: "owner",
        completed_at: null,
        publication_status: null,
      })
      .mockResolvedValueOnce({
        id: "session-1",
        user_id: "owner",
        completed_at: "2026-09-19T00:00:00.000Z",
        publication_status: "private",
      });
    mocks.completeSession.mockRejectedValue(new Error("connection lost"));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "private",
      receipt: { status: "accepted", canRetry: false },
    });
    expect(mocks.findSession).toHaveBeenCalledTimes(2);
  });

  it("does not turn a receipt exception into a completion failure", async () => {
    mocks.sendReceipt.mockRejectedValue(new Error("receipt unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "private",
      receipt: { status: "pending", canRetry: true },
    });
  });
});
