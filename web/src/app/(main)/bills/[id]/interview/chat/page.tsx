import { notFound } from "next/navigation";

import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { InterviewChatPageClient } from "@/features/interview-session/client/components/interview-chat-page-client";
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

  return <InterviewChatPageClient billId={billId} />;
}
