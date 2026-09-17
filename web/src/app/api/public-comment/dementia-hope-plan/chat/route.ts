import { NextResponse } from "next/server";
import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { generateInterviewResponse } from "@/features/public-comment/dementia-hope-plan/server/ai";
import {
  DEMENTIA_HOPE_PLAN_CAMPAIGN_SLUG,
  DEMENTIA_HOPE_PLAN_QUESTIONS,
} from "@/features/public-comment/dementia-hope-plan/shared/campaign";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import {
  appendMessage,
  findCampaign,
  findMessages,
  findSessionForCampaignUser,
  PublicCommentCompletedError,
} from "@/features/public-comment/minpaku/server/repository";
import { registerNodeTelemetry } from "@/lib/telemetry/register";

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: Request) {
  await registerNodeTelemetry();
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!sessionId || !content)
    return NextResponse.json(
      { error: "sessionIdと回答が必要です" },
      { status: 400 }
    );
  if (content.length > MAX_MESSAGE_LENGTH)
    return NextResponse.json({ error: "回答が長すぎます" }, { status: 400 });

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
    if (session.completed_at)
      return NextResponse.json(
        { error: "このインタビューは完了しています" },
        { status: 409 }
      );

    const beforeMessages = await findMessages(session.id);
    const previousAnswerCount = beforeMessages.filter(
      (message) => message.role === "user"
    ).length;
    if (previousAnswerCount >= DEMENTIA_HOPE_PLAN_QUESTIONS.length)
      return NextResponse.json(
        { error: "インタビューは終了しています" },
        { status: 409 }
      );

    await checkSystemDailyCostLimit();
    await checkSystemMonthlyCostLimit();
    const userAnswerCount = previousAnswerCount + 1;
    const isComplete = userAnswerCount >= DEMENTIA_HOPE_PLAN_QUESTIONS.length;
    const nextQuestion = isComplete
      ? null
      : DEMENTIA_HOPE_PLAN_QUESTIONS[userAnswerCount];
    const response = await generateInterviewResponse({
      userId: user.id,
      sessionId: session.id,
      messages: [
        ...beforeMessages.map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        })),
        { role: "user", content },
      ],
      nextQuestionId: nextQuestion?.id ?? "",
    });
    await appendMessage({
      sessionId: session.id,
      role: "user",
      stage: "interview",
      questionId:
        DEMENTIA_HOPE_PLAN_QUESTIONS[Math.max(0, userAnswerCount - 1)]?.id ??
        null,
      content,
    });
    const assistantMessage = await appendMessage({
      sessionId: session.id,
      role: "assistant",
      stage: "interview",
      questionId: nextQuestion?.id ?? null,
      content: response.text,
    });
    return NextResponse.json({
      message: assistantMessage,
      nextStage: isComplete ? "draft" : "interview",
      quickReplies:
        !isComplete && response.quick_replies.length > 0
          ? response.quick_replies
          : (nextQuestion?.quickReplies ?? []),
      topicTitle: response.topic_title ?? nextQuestion?.topic ?? null,
    });
  } catch (error) {
    if (error instanceof PublicCommentCompletedError)
      return NextResponse.json(
        { error: "このインタビューは完了しています" },
        { status: 409 }
      );
    console.error("DementiaHopePlan public comment chat error");
    if (error instanceof ChatError) {
      const status =
        error.code === ChatErrorCode.DAILY_COST_LIMIT_REACHED ||
        error.code === ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED ||
        error.code === ChatErrorCode.SYSTEM_MONTHLY_COST_LIMIT_REACHED
          ? 429
          : 500;
      return NextResponse.json(
        { error: "本日のAI利用上限に達しました" },
        { status }
      );
    }
    return NextResponse.json(
      { error: "回答を処理できませんでした" },
      { status: 500 }
    );
  }
}
