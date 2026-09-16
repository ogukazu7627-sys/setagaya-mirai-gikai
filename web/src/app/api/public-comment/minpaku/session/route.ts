import { NextResponse } from "next/server";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import { savePublicCommentEmailPreference } from "@/features/public-comment/minpaku/server/email-preference-repository";
import {
  appendMessage,
  createSession,
  findActiveSession,
  findCampaign,
  findMessages,
} from "@/features/public-comment/minpaku/server/repository";
import {
  MINPAKU_CAMPAIGN_SLUG,
  MINPAKU_QUESTIONS,
} from "@/features/public-comment/minpaku/shared/campaign";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";
import { registerNodeTelemetry } from "@/lib/telemetry/register";

export async function POST(request: Request) {
  await registerNodeTelemetry();

  const body = await request.json().catch(() => null);
  if (
    !body ||
    body.consented !== true ||
    typeof body.emailOptIn !== "boolean" ||
    body.consentVersion !== PUBLIC_COMMENT_CONSENT_VERSION
  ) {
    return NextResponse.json(
      { error: "最新の同意事項を確認してください" },
      { status: 400 }
    );
  }

  const user = await getPublicCommentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Googleログインが必要です" },
      { status: 401 }
    );
  }

  try {
    const campaign = await findCampaign(MINPAKU_CAMPAIGN_SLUG);
    if (!campaign || campaign.status !== "published") {
      return NextResponse.json(
        { error: "キャンペーンが見つかりません" },
        { status: 404 }
      );
    }

    await savePublicCommentEmailPreference(user.id, body.emailOptIn);

    const session =
      (await findActiveSession(campaign.id, user.id)) ??
      (await createSession({ campaignId: campaign.id, userId: user.id }));
    let messages = await findMessages(session.id);

    if (messages.length === 0) {
      const firstQuestion = MINPAKU_QUESTIONS[0];
      await appendMessage({
        sessionId: session.id,
        role: "assistant",
        stage: "interview",
        questionId: firstQuestion.id,
        content: firstQuestion.question,
      });
      messages = await findMessages(session.id);
    }

    return NextResponse.json({
      sessionId: session.id,
      messages,
      quickReplies: MINPAKU_QUESTIONS[0].quickReplies,
    });
  } catch (error) {
    console.error("Public comment session error:", error);
    return NextResponse.json(
      { error: "インタビューを開始できませんでした" },
      { status: 500 }
    );
  }
}
