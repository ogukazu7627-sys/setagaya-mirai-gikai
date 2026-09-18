import "server-only";

import { NextResponse } from "next/server";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import { sendPublicCommentReceipt } from "@/features/public-comment/minpaku/server/receipt";
import {
  completeSession,
  findCampaign,
  findDraft,
  findSessionForCampaignUser,
} from "@/features/public-comment/minpaku/server/repository";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";

export function createPublicCommentCompleteHandler(campaignSlug: string) {
  return async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    if (!sessionId)
      return NextResponse.json(
        { error: "sessionIdが必要です" },
        { status: 400 }
      );
    if (
      body.publicationRequested !== false ||
      typeof body.receiptOptIn !== "boolean" ||
      body.consentVersion !== PUBLIC_COMMENT_CONSENT_VERSION
    )
      return NextResponse.json(
        { error: "最新の同意事項を確認してください" },
        { status: 400 }
      );

    const user = await getPublicCommentUser();
    if (!user)
      return NextResponse.json(
        { error: "Googleログインが必要です" },
        { status: 401 }
      );

    try {
      const campaign = await findCampaign(campaignSlug);
      if (!campaign)
        return NextResponse.json(
          { error: "キャンペーンが見つかりません" },
          { status: 404 }
        );
      const session = await findSessionForCampaignUser(
        sessionId,
        user.id,
        campaign.id
      );
      if (!session)
        return NextResponse.json(
          { error: "セッションが見つかりません" },
          { status: 404 }
        );
      const draft = await findDraft(sessionId);
      if (!draft?.final_body?.trim())
        return NextResponse.json(
          { error: "下書きを確認してから完了してください" },
          { status: 400 }
        );
      const status = await completeSession({
        sessionId,
        userId: user.id,
        publicationRequested: false,
        receiptOptIn: body.receiptOptIn,
        consentVersion: body.consentVersion,
      });
      const receipt = body.receiptOptIn
        ? await sendPublicCommentReceipt(sessionId, user.id)
        : { status: "not_requested" as const, canRetry: false };
      return NextResponse.json({ status, receipt });
    } catch {
      console.warn("public_comment_completion_failed");
      return NextResponse.json(
        { error: "完了処理に失敗しました" },
        { status: 500 }
      );
    }
  };
}

export function createPublicCommentReceiptHandler(campaignSlug: string) {
  return async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    if (typeof body?.sessionId !== "string" || !body.sessionId)
      return NextResponse.json(
        { error: "sessionIdが必要です" },
        { status: 400 }
      );

    const user = await getPublicCommentUser();
    if (!user)
      return NextResponse.json(
        { error: "Googleログインが必要です" },
        { status: 401 }
      );

    try {
      const campaign = await findCampaign(campaignSlug);
      if (!campaign)
        return NextResponse.json(
          { error: "キャンペーンが見つかりません" },
          { status: 404 }
        );
      const session = await findSessionForCampaignUser(
        body.sessionId,
        user.id,
        campaign.id
      );
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
  };
}
