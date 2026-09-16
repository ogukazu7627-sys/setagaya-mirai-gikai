import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findSession: vi.fn(),
  sendReceipt: vi.fn(),
}));

vi.mock("@/features/chat/server/utils/supabase-server", () => ({
  getChatSupabaseUser: mocks.getUser,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  findSessionForUser: mocks.findSession,
}));
vi.mock("@/features/public-comment/minpaku/server/receipt", () => ({
  sendPublicCommentReceipt: mocks.sendReceipt,
}));

import { POST } from "./route";

function request(extra: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/public-comment/minpaku/receipt", {
    method: "POST",
    body: JSON.stringify({ sessionId: "session-1", ...extra }),
  });
}

describe("POST /api/public-comment/minpaku/receipt", () => {
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
      completed_at: "2026-09-16T00:00:00.000Z",
    });
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
  ])("retries only for the authenticated owner, ignoring client recipients: %j", async (extra) => {
    const response = await POST(request(extra));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      receipt: { status: "accepted", canRetry: false },
    });
    expect(mocks.findSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
    expect(mocks.sendReceipt).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
  });

  it("returns 409 without sending for an incomplete session despite forged completion", async () => {
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      user_id: "owner",
      completed_at: null,
    });

    const response = await POST(
      request({
        completed_at: "2026-09-16T00:00:00.000Z",
        receiptOptIn: true,
      })
    );

    expect(response.status).toBe(409);
    expect(mocks.findSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
    expect(mocks.sendReceipt).not.toHaveBeenCalled();
  });

  it("cannot retry another owner's session using a forged userId", async () => {
    mocks.findSession.mockResolvedValue(null);

    const response = await POST(request({ userId: "other-owner" }));

    expect(response.status).toBe(404);
    expect(mocks.findSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner"
    );
    expect(mocks.sendReceipt).not.toHaveBeenCalled();
  });
});
