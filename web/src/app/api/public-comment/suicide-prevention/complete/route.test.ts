import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findCampaign: vi.fn(),
  findSession: vi.fn(),
  findDraft: vi.fn(),
  completeSession: vi.fn(),
}));

vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: mocks.getUser,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  completeSession: mocks.completeSession,
  findCampaign: mocks.findCampaign,
  findDraft: mocks.findDraft,
  findSessionForCampaignUser: mocks.findSession,
}));

import { POST } from "./route";

function request(extra: Record<string, unknown> = {}) {
  return new Request(
    "http://localhost/api/public-comment/suicide-prevention/complete",
    {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-1",
        publicationRequested: false,
        receiptOptIn: false,
        consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
        ...extra,
      }),
    }
  );
}

describe("POST /api/public-comment/suicide-prevention/complete", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ id: "owner" });
    mocks.findCampaign.mockResolvedValue({ id: "campaign-suicide-prevention" });
    mocks.findSession.mockResolvedValue({ id: "session-1" });
    mocks.findDraft.mockResolvedValue({ final_body: "確認済み本文" });
    mocks.completeSession.mockResolvedValue("private");
  });

  it.each([
    { publicationRequested: true },
    { receiptOptIn: true },
  ])("匿名公開と会話全文のメール送信を受け付けない: %j", async (extra) => {
    const response = await POST(request(extra));

    expect(response.status).toBe(400);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.completeSession).not.toHaveBeenCalled();
  });

  it("認証済み本人かつ対象キャンペーンのセッションだけを完了する", async () => {
    const response = await POST(request({ userId: "forged-user" }));

    expect(response.status).toBe(200);
    expect(mocks.findSession).toHaveBeenCalledExactlyOnceWith(
      "session-1",
      "owner",
      "campaign-suicide-prevention"
    );
    expect(mocks.completeSession).toHaveBeenCalledExactlyOnceWith({
      sessionId: "session-1",
      userId: "owner",
      publicationRequested: false,
      receiptOptIn: false,
      consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
    });
  });
});
