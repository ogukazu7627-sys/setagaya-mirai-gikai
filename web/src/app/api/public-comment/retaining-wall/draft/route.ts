import { NextResponse } from "next/server";
import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import {
  findCampaign,
  findDraft,
  findMessages,
  findSessionForCampaignUser,
  PublicCommentCompletedError,
  updateDraft,
  upsertDraft,
} from "@/features/public-comment/minpaku/server/repository";
import { generatePublicCommentDraft } from "@/features/public-comment/retaining-wall/server/ai";
import {
  RETAINING_WALL_CAMPAIGN_SLUG,
  RETAINING_WALL_POLICY,
  RETAINING_WALL_QUESTIONS,
  RETAINING_WALL_SOURCES,
} from "@/features/public-comment/retaining-wall/shared/campaign";
import { registerNodeTelemetry } from "@/lib/telemetry/register";

async function findOwnedSession(sessionId: string, userId: string) {
  const campaign = await findCampaign(RETAINING_WALL_CAMPAIGN_SLUG);
  if (!campaign) return null;
  return findSessionForCampaignUser(sessionId, userId, campaign.id);
}

export async function POST(request: Request) {
  await registerNodeTelemetry();
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId)
    return NextResponse.json({ error: "sessionIdが必要です" }, { status: 400 });

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
    if (session.completed_at)
      return NextResponse.json(
        { error: "このインタビューは完了しています" },
        { status: 409 }
      );
    const existingDraft = await findDraft(session.id);
    if (existingDraft)
      return NextResponse.json({
        draft: existingDraft,
        sources: RETAINING_WALL_SOURCES,
      });
    const messages = await findMessages(session.id);
    if (
      messages.filter((message) => message.role === "user").length <
      RETAINING_WALL_QUESTIONS.length
    )
      return NextResponse.json(
        { error: "インタビューを最後まで回答してください" },
        { status: 409 }
      );

    await checkSystemDailyCostLimit();
    await checkSystemMonthlyCostLimit();
    const output = await generatePublicCommentDraft({
      userId: user.id,
      sessionId,
      messages: messages.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
    });
    const draft = await upsertDraft({
      sessionId,
      userId: user.id,
      targetOrdinances: [RETAINING_WALL_POLICY],
      aiBody: output.body,
      finalBody: output.body,
      sourceRefs: RETAINING_WALL_SOURCES.map(({ id, title, url }) => ({
        id,
        title,
        url,
      })),
      factCheckNotes: output.fact_check_notes,
    });
    return NextResponse.json({ draft, sources: RETAINING_WALL_SOURCES });
  } catch (error) {
    if (error instanceof PublicCommentCompletedError)
      return NextResponse.json(
        { error: "このインタビューは完了しています" },
        { status: 409 }
      );
    console.error("RetainingWall public comment draft generation error");
    return NextResponse.json(
      { error: "下書きを作成できませんでした" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const finalBody = typeof body?.finalBody === "string" ? body.finalBody : "";
  if (!sessionId || !finalBody.trim())
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
    if (session.completed_at)
      return draft.final_body === finalBody
        ? NextResponse.json({ draft })
        : NextResponse.json(
            { error: "完了済みの下書きは変更できません" },
            { status: 409 }
          );
    const updated = await updateDraft({
      sessionId,
      userId: user.id,
      finalBody,
      targetOrdinances: [RETAINING_WALL_POLICY],
    });
    return NextResponse.json({ draft: updated });
  } catch (error) {
    if (error instanceof PublicCommentCompletedError) {
      const frozen = await findDraft(sessionId);
      return frozen?.final_body === finalBody
        ? NextResponse.json({ draft: frozen })
        : NextResponse.json(
            { error: "完了済みの下書きは変更できません" },
            { status: 409 }
          );
    }
    console.error("RetainingWall public comment draft update error");
    return NextResponse.json(
      { error: "下書きを保存できませんでした" },
      { status: 500 }
    );
  }
}
