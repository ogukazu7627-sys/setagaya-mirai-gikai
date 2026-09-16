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
    const messages = await findMessages(session.id);
    const userAnswerCount = messages.filter(
      (message) => message.role === "user"
    ).length;
    if (userAnswerCount < MINPAKU_QUESTIONS.length) {
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
    console.error("Public comment draft generation error:", error);
    return NextResponse.json(
      { error: "下書きを作成できませんでした" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const finalBody =
    typeof body?.finalBody === "string" ? body.finalBody.trim() : "";
  const targetOrdinances = parseTargetOrdinances(body?.targetOrdinances);
  if (!sessionId || !finalBody || !targetOrdinances) {
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
    const updated = await updateDraft({
      sessionId,
      finalBody,
      targetOrdinances,
    });
    return NextResponse.json({ draft: updated });
  } catch (error) {
    console.error("Public comment draft update error:", error);
    return NextResponse.json(
      { error: "下書きを保存できませんでした" },
      { status: 500 }
    );
  }
}
