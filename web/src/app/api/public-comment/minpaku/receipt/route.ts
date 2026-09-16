import { NextResponse } from "next/server";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import { sendPublicCommentReceipt } from "@/features/public-comment/minpaku/server/receipt";
import { findSessionForUser } from "@/features/public-comment/minpaku/server/repository";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.sessionId !== "string" || !body.sessionId) {
    return NextResponse.json({ error: "sessionIdが必要です" }, { status: 400 });
  }
  const user = await getPublicCommentUser();
  if (!user)
    return NextResponse.json(
      { error: "Googleログインが必要です" },
      { status: 401 }
    );
  try {
    const session = await findSessionForUser(body.sessionId, user.id);
    if (!session)
      return NextResponse.json(
        { error: "セッションが見つかりません" },
        { status: 404 }
      );
    if (!session.completed_at)
      return NextResponse.json(
        { error: "インタビューを完了してください" },
        { status: 409 }
      );
    return NextResponse.json({
      receipt: await sendPublicCommentReceipt(session.id, user.id),
    });
  } catch {
    console.warn("public_comment_receipt_retry_failed");
    return NextResponse.json(
      { error: "控えメールの状態を確認できませんでした" },
      { status: 500 }
    );
  }
}
