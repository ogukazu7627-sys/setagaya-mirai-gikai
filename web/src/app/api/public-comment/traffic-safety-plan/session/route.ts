import { NextResponse } from "next/server";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import {
  appendMessage,
  createSession,
  findActiveSession,
  findCampaign,
  findDraft,
  findMessages,
  saveSessionReceiptConsent,
} from "@/features/public-comment/minpaku/server/repository";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";
import {
  TRAFFIC_SAFETY_PLAN_CAMPAIGN_SLUG,
  TRAFFIC_SAFETY_PLAN_QUESTIONS,
  TRAFFIC_SAFETY_PLAN_SOURCES,
} from "@/features/public-comment/traffic-safety-plan/shared/campaign";
import { registerNodeTelemetry } from "@/lib/telemetry/register";

export async function POST(request: Request) {
  await registerNodeTelemetry();
  const body = await request.json().catch(() => null);
  if (
    !body ||
    body.consented !== true ||
    body.receiptOptIn !== false ||
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
    const campaign = await findCampaign(TRAFFIC_SAFETY_PLAN_CAMPAIGN_SLUG);
    if (!campaign || campaign.status !== "published")
      return NextResponse.json(
        { error: "キャンペーンが見つかりません" },
        { status: 404 }
      );

    const active = await findActiveSession(campaign.id, user.id);
    const consent = {
      userId: user.id,
      receiptOptIn: false,
      consentVersion: body.consentVersion,
    };
    const session = active
      ? await saveSessionReceiptConsent({ sessionId: active.id, ...consent })
      : await createSession({ campaignId: campaign.id, ...consent });
    let messages = await findMessages(session.id);

    if (messages.length === 0) {
      const firstQuestion = TRAFFIC_SAFETY_PLAN_QUESTIONS[0];
      await appendMessage({
        sessionId: session.id,
        role: "assistant",
        stage: "interview",
        questionId: firstQuestion.id,
        content: firstQuestion.question,
      });
      messages = await findMessages(session.id);
    }

    const draft = await findDraft(session.id);
    if (draft) {
      return NextResponse.json({
        sessionId: session.id,
        messages,
        quickReplies: [],
        nextStage: "review",
        draft,
        sources: TRAFFIC_SAFETY_PLAN_SOURCES,
      });
    }

    const answerCount = messages.filter(
      (message) => message.role === "user"
    ).length;
    if (answerCount >= TRAFFIC_SAFETY_PLAN_QUESTIONS.length) {
      return NextResponse.json({
        sessionId: session.id,
        messages,
        quickReplies: [],
        nextStage: "draft",
      });
    }

    const lastAssistantQuestionId = [...messages]
      .reverse()
      .find((message) => message.role === "assistant")?.question_id;
    const currentQuestion =
      TRAFFIC_SAFETY_PLAN_QUESTIONS.find(
        (question) => question.id === lastAssistantQuestionId
      ) ?? TRAFFIC_SAFETY_PLAN_QUESTIONS[0];

    return NextResponse.json({
      sessionId: session.id,
      messages,
      quickReplies: currentQuestion.quickReplies,
      nextStage: "interview",
    });
  } catch {
    console.error("TrafficSafetyPlan public comment session error");
    return NextResponse.json(
      { error: "インタビューを開始できませんでした" },
      { status: 500 }
    );
  }
}
