import { NextResponse } from "next/server";
import { getAnonymousPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
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
import { registerNodeTelemetry } from "@/lib/telemetry/register";

export async function POST(request: Request) {
  await registerNodeTelemetry();

  const body = await request.json().catch(() => null);
  if (!body || body.consented !== true) {
    return NextResponse.json(
      { error: "保存方針への同意が必要です" },
      { status: 400 }
    );
  }

  const user = await getAnonymousPublicCommentUser();
  if (!user) {
    return NextResponse.json(
      { error: "匿名セッションを開始できません" },
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
