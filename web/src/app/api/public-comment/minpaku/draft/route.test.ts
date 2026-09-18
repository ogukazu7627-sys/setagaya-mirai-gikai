import { beforeEach, describe, expect, it, vi } from "vitest";
import { MINPAKU_ORDINANCES } from "@/features/public-comment/minpaku/shared/campaign";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  campaign: vi.fn(),
  session: vi.fn(),
  draft: vi.fn(),
  update: vi.fn(),
  generate: vi.fn(),
  messages: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/lib/telemetry/register", () => ({ registerNodeTelemetry: vi.fn() }));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentActor: mocks.user,
  getPublicCommentUser: mocks.user,
  isVerifiedPublicCommentUser: () => true,
}));
vi.mock("@/features/chat/server/services/system-cost-guard", () => ({
  checkSystemDailyCostLimit: vi.fn(),
  checkSystemMonthlyCostLimit: vi.fn(),
}));
vi.mock("@/features/public-comment/minpaku/server/ai", () => ({
  generatePublicCommentDraft: mocks.generate,
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  findCampaign: mocks.campaign,
  findSessionForCampaignUser: mocks.session,
  findDraft: mocks.draft,
  updateDraft: mocks.update,
  findMessages: mocks.messages,
  upsertDraft: mocks.upsert,
  PublicCommentCompletedError: class PublicCommentCompletedError extends Error {},
}));

import { PublicCommentCompletedError } from "@/features/public-comment/minpaku/server/repository";
import { PATCH, POST } from "./route";

const body = {
  sessionId: "session",
  finalBody: "  exact body\n",
  targetOrdinances: [...MINPAKU_ORDINANCES],
};
const draft = {
  final_body: body.finalBody,
  target_ordinances: body.targetOrdinances,
};
const request = (payload: object = body) =>
  new Request("http://localhost/api/public-comment/minpaku/draft", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

describe("frozen draft API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "owner" });
    mocks.campaign.mockResolvedValue({ id: "campaign" });
    mocks.session.mockResolvedValue({
      id: "session",
      completed_at: "2026-09-16T00:00:00Z",
    });
    mocks.draft.mockResolvedValue(draft);
  });
  it("repeated identical PATCH succeeds after completion without a DB write", async () => {
    const response = await PATCH(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ draft });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([
    { ...body, finalBody: "exact body" },
    { ...body, targetOrdinances: [MINPAKU_ORDINANCES[0]] },
  ])("rejects changes to frozen content: %j", async (payload) => {
    expect((await PATCH(request(payload))).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not trim the final text before persistence", async () => {
    mocks.session.mockResolvedValue({ id: "session", completed_at: null });
    mocks.update.mockResolvedValue(draft);
    expect((await PATCH(request())).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ ...body, userId: "owner" });
  });
  it("handles completion racing an identical/different PATCH", async () => {
    mocks.session.mockResolvedValue({ id: "session", completed_at: null });
    mocks.update.mockRejectedValue(new PublicCommentCompletedError());
    expect((await PATCH(request())).status).toBe(200);
    expect(
      (await PATCH(request({ ...body, finalBody: "different" }))).status
    ).toBe(409);
  });
  it("never starts AI generation for completed interviews", async () => {
    expect((await POST(request())).status).toBe(409);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
