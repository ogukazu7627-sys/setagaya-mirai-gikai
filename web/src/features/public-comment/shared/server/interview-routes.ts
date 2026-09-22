import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import {
  getPublicCommentActor,
  isVerifiedPublicCommentUser,
} from "@/features/public-comment/minpaku/server/auth";
import {
  createSession,
  findActiveSession,
  findCampaign,
  findDraft,
  findMessages,
  findSessionForCampaignUser,
  saveSessionReceiptConsent,
} from "@/features/public-comment/minpaku/server/repository";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";
import { registerNodeTelemetry } from "@/lib/telemetry/register";
import {
  checkpointChoiceSchema,
  chooseInterviewPath,
  composeInterviewMessage,
  interviewProgress,
  interviewStateSchema,
  restoreInterviewState,
} from "../interview-state";
import { resolveInterviewTurn, type TurnMessage } from "../interview-turn";
import { generateInterviewTurn } from "./interview-ai";
import {
  type CampaignKey,
  getInterviewCampaign,
  type InterviewCampaign,
} from "./interview-campaigns";
import {
  attachFunnelVisitToSession,
  markInterviewFunnelProgress,
} from "./funnel-repository";
import { commitInterviewTurn, findCommittedTurn } from "./interview-repository";

const sessionRequestSchema = z.object({
  consented: z.literal(true),
  receiptOptIn: z.boolean(),
  consentVersion: z.string(),
  attributionToken: z.uuid().nullable().optional(),
});

const requestSchema = z
  .object({
    sessionId: z.uuid(),
    requestId: z.uuid(),
    revision: z.number().int().min(0),
    action: z
      .enum(["answer", "skip", "finish", "resume", "checkpoint"])
      .default("answer"),
    choice: checkpointChoiceSchema.optional(),
    content: z.string().trim().max(4000).default(""),
  })
  .refine((value) => value.action !== "answer" || value.content.length > 0)
  .refine(
    (value) => value.action !== "checkpoint" || value.choice !== undefined,
    { message: "checkpoint choice is required", path: ["choice"] }
  );

function turnPayload(
  turn: Awaited<ReturnType<typeof commitInterviewTurn>>,
  campaign: InterviewCampaign
) {
  return {
    message: turn.message,
    revision: turn.revision,
    userMessageStored: turn.userMessageStored,
    nextStage: turn.state.checkpoint
      ? "checkpoint"
      : turn.state.phase === "done"
        ? "draft"
        : "interview",
    quickReplies: turn.state.paused ? [] : turn.state.quickReplies,
    progress: interviewProgress(turn.state, campaign.questions),
    mode: turn.state.mode,
  };
}

function errorResponse(error: unknown, message: string) {
  if (
    error instanceof Error &&
    /public_comment_(stale_turn|completed)/.test(error.message)
  ) {
    return NextResponse.json(
      {
        error:
          "別の画面で会話が進みました。ページを再読み込みして続けてください。",
      },
      { status: 409 }
    );
  }
  if (
    error instanceof ChatError &&
    [
      ChatErrorCode.DAILY_COST_LIMIT_REACHED,
      ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED,
      ChatErrorCode.SYSTEM_MONTHLY_COST_LIMIT_REACHED,
    ].some((code) => code === error.code)
  ) {
    return NextResponse.json(
      { error: "本日のAI利用上限に達しました" },
      { status: 429 }
    );
  }
  console.error(
    "Public comment interview request failed",
    error instanceof Error ? error.name : "unknown"
  );
  return NextResponse.json({ error: message }, { status: 500 });
}

export function createInterviewRoutes(
  key: CampaignKey,
  dependencies: {
    getUser?: typeof getPublicCommentActor;
    generate?: typeof generateInterviewTurn;
    checkBudgets?: () => Promise<void>;
    registerTelemetry?: () => Promise<void>;
    campaignSlug?: string;
    isVerifiedUser?: typeof isVerifiedPublicCommentUser;
  } = {}
) {
  const getUser = dependencies.getUser ?? getPublicCommentActor;
  const generate = dependencies.generate ?? generateInterviewTurn;
  const registerTelemetry =
    dependencies.registerTelemetry ?? registerNodeTelemetry;
  const isVerifiedUser =
    dependencies.isVerifiedUser ?? isVerifiedPublicCommentUser;
  const checkBudgets =
    dependencies.checkBudgets ??
    (async () => {
      await checkSystemDailyCostLimit();
      await checkSystemMonthlyCostLimit();
    });
  const base = getInterviewCampaign(key);
  return {
    session: async (request: Request) => {
      await registerTelemetry();
      const parsedBody = sessionRequestSchema.safeParse(
        await request.json().catch(() => null)
      );
      const body = parsedBody.success ? parsedBody.data : null;
      if (
        !body ||
        (!base.receiptEnabled && body.receiptOptIn !== false) ||
        body.consentVersion !== PUBLIC_COMMENT_CONSENT_VERSION
      ) {
        return NextResponse.json(
          { error: "最新の同意事項を確認してください" },
          { status: 400 }
        );
      }
      const user = await getUser();
      if (!user)
        return NextResponse.json(
          { error: "セッションを確認できません" },
          { status: 401 }
        );
      try {
        const record = await findCampaign(
          dependencies.campaignSlug ?? base.slug
        );
        if (!record || record.status !== "published")
          return NextResponse.json(
            { error: "キャンペーンが見つかりません" },
            { status: 404 }
          );
        let campaign = getInterviewCampaign(key, record.target_audiences);
        const active = await findActiveSession(record.id, user.id);
        const consent = {
          userId: user.id,
          receiptOptIn: body.receiptOptIn,
          consentVersion: body.consentVersion,
        };
        // The partial unique index arbitrates simultaneous first visits.
        let session: Awaited<ReturnType<typeof createSession>> | null;
        if (active)
          session = await saveSessionReceiptConsent({
            sessionId: active.id,
            ...consent,
          });
        else {
          try {
            session = await createSession({
              campaignId: record.id,
              ...consent,
            });
          } catch (error) {
            session = await findActiveSession(record.id, user.id);
            if (!session) throw error;
          }
        }
        try {
          await attachFunnelVisitToSession({
            sessionId: session.id,
            campaignId: record.id,
            publicToken: body.attributionToken,
          });
        } catch {
          console.warn("public_comment_funnel_session_tracking_failed");
        }
        if (session.interview_state)
          campaign = getInterviewCampaign(
            key,
            interviewStateSchema.parse(session.interview_state).targetAudiences
          );
        let messages = await findMessages(session.id);
        const draft = await findDraft(session.id);
        let state = restoreInterviewState(
          session.interview_state,
          record.interview_mode,
          campaign.questions,
          messages,
          Boolean(draft)
        );
        let revision = session.interview_revision;
        if (!session.interview_state) {
          const question = campaign.questions.find(
            (q) => q.id === state.currentQuestionId
          );
          try {
            const initialized = await commitInterviewTurn({
              sessionId: session.id,
              userId: user.id,
              campaignId: record.id,
              requestId: crypto.randomUUID(),
              revision,
              state,
              assistantContent:
                question &&
                (messages.at(-1)?.role !== "assistant" ||
                  messages.at(-1)?.question_id !== question.id)
                  ? composeInterviewMessage("", question)
                  : undefined,
              assistantQuestionId: question?.id,
            });
            revision = initialized.revision;
          } catch (error) {
            if (
              !(error instanceof Error) ||
              !error.message.includes("public_comment_stale_turn")
            )
              throw error;
            const latest = await findSessionForCampaignUser(
              session.id,
              user.id,
              record.id
            );
            if (!latest?.interview_state) throw error;
            state = restoreInterviewState(
              latest.interview_state,
              record.interview_mode,
              campaign.questions,
              []
            );
            revision = latest.interview_revision;
          }
          messages = await findMessages(session.id);
        }
        return NextResponse.json({
          sessionId: session.id,
          messages,
          revision,
          receiptOptIn: session.receipt_opt_in,
          nextStage: draft
            ? isVerifiedUser(user)
              ? "review"
              : "draft"
            : state.checkpoint
              ? "checkpoint"
              : state.phase === "done"
                ? "draft"
                : "interview",
          quickReplies: state.paused || draft ? [] : state.quickReplies,
          progress: interviewProgress(state, campaign.questions),
          mode: state.mode,
          draftGenerationStatus: draft
            ? "ready"
            : session.draft_generation_status,
          ...(draft && isVerifiedUser(user)
            ? { draft, sources: campaign.sources }
            : {}),
        });
      } catch (error) {
        return errorResponse(error, "インタビューを開始できませんでした");
      }
    },
    chat: async (request: Request) => {
      await registerTelemetry();
      const parsed = requestSchema.safeParse(
        await request.json().catch(() => null)
      );
      if (!parsed.success)
        return NextResponse.json(
          { error: "回答を確認し、ページを再読み込みしてください" },
          { status: 400 }
        );
      const input = parsed.data;
      const user = await getUser();
      if (!user)
        return NextResponse.json(
          { error: "セッションを確認できません" },
          { status: 401 }
        );
      try {
        const record = await findCampaign(
          dependencies.campaignSlug ?? base.slug
        );
        if (!record || record.status !== "published")
          return NextResponse.json(
            { error: "キャンペーンが見つかりません" },
            { status: 404 }
          );
        let campaign = getInterviewCampaign(key, record.target_audiences);
        const session = await findSessionForCampaignUser(
          input.sessionId,
          user.id,
          record.id
        );
        if (!session)
          return NextResponse.json(
            { error: "セッションが見つかりません" },
            { status: 404 }
          );
        if (session.interview_state)
          campaign = getInterviewCampaign(
            key,
            interviewStateSchema.parse(session.interview_state).targetAudiences
          );
        const replay = await findCommittedTurn(session.id, input.requestId);
        if (replay) {
          try {
            await markInterviewFunnelProgress({
              sessionId: session.id,
              state: replay.state,
              checkpointChoice:
                input.action === "checkpoint" ? input.choice : undefined,
            });
          } catch {
            console.warn("public_comment_funnel_progress_tracking_failed");
          }
          return NextResponse.json(turnPayload(replay, campaign));
        }
        if (
          session.completed_at ||
          input.revision !== session.interview_revision
        )
          throw new Error("public_comment_stale_turn");
        const stored = await findMessages(session.id);
        const state = restoreInterviewState(
          session.interview_state,
          record.interview_mode,
          campaign.questions,
          stored
        );
        if (state.phase === "done")
          return NextResponse.json(
            { error: "インタビューは終了しています" },
            { status: 409 }
          );
        if (input.action === "checkpoint" && !state.checkpoint) {
          return NextResponse.json(
            { error: "簡易版・詳細版の選択画面ではありません" },
            { status: 409 }
          );
        }
        if (state.checkpoint && input.action !== "checkpoint") {
          return NextResponse.json(
            { error: "簡易版または詳細版を選択してください" },
            { status: 409 }
          );
        }
        if (state.paused && input.action !== "resume") {
          return NextResponse.json(
            { error: "続ける場合は「意見整理を再開する」を選んでください" },
            { status: 409 }
          );
        }
        const messages: TurnMessage[] = stored.map((m) => ({
          id: m.id,
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }));
        if (input.action === "answer")
          messages.push({
            id: input.requestId,
            role: "user",
            content: input.content,
          });
        let response:
          | Awaited<ReturnType<typeof generateInterviewTurn>>
          | undefined;
        if (input.action === "answer") {
          await checkBudgets();
          response = await generate({
            campaign,
            state,
            messages,
            userId: user.id,
            sessionId: session.id,
          });
        }
        const next =
          input.action === "checkpoint"
            ? (() => {
                const nextState = chooseInterviewPath(
                  state,
                  campaign.questions,
                  input.choice as NonNullable<typeof input.choice>
                );
                const question = campaign.questions.find(
                  (item) => item.id === nextState.currentQuestionId
                );
                return {
                  state: nextState,
                  content:
                    nextState.phase === "done" || !question
                      ? ""
                      : composeInterviewMessage("", question),
                  storeUser: false,
                };
              })()
            : resolveInterviewTurn({
                state,
                questions: campaign.questions,
                action: input.action,
                response,
                messages,
              });
        const turn = await commitInterviewTurn({
          sessionId: session.id,
          userId: user.id,
          campaignId: record.id,
          requestId: input.requestId,
          revision: input.revision,
          state: next.state,
          userContent: next.storeUser ? input.content : undefined,
          userQuestionId: state.currentQuestionId,
          assistantContent: next.content || undefined,
          assistantQuestionId: next.state.paused
            ? null
            : next.state.currentQuestionId,
        });
        try {
          await markInterviewFunnelProgress({
            sessionId: session.id,
            state: turn.state,
            checkpointChoice:
              input.action === "checkpoint" ? input.choice : undefined,
          });
        } catch {
          console.warn("public_comment_funnel_progress_tracking_failed");
        }
        return NextResponse.json(turnPayload(turn, campaign));
      } catch (error) {
        return errorResponse(error, "回答を処理できませんでした");
      }
    },
  };
}
