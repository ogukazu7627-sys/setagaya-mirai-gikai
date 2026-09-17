import { NextResponse } from "next/server";
import { DEMENTIA_HOPE_PLAN_CAMPAIGN_SLUG } from "@/features/public-comment/dementia-hope-plan/shared/campaign";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import {
  completeSession,
  findCampaign,
  findDraft,
  findSessionForCampaignUser,
} from "@/features/public-comment/minpaku/server/repository";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId)
    return NextResponse.json({ error: "sessionIdが必要です" }, { status: 400 });
  if (
    body.publicationRequested !== false ||
    body.receiptOptIn !== false ||
    body.consentVersion !== PUBLIC_COMMENT_CONSENT_VERSION
  )
    return NextResponse.json(
      { error: "このテーマでは公開・メール送信を受け付けていません" },
      { status: 400 }
    );

  const user = await getPublicCommentUser();
  if (!user)
    return NextResponse.json(
      { error: "Googleログインが必要です" },
      { status: 401 }
    );

  try {
    const campaign = await findCampaign(DEMENTIA_HOPE_PLAN_CAMPAIGN_SLUG);
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
      receiptOptIn: false,
      consentVersion: body.consentVersion,
    });
    return NextResponse.json({ status });
  } catch {
    console.error("DementiaHopePlan public comment completion error");
    return NextResponse.json(
      { error: "完了処理に失敗しました" },
      { status: 500 }
    );
  }
}
