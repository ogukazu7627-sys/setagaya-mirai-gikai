import "server-only";

import { buildInterviewOpinionRows } from "@mirai-gikai/shared/interview-report/build-opinion-rows";
import type { InterviewOpinionSource } from "@mirai-gikai/shared/interview-report/schema";
import { syncInterviewOpinions } from "@mirai-gikai/shared/interview-report/sync-opinions";
import {
  isWithinDailyCostLimit,
  isWithinDailyPromptUsageLimit,
  recordChatUsage,
} from "@/features/chat/server/services/cost-tracker";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { env } from "@/lib/env";
import type { InterviewReportData } from "../../shared/schemas";
import type { InterviewReport } from "../../shared/types";
import { buildCompletedInterviewReportInsert } from "../../shared/utils/complete-interview-report";
import { extractReportFromMessage } from "../../shared/utils/report-extraction";
import {
  findInterviewMessagesBySessionIdDesc,
  findInterviewReportBySessionId,
  findInterviewSessionWithConfigById,
  updateInterviewSessionCompleted,
  upsertInterviewReport,
} from "../repositories/interview-session-repository";
import { evaluateModerationScore } from "./evaluate-moderation-score";

type CompleteInterviewSessionParams = {
  sessionId: string;
  userId: string;
  isPublicByUser?: boolean;
};

const MODERATION_PROMPT_NAME = "interview-complete-moderation";

/**
 * インタビューを完了し、会話中に生成されたレポートを保存する
 */
export async function completeInterviewSession({
  sessionId,
  userId,
  isPublicByUser,
}: CompleteInterviewSessionParams): Promise<InterviewReport> {
  const session = await findInterviewSessionWithConfigById(sessionId);
  const billId = getBillIdFromSession(session);

  const existingReport = await findInterviewReportBySessionId(sessionId);
  if (existingReport) {
    if (!session.completed_at) {
      await updateInterviewSessionCompleted(sessionId);
    }
    return existingReport;
  }

  const [isWithinCostLimit, isWithinCompletionLimit] = await Promise.all([
    isWithinDailyCostLimit(userId, env.chat.dailyUserCostLimitUsd),
    isWithinDailyPromptUsageLimit(
      userId,
      MODERATION_PROMPT_NAME,
      env.interviewComplete.dailyUserLimit
    ),
  ]);

  if (!isWithinCostLimit) {
    throw new ChatError(ChatErrorCode.DAILY_COST_LIMIT_REACHED);
  }

  if (!isWithinCompletionLimit) {
    throw new ChatError(ChatErrorCode.DAILY_REQUEST_LIMIT_REACHED);
  }

  // メッセージ履歴を取得（新しい順）
  const messages = await findInterviewMessagesBySessionIdDesc(sessionId);

  // 最新のアシスタントメッセージからレポートを抽出
  let reportData: InterviewReportData | null = null;
  for (const message of messages) {
    if (message.role === "assistant") {
      reportData = extractReportFromMessage(message.content);
      if (reportData) {
        break;
      }
    }
  }

  if (!reportData) {
    throw new Error("No report found in conversation messages");
  }

  // モデレーションスコアを評価（タイムアウト30秒）
  const MODERATION_TIMEOUT_MS = 30_000;
  let moderationScore: number | null = null;
  let moderationReasoning: string | null = null;
  let moderationUsageRecorded = false;
  try {
    const moderation = await Promise.race([
      evaluateModerationScore({
        summary: reportData.summary,
        opinions: reportData.opinions,
        roleDescription: reportData.role_description,
        messages: [...messages].reverse().map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Moderation evaluation timed out")),
          MODERATION_TIMEOUT_MS
        )
      ),
    ]);
    moderationScore = moderation.score;
    moderationReasoning = moderation.reasoning;

    await recordChatUsage({
      userId,
      sessionId,
      promptName: MODERATION_PROMPT_NAME,
      model: moderation.model,
      usage: moderation.usage,
      costUsd: moderation.costUsd,
      metadata: {
        pageType: "interview",
        billId,
        finishReason: moderation.finishReason,
        stepCount: 0,
        moderationScore: moderation.score,
      },
    });
    moderationUsageRecorded = true;
  } catch (error) {
    if (moderationScore !== null && !moderationUsageRecorded) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to record interview complete moderation usage: ${message}`
      );
    }

    // モデレーション失敗はレポート保存をブロックしない
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Moderation evaluation failed for session ${sessionId}: ${message}`
    );
  }

  // レポートを保存（UPSERT）
  // content_richnessはZodスキーマでバリデーション済み（totalは0-100の整数）
  // moderation_statusはgenerated columnのためscoreのみ保存
  const report = await upsertInterviewReport(
    buildCompletedInterviewReportInsert({
      sessionId,
      messages,
      reportData,
      moderationScore,
      moderationReasoning,
      isPublicByUser,
    })
  );

  // 新規インタビュー完了時は JSONB（report.opinions）と interview_opinion テーブルの
  // 両方へ書き込む（既存互換のため。JSONB はユーザーが確認するレポート記録、
  // interview_opinion はトピック分析用の意見ストア）。
  // 失敗してもインタビュー完了はブロックしない。未同期分は意見再抽出バックフィルが取り込む
  // （再抽出は JSONB を書き換えず interview_opinion のみ更新する）。
  try {
    const storedOpinions = Array.isArray(report.opinions)
      ? (report.opinions as InterviewOpinionSource[])
      : [];
    await syncInterviewOpinions(
      report.id,
      buildInterviewOpinionRows(report.id, storedOpinions)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Failed to sync interview_opinion for session ${sessionId}: ${message}`
    );
  }

  // セッションを完了
  await updateInterviewSessionCompleted(sessionId);

  return report;
}

function getBillIdFromSession(
  session: Awaited<ReturnType<typeof findInterviewSessionWithConfigById>>
): string | null {
  const config = session.interview_configs;
  if (!config || Array.isArray(config)) {
    return null;
  }

  return typeof config.bill_id === "string" ? config.bill_id : null;
}
