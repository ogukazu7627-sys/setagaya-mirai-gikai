import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  after: vi.fn(),
  campaign: vi.fn(),
  session: vi.fn(),
  draft: vi.fn(),
  messages: vi.fn(),
  claim: vi.fn(),
  save: vi.fn(),
  fail: vi.fn(),
  update: vi.fn(),
  generate: vi.fn(),
  canCreate: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after,
}));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentActor: mocks.actor,
  getPublicCommentUser: mocks.actor,
  isVerifiedPublicCommentUser: (user: { verified?: boolean } | null) =>
    Boolean(user?.verified),
}));
vi.mock("@/features/public-comment/minpaku/server/repository", () => ({
  findCampaign: mocks.campaign,
  findSessionForCampaignUser: mocks.session,
  findDraft: mocks.draft,
  findMessages: mocks.messages,
  claimDraftGeneration: mocks.claim,
  saveGeneratedDraft: mocks.save,
  failDraftGeneration: mocks.fail,
  updateDraft: mocks.update,
  PublicCommentCompletedError: class PublicCommentCompletedError extends Error {},
}));
vi.mock("@/features/public-comment/shared/interview-state", () => ({
  canCreateInterviewDraft: mocks.canCreate,
}));
vi.mock("@/features/chat/server/services/system-cost-guard", () => ({
  checkSystemDailyCostLimit: vi.fn(),
  checkSystemMonthlyCostLimit: vi.fn(),
}));
vi.mock("@/lib/telemetry/register", () => ({
  registerNodeTelemetry: vi.fn(),
}));

import { createPublicCommentDraftRoutes } from "./draft-routes";

const savedDraft = {
  id: "draft-1",
  final_body: "認証前には見せない本文",
};

function request() {
  return new Request("http://localhost/api/public-comment/test/draft", {
    method: "POST",
    body: JSON.stringify({
      sessionId: "session-1",
      targetOrdinances: ["素案"],
    }),
  });
}

function routes() {
  return createPublicCommentDraftRoutes({
    campaignSlug: "test-campaign",
    questionsLength: 7,
    sources: [{ id: "source", title: "公式資料", url: "https://example.com" }],
    parseTargetOrdinances: (body) =>
      body &&
      typeof body === "object" &&
      "targetOrdinances" in body &&
      Array.isArray(body.targetOrdinances)
        ? body.targetOrdinances
        : null,
    generate: mocks.generate,
    logLabel: "Test",
  });
}

describe("public comment draft visibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.campaign.mockResolvedValue({ id: "campaign-1" });
    mocks.session.mockResolvedValue({
      id: "session-1",
      completed_at: null,
      interview_state: { phase: "done" },
    });
    mocks.messages.mockResolvedValue([
      { role: "user", content: "私の意見", question_id: "q1" },
    ]);
    mocks.canCreate.mockReturnValue(true);
  });

  it("匿名利用者には完成済み本文を返さない", async () => {
    mocks.actor.mockResolvedValue({ id: "anonymous", is_anonymous: true });
    mocks.draft.mockResolvedValue(savedDraft);

    const response = await routes().POST(request());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: "ready", requiresGoogle: true });
    expect(JSON.stringify(data)).not.toContain(savedDraft.final_body);
  });

  it("Google認証済みの所有者にだけ本文を返す", async () => {
    mocks.actor.mockResolvedValue({ id: "google-user", verified: true });
    mocks.draft.mockResolvedValue(savedDraft);

    const response = await routes().POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ draft: savedDraft });
  });

  it("匿名状態で生成を開始し、応答に本文を含めない", async () => {
    mocks.actor.mockResolvedValue({ id: "anonymous", is_anonymous: true });
    mocks.draft.mockResolvedValue(null);
    mocks.claim.mockResolvedValue({ status: "claimed", token: "token-1" });
    mocks.generate.mockResolvedValue({
      body: "AI下書き",
      fact_check_notes: [],
    });
    mocks.save.mockResolvedValue(savedDraft);
    let backgroundTask: (() => Promise<void>) | undefined;
    mocks.after.mockImplementation((task) => {
      backgroundTask = task;
    });

    const response = await routes().POST(request());
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data).toEqual({ status: "generating", requiresGoogle: true });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(backgroundTask).toBeTypeOf("function");
    await backgroundTask?.();
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        generationToken: "token-1",
        aiBody: "AI下書き",
      })
    );
  });

  it("所有者が異なるセッションは参照できない", async () => {
    mocks.actor.mockResolvedValue({ id: "other-user", verified: true });
    mocks.session.mockResolvedValue(null);

    const response = await routes().POST(request());

    expect(response.status).toBe(404);
    expect(mocks.draft).not.toHaveBeenCalled();
  });

  it("回答がない場合は空の下書きを作成しない", async () => {
    mocks.actor.mockResolvedValue({ id: "anonymous", is_anonymous: true });
    mocks.messages.mockResolvedValue([]);

    const response = await routes().POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "少なくとも1問に回答してから、意見の下書きを作成してください",
    });
    expect(mocks.canCreate).not.toHaveBeenCalled();
    expect(mocks.claim).not.toHaveBeenCalled();
  });
});
