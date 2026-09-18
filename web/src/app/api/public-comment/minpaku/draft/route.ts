import { canCreateInterviewDraft } from "@/features/public-comment/shared/interview-state";
import { NextResponse } from "next/server";
import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import { generatePublicCommentDraft } from "@/features/public-comment/minpaku/server/ai";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import {
  findDraft,
  findMessages,
  findSessionForUser,
  PublicCommentCompletedError,
  updateDraft,
  upsertDraft,
} from "@/features/public-comment/minpaku/server/repository";
import {
  MINPAKU_ORDINANCES,
  MINPAKU_QUESTIONS,
  MINPAKU_SOURCES,
} from "@/features/public-comment/minpaku/shared/campaign";
import { registerNodeTelemetry } from "@/lib/telemetry/register";

function parseTargetOrdinances(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 2) {
    return null;
  }
  const ordinances = value.filter(
    (item): item is string =>
      typeof item === "string" &&
      MINPAKU_ORDINANCES.includes(item as (typeof MINPAKU_ORDINANCES)[number])
  );
  return ordinances.length === value.length ? ordinances : null;
}

export async function POST(request: Request) {
  await registerNodeTelemetry();
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const targetOrdinances = parseTargetOrdinances(body?.targetOrdinances);
  if (!sessionId || !targetOrdinances) {
    return NextResponse.json(
      { error: "対象条例を選択してください" },
      { status: 400 }
    );
  }

  const user = await getPublicCommentUser();
  if (!user)
    return NextResponse.json(
      { error: "Googleログインが必要です" },
      { status: 401 }
    );

  try {
    const session = await findSessionForUser(sessionId, user.id);
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
    const messages = await findMessages(session.id);
    const userAnswerCount = messages.filter(
      (message) => message.role === "user"
    ).length;
    if (
      !canCreateInterviewDraft(
        session.interview_state,
        userAnswerCount,
        MINPAKU_QUESTIONS.length
      )
    ) {
      return NextResponse.json(
        { error: "インタビューを最後まで回答してください" },
        { status: 409 }
      );
    }
    await checkSystemDailyCostLimit();
    await checkSystemMonthlyCostLimit();
    const output = await generatePublicCommentDraft({
      userId: user.id,
      sessionId,
      messages: messages.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
      targetOrdinances,
    });
    const draft = await upsertDraft({
      sessionId,
      userId: user.id,
      targetOrdinances: output.target_ordinances,
      aiBody: output.body,
      finalBody: output.body,
      sourceRefs: MINPAKU_SOURCES.map(({ id, title, url }) => ({
        id,
        title,
        url,
      })),
      factCheckNotes: output.fact_check_notes,
    });
    return NextResponse.json({ draft, sources: MINPAKU_SOURCES });
  } catch (error) {
    if (error instanceof PublicCommentCompletedError)
      return NextResponse.json(
        { error: "このインタビューは完了しています" },
        { status: 409 }
      );
    console.error("Public comment draft generation error");
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
  const targetOrdinances = parseTargetOrdinances(body?.targetOrdinances);
  if (!sessionId || !finalBody.trim() || !targetOrdinances) {
    return NextResponse.json(
      { error: "下書き本文と対象条例が必要です" },
      { status: 400 }
    );
  }
  const user = await getPublicCommentUser();
  if (!user)
    return NextResponse.json(
      { error: "Googleログインが必要です" },
      { status: 401 }
    );

  try {
    const session = await findSessionForUser(sessionId, user.id);
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
      return draft.final_body === finalBody &&
        JSON.stringify(draft.target_ordinances) ===
          JSON.stringify(targetOrdinances)
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
      return frozen &&
        frozen.final_body === finalBody &&
        JSON.stringify(frozen.target_ordinances) ===
          JSON.stringify(targetOrdinances)
        ? NextResponse.json({ draft: frozen })
        : NextResponse.json(
            { error: "完了済みの下書きは変更できません" },
            { status: 409 }
          );
    }
    console.error("Public comment draft update error");
    return NextResponse.json(
      { error: "下書きを保存できませんでした" },
      { status: 500 }
    );
  }
}
