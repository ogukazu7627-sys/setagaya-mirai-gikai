import { adminClient } from "@test-utils/utils";
import { createPublicCommentFixture } from "@test-utils/public-comment-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "../../minpaku/shared/consent";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { QUESTION_PRESENTATIONS } from "../question-presentations";
import type { TurnResponse } from "../interview-turn";
import { interviewStateSchema } from "../interview-state";
import { getInterviewCampaign, type CampaignKey } from "./interview-campaigns";
import { createInterviewRoutes } from "./interview-routes";

const keys = Object.keys(QUESTION_PRESENTATIONS) as CampaignKey[];
const request = (body: unknown) =>
  new Request("http://localhost/api/public-comment/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
const consent = {
  consented: true,
  consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
  receiptOptIn: false,
};
const answer: TurnResponse = {
  acknowledgement: "関心をお聞かせいただきました。",
  followUp: "その点で、特に大切にしたいことは何ですか？",
  quickReplies: [],
  disposition: "answer",
  guidance: "",
  eligibility: [],
};
let fixture: Awaited<ReturnType<typeof createPublicCommentFixture>>;
afterEach(async () => {
  await fixture?.cleanup();
});
function routes(
  key: CampaignKey,
  overrides: Parameters<typeof createInterviewRoutes>[1] = {}
) {
  return createInterviewRoutes(key, {
    campaignSlug: fixture.campaign.slug,
    getUser: async () => fixture.user,
    registerTelemetry: async () => {},
    checkBudgets: async () => {},
    generate: async () => answer,
    ...overrides,
  });
}
describe.each(keys)("%s 実DB統合", (key) => {
  it.each([
    "loop",
    "bulk",
    "targeted",
  ] as const)("%sで開始・全質問・再読込・終了まで動く", async (mode) => {
    fixture = await createPublicCommentFixture(mode);
    const qs = getInterviewCampaign(key).questions;
    if (mode === "targeted") {
      await adminClient
        .from("public_comment_campaigns")
        .update({
          target_audiences: { [qs[1].id]: "介護の仕事に従事している人" },
        })
        .eq("id", fixture.campaign.id);
    }
    const handlers = routes(key, {
      generate: async ({ messages }) => ({
        ...answer,
        eligibility:
          mode === "targeted"
            ? [
                {
                  questionId: qs[1].id,
                  verdict: "ineligible",
                  evidenceMessageId: messages.filter(
                    (m) => m.role === "user"
                  )[0].id,
                },
              ]
            : [],
      }),
    });
    const firstResponse = await handlers.session(request(consent));
    expect(firstResponse.status).toBe(200);
    let data = await firstResponse.json();
    expect(data.messages[0].content).toContain(qs[0].premise);
    expect(data.messages[0].content).toContain(qs[0].ask);
    const sessionId = data.sessionId;
    for (let i = 0; i < (mode === "targeted" ? 18 : 21); i++) {
      const response = await handlers.chat(
        request({
          sessionId,
          revision: data.revision,
          requestId: crypto.randomUUID(),
          content: "介護の仕事はしていません。地域の支援を望みます。",
        })
      );
      expect(response.status).toBe(200);
      data = await response.json();
      expect(data).not.toHaveProperty("state");
      expect(data).not.toHaveProperty("eligibility");
      if (i === 1) {
        const restored = await (
          await handlers.session(request(consent))
        ).json();
        expect(restored.revision).toBe(data.revision);
        expect(restored.progress).toEqual(data.progress);
        expect(restored.messages.at(-1).id).toBe(data.message.id);
      }
      if (i === 6 && mode === "bulk")
        expect(data.message.content).toContain("ひと通りのお話");
    }
    expect(data.nextStage).toBe("draft");
    const saved = await adminClient
      .from("public_comment_sessions")
      .select("interview_state")
      .eq("id", sessionId)
      .single();
    const state = interviewStateSchema.parse(saved.data?.interview_state);
    expect(state.phase).toBe("done");
    expect(state.completed).toHaveLength(mode === "targeted" ? 6 : 7);
    if (mode === "targeted") expect(state.skipped[qs[1].id]).toBe("ineligible");
    const extra = await handlers.chat(
      request({
        sessionId,
        revision: data.revision,
        requestId: crypto.randomUUID(),
        content: "追加",
      })
    );
    expect(extra.status).toBe(409);
  });
});

describe("共通HTTP境界", () => {
  beforeEach(async () => {
    fixture = await createPublicCommentFixture();
  });
  it("targetedのchatも開始時の対象条件を使う", async () => {
    const qs = getInterviewCampaign("ijime").questions;
    await adminClient
      .from("public_comment_campaigns")
      .update({
        interview_mode: "targeted",
        target_audiences: { [qs[1].id]: "開始時の条件A" },
      })
      .eq("id", fixture.campaign.id);
    const initial = await (
      await routes("ijime").session(request(consent))
    ).json();
    await adminClient
      .from("public_comment_campaigns")
      .update({ target_audiences: { [qs[1].id]: "変更後の条件B" } })
      .eq("id", fixture.campaign.id);
    let receivedCondition: string | undefined;
    const handlers = routes("ijime", {
      generate: async ({ campaign }) => {
        receivedCondition = campaign.questions[1].targetAudience;
        return answer;
      },
    });
    const response = await handlers.chat(
      request({
        sessionId: initial.sessionId,
        revision: initial.revision,
        requestId: crypto.randomUUID(),
        content: "私の意見",
      })
    );
    expect(response.status).toBe(200);
    expect(receivedCondition).toBe("開始時の条件A");
  });
  it("既存の別campaignのsessionは通常送信・再送とも拒否する", async () => {
    const first = await (
      await routes("ijime").session(request(consent))
    ).json();
    const input = {
      sessionId: first.sessionId,
      revision: first.revision,
      requestId: crypto.randomUUID(),
      content: "私の意見",
    };
    await routes("ijime").chat(request(input));
    const other = await createPublicCommentFixture();
    try {
      const wrong = routes("ijime", { campaignSlug: other.campaign.slug });
      expect((await wrong.chat(request(input))).status).toBe(404);
      expect(
        (
          await wrong.chat(
            request({
              ...input,
              requestId: crypto.randomUUID(),
              revision: first.revision + 1,
            })
          )
        ).status
      ).toBe(404);
      const messages = await adminClient
        .from("public_comment_messages")
        .select("id")
        .eq("session_id", first.sessionId);
      expect(messages.data).toHaveLength(3);
    } finally {
      await other.cleanup();
    }
  });
  it("民泊メール同意の明示取得・再開時の変更・同意versionを維持する", async () => {
    const handlers = routes("minpaku");
    expect(
      (await handlers.session(request({ ...consent, consentVersion: "old" })))
        .status
    ).toBe(400);
    let started = await (
      await handlers.session(request({ ...consent, receiptOptIn: true }))
    ).json();
    expect(started.receiptOptIn).toBe(true);
    const id = started.sessionId;
    started = await (await handlers.session(request(consent))).json();
    expect(started.sessionId).toBe(id);
    expect(started.receiptOptIn).toBe(false);
    const saved = await adminClient
      .from("public_comment_sessions")
      .select("user_id,consent_version,receipt_opt_in")
      .eq("id", id)
      .single();
    expect(saved.data).toMatchObject({
      user_id: fixture.user.id,
      receipt_opt_in: false,
      consent_version: PUBLIC_COMMENT_CONSENT_VERSION,
    });
    for (const key of keys.filter((key) => key !== "minpaku"))
      expect(
        (await routes(key).session(request({ ...consent, receiptOptIn: true })))
          .status
      ).toBe(400);
  });
  it("旧会話がユーザー発言で途切れても、復元した現在の固定質問を表示する", async () => {
    const session = await fixture.createSession();
    const qs = getInterviewCampaign("minpaku").questions;
    await adminClient.from("public_comment_messages").insert([
      {
        session_id: session.id,
        role: "assistant",
        stage: "interview",
        question_id: qs[0].id,
        content: "旧1問目",
        created_at: "2026-09-01T00:00:00Z",
      },
      {
        session_id: session.id,
        role: "user",
        stage: "interview",
        question_id: qs[0].id,
        content: "旧回答",
        created_at: "2026-09-01T00:00:01Z",
      },
    ]);
    const data = await (
      await routes("minpaku").session(request(consent))
    ).json();
    expect(data.messages).toHaveLength(3);
    expect(data.messages.at(-1)).toMatchObject({
      question_id: qs[1].id,
      content: qs[1].premise + "\n\n" + qs[1].ask,
    });
    const replay = await (
      await routes("minpaku").session(request(consent))
    ).json();
    expect(replay.messages).toHaveLength(3);
  });
  it("旧会話に保存済み下書きがあれば、問いを増やさず編集へ戻る", async () => {
    const session = await fixture.createSession();
    const inserted = await adminClient.from("public_comment_drafts").insert({
      session_id: session.id,
      ai_body: "下書き",
      final_body: "編集した本文",
    });
    expect(inserted.error).toBeNull();
    const data = await (await routes("ijime").session(request(consent))).json();
    expect(data.nextStage).toBe("review");
    expect(data.draft.final_body).toBe("編集した本文");
    expect(data.messages).toHaveLength(0);
  });
  it("開始後にcampaign設定が変わっても、modeと対象条件のsnapshotを維持する", async () => {
    const handlers = routes("ijime");
    const first = await (await handlers.session(request(consent))).json();
    const qs = getInterviewCampaign("ijime").questions;
    await adminClient
      .from("public_comment_campaigns")
      .update({
        interview_mode: "targeted",
        target_audiences: { [qs[1].id]: "変更後の対象条件" },
      })
      .eq("id", fixture.campaign.id);
    const restored = await (await handlers.session(request(consent))).json();
    expect(restored.mode).toBe("loop");
    expect(restored.revision).toBe(first.revision);
    const saved = await adminClient
      .from("public_comment_sessions")
      .select("interview_state")
      .eq("id", first.sessionId)
      .single();
    expect(
      interviewStateSchema.parse(saved.data?.interview_state)
    ).toMatchObject({ mode: "loop", targetAudiences: {} });
  });
  it("全10件で同意・認証・他キャンペーンのセッションを検証する", async () => {
    for (const key of keys) {
      expect(
        (await routes(key).session(request({ ...consent, consented: false })))
          .status
      ).toBe(400);
      expect(
        (
          await routes(key, { getUser: async () => null }).session(
            request(consent)
          )
        ).status
      ).toBe(401);
    }
    const session = await (
      await routes("ijime").session(request(consent))
    ).json();
    const foreign = routes("ijime", { campaignSlug: "not-found" });
    expect(
      (
        await foreign.chat(
          request({
            sessionId: session.sessionId,
            revision: session.revision,
            requestId: crypto.randomUUID(),
            content: "別の回答",
          })
        )
      ).status
    ).toBe(404);
    const response = await routes("ijime", {
      getUser: async () => ({ ...fixture.user, id: crypto.randomUUID() }),
    }).chat(
      request({
        sessionId: session.sessionId,
        revision: session.revision,
        requestId: crypto.randomUUID(),
        content: "別人",
      })
    );
    expect(response.status).toBe(404);
  });
  it("再送はAIを再実行せず、古いrevisionでは書き込まない", async () => {
    let calls = 0;
    const handlers = routes("minpaku", {
      generate: async () => {
        calls++;
        return answer;
      },
    });
    const data = await (await handlers.session(request(consent))).json();
    const input = {
      sessionId: data.sessionId,
      revision: data.revision,
      requestId: crypto.randomUUID(),
      content: "回答",
    };
    const first = await (await handlers.chat(request(input))).json();
    const replay = await (await handlers.chat(request(input))).json();
    expect(replay).toEqual(first);
    expect(calls).toBe(1);
    expect(
      (
        await handlers.chat(
          request({ ...input, requestId: crypto.randomUUID() })
        )
      ).status
    ).toBe(409);
  });
  it("プロバイダー失敗・予算上限では進行やユーザー発言を保存しない", async () => {
    const data = await (await routes("ijime").session(request(consent))).json();
    const input = {
      sessionId: data.sessionId,
      revision: data.revision,
      requestId: crypto.randomUUID(),
      content: "回答",
    };
    expect(
      (
        await routes("ijime", {
          generate: async () => {
            throw new Error("provider");
          },
        }).chat(request(input))
      ).status
    ).toBe(500);
    expect(
      (
        await routes("ijime", {
          checkBudgets: async () => {
            throw new ChatError(ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED);
          },
        }).chat(request(input))
      ).status
    ).toBe(429);
    const restored = await (
      await routes("ijime").session(request(consent))
    ).json();
    expect(restored.revision).toBe(data.revision);
    expect(restored.messages).toHaveLength(1);
  });
  it("最終回答でも安全判定を行い、中断中は通常回答・終了を拒否する", async () => {
    const normal = routes("suicide-prevention");
    let data = await (await normal.session(request(consent))).json();
    const sessionId = data.sessionId;
    for (let i = 0; i < 20; i++)
      data = await (
        await normal.chat(
          request({
            sessionId,
            revision: data.revision,
            requestId: crypto.randomUUID(),
            content: "支援を望みます",
          })
        )
      ).json();
    const safe = routes("suicide-prevention", {
      generate: async () => ({
        ...answer,
        disposition: "safety",
        guidance: "安全案内",
      }),
    });
    const result = await (
      await safe.chat(
        request({
          sessionId,
          revision: data.revision,
          requestId: crypto.randomUUID(),
          content: "保存されない切迫した訴え",
        })
      )
    ).json();
    expect(result).toMatchObject({
      nextStage: "interview",
      userMessageStored: false,
      progress: { paused: true },
    });
    for (const action of ["answer", "finish"]) {
      expect(
        (
          await normal.chat(
            request({
              sessionId,
              revision: result.revision,
              requestId: crypto.randomUUID(),
              action,
              content: "回答",
            })
          )
        ).status
      ).toBe(409);
    }
    const restored = await (await normal.session(request(consent))).json();
    expect(JSON.stringify(restored)).not.toContain("保存されない切迫した訴え");
    const resumed = await (
      await normal.chat(
        request({
          sessionId,
          revision: result.revision,
          requestId: crypto.randomUUID(),
          action: "resume",
        })
      )
    ).json();
    expect(resumed.progress.paused).toBe(false);
    const final = await (
      await normal.chat(
        request({
          sessionId,
          revision: resumed.revision,
          requestId: crypto.randomUUID(),
          content: "計画の話を続けます",
        })
      )
    ).json();
    expect(final.nextStage).toBe("draft");
  });
});
