import { NextResponse } from "next/server";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import {
  completeSession,
  findDraft,
  findSessionForUser,
} from "@/features/public-comment/minpaku/server/repository";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const publicationRequested = body?.publicationRequested === true;
  if (!sessionId)
    return NextResponse.json({ error: "sessionIdが必要です" }, { status: 400 });

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
    if (!draft?.final_body?.trim()) {
      return NextResponse.json(
        { error: "下書きを確認してから完了してください" },
        { status: 400 }
      );
    }
    await completeSession({ sessionId, publicationRequested });
    return NextResponse.json({
      status: publicationRequested ? "pending_review" : "private",
    });
  } catch (error) {
    console.error("Public comment completion error:", error);
    return NextResponse.json(
      { error: "完了処理に失敗しました" },
      { status: 500 }
    );
  }
}
