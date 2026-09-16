import { NextResponse } from "next/server";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import { sendPublicCommentReceipt } from "@/features/public-comment/minpaku/server/receipt";
import {
  completeSession,
  findDraft,
  findSessionForUser,
} from "@/features/public-comment/minpaku/server/repository";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const publicationRequested = body?.publicationRequested === true;
  if (!sessionId)
    return NextResponse.json({ error: "sessionIdが必要です" }, { status: 400 });
  if (
    typeof body.publicationRequested !== "boolean" ||
    typeof body.receiptOptIn !== "boolean" ||
    body.consentVersion !== PUBLIC_COMMENT_CONSENT_VERSION
  ) {
    return NextResponse.json(
      { error: "最新の同意事項を確認してください" },
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
    if (!draft?.final_body?.trim()) {
      return NextResponse.json(
        { error: "下書きを確認してから完了してください" },
        { status: 400 }
      );
    }
    const status = await completeSession({
      sessionId,
      userId: user.id,
      publicationRequested,
      receiptOptIn: body.receiptOptIn,
      consentVersion: body.consentVersion,
    });
    const receipt = await sendPublicCommentReceipt(sessionId, user.id);
    return NextResponse.json({
      status,
      receipt,
    });
  } catch {
    console.error("Public comment completion error");
    return NextResponse.json(
      { error: "完了処理に失敗しました" },
      { status: 500 }
    );
  }
}
