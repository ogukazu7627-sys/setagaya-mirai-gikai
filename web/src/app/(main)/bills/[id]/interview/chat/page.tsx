import { notFound } from "next/navigation";

import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { InterviewChatClient } from "@/features/interview-session/client/components/interview-chat-client";
import { InterviewSessionErrorView } from "@/features/interview-session/client/components/interview-session-error-view";
import { initializeInterviewChat } from "@/features/interview-session/server/loaders/initialize-interview-chat";
import { isLoopFamilyMode } from "@/features/interview-session/shared/utils/is-loop-family-mode";
import { NO_INDEX_METADATA } from "@/lib/seo/no-index-metadata";

export const dynamic = "force-dynamic";
export const metadata = NO_INDEX_METADATA;

interface InterviewChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InterviewChatPage({
  params,
}: InterviewChatPageProps) {
  const { id: billId } = await params;

  // 案件とインタビュー設定を取得
  const [bill, interviewConfig] = await Promise.all([
    getBillById(billId),
    getInterviewConfig(billId),
  ]);

  if (!bill || bill.interview_enabled !== true || !interviewConfig) {
    notFound();
  }

  // 1問ずつ進むモードでは質問数を取得（プログレスバー用）
  const questions = isLoopFamilyMode(interviewConfig.mode)
    ? await getInterviewQuestions(interviewConfig.id)
    : [];

  // インタビューチャットの初期化処理
  try {
    const { session, messages } = await initializeInterviewChat(
      billId,
      interviewConfig.id
    );

    return (
      <InterviewChatClient
        billId={billId}
        billTitle={bill.bill_content?.title ?? bill.name}
        sessionId={session.id}
        initialMessages={messages}
        mode={interviewConfig.mode}
        totalQuestions={questions.length}
        estimatedDuration={interviewConfig.estimated_duration}
        sessionStartedAt={session.started_at}
        hasRated={session.rating != null}
      />
    );
  } catch (error) {
    console.error("Failed to initialize interview session:", error);
    return <InterviewSessionErrorView billId={billId} />;
  }
}
