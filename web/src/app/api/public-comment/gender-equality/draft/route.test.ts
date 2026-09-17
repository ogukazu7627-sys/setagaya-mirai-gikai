import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findCampaign: vi.fn(),
  findSession: vi.fn(),
  findDraft: vi.fn(),
  findMessages: vi.fn(),
  generate: vi.fn(),
  upsert: vi.fn(),
  checkDaily: vi.fn(),
  checkMonthly: vi.fn(),
}));

vi.mock("@/lib/telemetry/register", () => ({
  registerNodeTelemetry: vi.fn(),
}));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: mocks.getUser,
}));
vi.mock("@/features/chat/server/services/system-cost-guard", () => ({
  checkSystemDailyCostLimit: mocks.checkDaily,
  checkSystemMonthlyCostLimit: mocks.checkMonthly,
}));
vi.mock("@/features/public-comment/gender-equality/server/ai", () => ({
  generatePublicCommentDraft: mocks.generate,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  findCampaign: mocks.findCampaign,
  findDraft: mocks.findDraft,
  findMessages: mocks.findMessages,
  findSessionForCampaignUser: mocks.findSession,
  updateDraft: vi.fn(),
  upsertDraft: mocks.upsert,
  PublicCommentCompletedError: class PublicCommentCompletedError extends Error {},
}));

import { POST } from "./route";

const request = () =>
  new Request("http://localhost/api/public-comment/gender-equality/draft", {
    method: "POST",
    body: JSON.stringify({ sessionId: "session-1" }),
  });

describe("POST /api/public-comment/gender-equality/draft", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ id: "owner" });
    mocks.findCampaign.mockResolvedValue({ id: "campaign-gender-equality" });
    mocks.findSession.mockResolvedValue({
      id: "session-1",
      completed_at: null,
    });
  });

  it("保存済みの下書きを再利用し、AIで上書きしない", async () => {
    const draft = { id: "draft-1", final_body: "確認中の本文" };
    mocks.findDraft.mockResolvedValue(draft);

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ draft });
    expect(mocks.findMessages).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("別キャンペーンのセッションから下書きを読み出さない", async () => {
    mocks.findSession.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(mocks.findDraft).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
