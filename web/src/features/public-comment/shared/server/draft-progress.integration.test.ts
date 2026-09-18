import { adminClient } from "@test-utils/utils";
import { createPublicCommentFixture } from "@test-utils/public-comment-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MINPAKU_ORDINANCES } from "../../minpaku/shared/campaign";
import { QUESTION_PRESENTATIONS } from "../question-presentations";
import { initialInterviewState } from "../interview-state";
import { getInterviewCampaign, type CampaignKey } from "./interview-campaigns";

// Existing draft routes expose no DI factory. Substitute only auth/LLM boundaries;
// campaign lookup, session/message reads, completion gating and draft persistence use real DB.
const boundary = vi.hoisted(() => ({
  getUser: vi.fn(),
  generate: vi.fn(),
  campaignSlug: "",
}));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: boundary.getUser,
}));
vi.mock("@/features/public-comment/minpaku/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));
vi.mock("@/features/public-comment/ijime/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));
vi.mock("@/features/public-comment/disability/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));
vi.mock("@/features/public-comment/retaining-wall/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));
vi.mock("@/features/public-comment/suicide-prevention/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));
vi.mock("@/features/public-comment/gender-equality/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));
vi.mock("@/features/public-comment/inclusion-plan/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));
vi.mock("@/features/public-comment/elderly-care-plan/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));
vi.mock("@/features/public-comment/dementia-hope-plan/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));
vi.mock("@/features/public-comment/traffic-safety-plan/server/ai", () => ({
  generatePublicCommentDraft: boundary.generate,
}));

vi.mock("@/lib/telemetry/register", () => ({
  registerNodeTelemetry: async () => {},
}));
vi.mock(
  "@/features/public-comment/minpaku/server/repository",
  async (importOriginal) => {
    const repository =
      await importOriginal<typeof import("../../minpaku/server/repository")>();
    return {
      ...repository,
      findCampaign: () => repository.findCampaign(boundary.campaignSlug),
    };
  }
);

async function createDraftRequest(key: CampaignKey, sessionId: string) {
  const { POST } = await import(
    `../../../../app/api/public-comment/${key}/draft/route.ts`
  );
  return POST(
    new Request("http://localhost/api/public-comment/draft", {
      method: "POST",
      body: JSON.stringify({ sessionId, targetOrdinances: MINPAKU_ORDINANCES }),
    })
  );
}

const keys = Object.keys(QUESTION_PRESENTATIONS) as CampaignKey[];
let fixture: Awaited<ReturnType<typeof createPublicCommentFixture>>;
afterEach(async () => {
  await fixture?.cleanup();
});
describe.each(keys)("%s 下書き完了判定", (key) => {
  beforeEach(async () => {
    fixture = await createPublicCommentFixture();
    boundary.getUser.mockResolvedValue(fixture.user);
    boundary.generate.mockReset().mockResolvedValue({
      body: "区に望む支援",
      fact_check_notes: [],
      source_refs: [],
      target_ordinances: [...MINPAKU_ORDINANCES],
    });
    boundary.campaignSlug = fixture.campaign.slug;
  });
  it("7発言以上でも深掘り未完了なら拒否し、明示終了なら7発言未満でも生成できる", async () => {
    const campaign = getInterviewCampaign(key);
    const state = initialInterviewState("loop");
    state.currentQuestionId = campaign.questions[0].id;
    const session = await fixture.createSession(state);
    await adminClient.from("public_comment_messages").insert(
      Array.from({ length: 7 }, (_, i) => ({
        session_id: session.id,
        role: "user",
        stage: "interview",
        content: "希望する支援" + i,
        question_id: campaign.questions[Math.floor(i / 3)].id,
      }))
    );
    const response = await createDraftRequest(key, session.id);
    expect(response.status).toBe(409);
    expect(
      (
        await adminClient
          .from("public_comment_drafts")
          .select("id")
          .eq("session_id", session.id)
      ).data
    ).toEqual([]);
    expect(boundary.generate).not.toHaveBeenCalled();
    await adminClient
      .from("public_comment_messages")
      .delete()
      .eq("session_id", session.id);
    await adminClient.from("public_comment_messages").insert({
      session_id: session.id,
      role: "user",
      stage: "interview",
      content: "区に望む支援",
      question_id: campaign.questions[0].id,
    });
    await adminClient
      .from("public_comment_sessions")
      .update({
        interview_state: { ...state, phase: "done", currentQuestionId: null },
      })
      .eq("id", session.id);
    const done = await createDraftRequest(key, session.id);
    expect(done.status).toBe(200);
    expect(boundary.generate).toHaveBeenCalledTimes(1);
    expect((await done.json()).draft.final_body).toBe("区に望む支援");
    expect(
      (
        await adminClient
          .from("public_comment_drafts")
          .select("final_body")
          .eq("session_id", session.id)
          .single()
      ).data?.final_body
    ).toBe("区に望む支援");
  });
});
