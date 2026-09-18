import { NextResponse } from "next/server";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import { sendPublicCommentReceipt } from "@/features/public-comment/minpaku/server/receipt";
import {
  completeSession,
  findDraft,
  findSessionForUser,
} from "@/features/public-comment/minpaku/server/repository";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";
import type { PublicCommentReceipt } from "@/features/public-comment/minpaku/shared/receipt";

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
    let status: string;
    try {
      // A lost response can leave the session completed while the browser still
      // shows the review screen. Treat that retry as a read, not a new write.
      status = session.completed_at
        ? (session.publication_status ?? "private")
        : await completeSession({
            sessionId,
            userId: user.id,
            publicationRequested,
            receiptOptIn: body.receiptOptIn,
            consentVersion: body.consentVersion,
          });
    } catch (error) {
      // Older deployed SQL functions may reject a second completion request.
      // Re-read after the error so a committed completion is still recoverable.
      const completedSession = await findSessionForUser(sessionId, user.id);
      if (!completedSession?.completed_at) throw error;
      status = completedSession.publication_status ?? "private";
    }

    let receipt: PublicCommentReceipt = {
      status: "not_requested",
      canRetry: false,
    };
    if (body.receiptOptIn) {
      try {
        receipt = await sendPublicCommentReceipt(sessionId, user.id);
      } catch {
        // Receipt delivery is best-effort. The completed interview must remain
        // complete and can be retried through the dedicated receipt endpoint.
        receipt = { status: "pending", canRetry: true };
      }
    }
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
