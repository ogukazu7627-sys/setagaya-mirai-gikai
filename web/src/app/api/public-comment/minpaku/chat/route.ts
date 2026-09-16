import { NextResponse } from "next/server";
import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { generateInterviewResponse } from "@/features/public-comment/minpaku/server/ai";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import {
  appendMessage,
  findMessages,
  findSessionForUser,
  PublicCommentCompletedError,
} from "@/features/public-comment/minpaku/server/repository";
import { MINPAKU_QUESTIONS } from "@/features/public-comment/minpaku/shared/campaign";
import { registerNodeTelemetry } from "@/lib/telemetry/register";

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: Request) {
  await registerNodeTelemetry();
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!sessionId || !content) {
    return NextResponse.json(
      { error: "sessionIdと回答が必要です" },
      { status: 400 }
    );
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "回答が長すぎます" }, { status: 400 });
  }

  const user = await getPublicCommentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Googleログインが必要です" },
      { status: 401 }
    );
  }

  try {
    const session = await findSessionForUser(sessionId, user.id);
    if (!session) {
      return NextResponse.json(
        { error: "セッションが見つかりません" },
        { status: 404 }
      );
    }
    if (session.completed_at) {
      return NextResponse.json(
        { error: "このインタビューは完了しています" },
        { status: 409 }
      );
    }

    await checkSystemDailyCostLimit();
    await checkSystemMonthlyCostLimit();

    const beforeMessages = await findMessages(session.id);
    const userAnswerCount =
      beforeMessages.filter((message) => message.role === "user").length + 1;
    await appendMessage({
      sessionId: session.id,
      role: "user",
      stage: "interview",
      questionId:
        MINPAKU_QUESTIONS[Math.max(0, userAnswerCount - 1)]?.id ?? null,
      content,
    });

    if (userAnswerCount >= MINPAKU_QUESTIONS.length) {
      const closingText =
        "ありがとうございます。ここまでの内容をもとに、条例の対象と下書きに含める内容を確認してから、コメント案を作成できます。";
      const assistantMessage = await appendMessage({
        sessionId: session.id,
        role: "assistant",
        stage: "interview",
        questionId: null,
        content: closingText,
      });
      return NextResponse.json({
        message: assistantMessage,
        nextStage: "draft",
        quickReplies: [],
      });
    }

    const nextQuestion = MINPAKU_QUESTIONS[userAnswerCount];
    const messages = await findMessages(session.id);
    const response = await generateInterviewResponse({
      userId: user.id,
      sessionId: session.id,
      messages: messages.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
      nextQuestionId: nextQuestion.id,
    });
    const assistantMessage = await appendMessage({
      sessionId: session.id,
      role: "assistant",
      stage: "interview",
      questionId: response.question_id ?? nextQuestion.id,
      content: response.text,
    });

    return NextResponse.json({
      message: assistantMessage,
      nextStage: "interview",
      quickReplies:
        response.quick_replies.length > 0
          ? response.quick_replies
          : nextQuestion.quickReplies,
      topicTitle: response.topic_title ?? nextQuestion.topic,
    });
  } catch (error) {
    if (error instanceof PublicCommentCompletedError) {
      return NextResponse.json(
        { error: "このインタビューは完了しています" },
        { status: 409 }
      );
    }
    console.error("Public comment chat error");
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
