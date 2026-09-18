import "server-only";

import { after, NextResponse } from "next/server";
import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import {
  getPublicCommentActor,
  getPublicCommentUser,
  isVerifiedPublicCommentUser,
} from "@/features/public-comment/minpaku/server/auth";
import {
  claimDraftGeneration,
  failDraftGeneration,
  findCampaign,
  findDraft,
  findMessages,
  findSessionForCampaignUser,
  PublicCommentCompletedError,
  saveGeneratedDraft,
  updateDraft,
} from "@/features/public-comment/minpaku/server/repository";
import { canCreateInterviewDraft } from "@/features/public-comment/shared/interview-state";
import { registerNodeTelemetry } from "@/lib/telemetry/register";

type Source = { id: string; title: string; url: string };
type DraftOutput = { body: string; fact_check_notes: string[] };

export type PublicCommentDraftRouteConfig = {
  campaignSlug: string;
  questionsLength: number;
  sources: readonly Source[];
  parseTargetOrdinances: (body: unknown) => string[] | null;
  generate: (params: {
    userId: string;
    sessionId: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    targetOrdinances: string[];
  }) => Promise<DraftOutput>;
  logLabel: string;
};

function generationStatus(status: string, errorCode?: string | null) {
  return NextResponse.json(
    {
      status,
      requiresGoogle: true,
      ...(errorCode ? { errorCode } : {}),
    },
    { status: status === "generating" ? 202 : 200 }
  );
}

export function createPublicCommentDraftRoutes(
  config: PublicCommentDraftRouteConfig
) {
  async function findOwnedSession(sessionId: string, userId: string) {
    const campaign = await findCampaign(config.campaignSlug);
    if (!campaign) return null;
    return findSessionForCampaignUser(sessionId, userId, campaign.id);
  }

  async function generateAndSave(params: {
    sessionId: string;
    userId: string;
    generationToken: string;
    targetOrdinances: string[];
  }) {
    try {
      await checkSystemDailyCostLimit();
      await checkSystemMonthlyCostLimit();
      const messages = await findMessages(params.sessionId);
      const output = await config.generate({
        userId: params.userId,
        sessionId: params.sessionId,
        messages: messages.map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        })),
        targetOrdinances: params.targetOrdinances,
      });
      return await saveGeneratedDraft({
        sessionId: params.sessionId,
        generationToken: params.generationToken,
        targetOrdinances: params.targetOrdinances,
        aiBody: output.body,
        finalBody: output.body,
        sourceRefs: config.sources.map(({ id, title, url }) => ({
          id,
          title,
          url,
        })),
        factCheckNotes: output.fact_check_notes,
      });
    } catch (error) {
      await failDraftGeneration({
        sessionId: params.sessionId,
        generationToken: params.generationToken,
        errorCode:
          error instanceof Error && error.name
            ? error.name
            : "generation_failed",
      }).catch(() => undefined);
      throw error;
    }
  }

  return {
    POST: async (request: Request) => {
      await registerNodeTelemetry();
      const body = await request.json().catch(() => null);
      const sessionId =
        typeof body?.sessionId === "string" ? body.sessionId : "";
      const targetOrdinances = config.parseTargetOrdinances(body);
      if (!sessionId || !targetOrdinances) {
        return NextResponse.json(
          { error: "下書きの対象を確認してください" },
          { status: 400 }
        );
      }

      const actor = await getPublicCommentActor();
      if (!actor)
        return NextResponse.json(
          { error: "セッションを確認できません" },
          { status: 401 }
        );

      try {
        const session = await findOwnedSession(sessionId, actor.id);
        if (!session)
          return NextResponse.json(
            { error: "セッションが見つかりません" },
            { status: 404 }
          );
        if (session.completed_at)
          return NextResponse.json(
            { error: "このインタビューは完了しています" },
            { status: 409 }
          );

        const verified = isVerifiedPublicCommentUser(actor);
        const existingDraft = await findDraft(session.id);
        if (existingDraft) {
          return verified
            ? NextResponse.json({
                status: "ready",
                draft: existingDraft,
                sources: config.sources,
              })
            : generationStatus("ready");
        }

        const messages = await findMessages(session.id);
        if (
          !canCreateInterviewDraft(
            session.interview_state,
            messages.filter((message) => message.role === "user").length,
            config.questionsLength
          )
        )
          return NextResponse.json(
            { error: "インタビューを最後まで回答してください" },
            { status: 409 }
          );

        const claim = await claimDraftGeneration({
          sessionId,
          userId: actor.id,
        });
        if (claim.status === "ready") {
          const draft = await findDraft(session.id);
          return verified && draft
            ? NextResponse.json({
                status: "ready",
                draft,
                sources: config.sources,
              })
            : generationStatus("ready");
        }
        if (claim.status === "generating")
          return generationStatus("generating");

        const task = () =>
          generateAndSave({
            sessionId,
            userId: actor.id,
            generationToken: claim.token,
            targetOrdinances,
          });

        if (verified) {
          const draft = await task();
          return NextResponse.json({
            status: "ready",
            draft,
            sources: config.sources,
          });
        }

        after(async () => {
          try {
            await task();
          } catch {
            console.error(
              `${config.logLabel} background draft generation failed`
            );
          }
        });
        return generationStatus("generating");
      } catch (error) {
        if (error instanceof PublicCommentCompletedError)
          return NextResponse.json(
            { error: "このインタビューは完了しています" },
            { status: 409 }
          );
        console.error(
          `${config.logLabel} public comment draft generation error`
        );
        return NextResponse.json(
          { error: "下書きを作成できませんでした" },
          { status: 500 }
        );
      }
    },

    PATCH: async (request: Request) => {
      const body = await request.json().catch(() => null);
      const sessionId =
        typeof body?.sessionId === "string" ? body.sessionId : "";
      const finalBody =
        typeof body?.finalBody === "string" ? body.finalBody : "";
      const targetOrdinances = config.parseTargetOrdinances(body);
      if (!sessionId || !finalBody.trim() || !targetOrdinances)
        return NextResponse.json(
          { error: "下書き本文が必要です" },
          { status: 400 }
        );

      const user = await getPublicCommentUser();
      if (!user)
        return NextResponse.json(
          { error: "Googleログインが必要です" },
          { status: 401 }
        );

      try {
        const session = await findOwnedSession(sessionId, user.id);
        if (!session)
          return NextResponse.json(
            { error: "セッションが見つかりません" },
            { status: 404 }
          );
        const draft = await findDraft(sessionId);
        if (!draft)
          return NextResponse.json(
            { error: "下書きが見つかりません" },
            { status: 404 }
          );
        if (session.completed_at) {
          const unchanged =
            draft.final_body === finalBody &&
            JSON.stringify(draft.target_ordinances) ===
              JSON.stringify(targetOrdinances);
          return unchanged
            ? NextResponse.json({ draft })
            : NextResponse.json(
                { error: "完了済みの下書きは変更できません" },
                { status: 409 }
              );
        }
        const updated = await updateDraft({
          sessionId,
          userId: user.id,
          finalBody,
          targetOrdinances,
        });
        return NextResponse.json({ draft: updated });
      } catch (error) {
        if (error instanceof PublicCommentCompletedError) {
          const frozen = await findDraft(sessionId);
          const unchanged = Boolean(
            frozen &&
              frozen.final_body === finalBody &&
              JSON.stringify(frozen.target_ordinances) ===
                JSON.stringify(targetOrdinances)
          );
          return unchanged
            ? NextResponse.json({ draft: frozen })
            : NextResponse.json(
                { error: "完了済みの下書きは変更できません" },
                { status: 409 }
              );
        }
        console.error(`${config.logLabel} public comment draft update error`);
        return NextResponse.json(
          { error: "下書きを保存できませんでした" },
          { status: 500 }
        );
      }
    },
  };
}
