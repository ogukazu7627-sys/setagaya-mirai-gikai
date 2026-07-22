"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { useEndInterview } from "../hooks/use-end-interview";
import { useInterviewCompletion } from "../hooks/use-interview-completion";
import {
  type CompleteInterviewResult,
  callCompleteApi,
} from "../utils/interview-api-client";
import { InterviewChatInput } from "./interview-chat-input";
import { InterviewRecipientSelectionStep } from "./interview-recipient-selection-step";

interface InterviewSummaryInputProps {
  sessionId: string;
  billId: string;
  hasReport: boolean;
  previewToken?: string;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  canPrefetchCompletion?: boolean;
  /** レポート未生成時の「インタビューを続ける」で呼ぶ再開処理 */
  onResume?: () => void;
  isLoading: boolean;
  error: Error | null | undefined;
}

export function InterviewSummaryInput({
  sessionId,
  billId,
  hasReport,
  previewToken,
  input,
  onInputChange,
  onSubmit,
  canPrefetchCompletion = false,
  onResume,
  isLoading,
  error,
}: InterviewSummaryInputProps) {
  const [completionResult, setCompletionResult] =
    useState<CompleteInterviewResult | null>(null);
  const [recipientSelectionError, setRecipientSelectionError] = useState<
    string | null
  >(null);
  const [prefetchedCompletionResult, setPrefetchedCompletionResult] =
    useState<CompleteInterviewResult | null>(null);
  const [isWaitingForCompletion, setIsWaitingForCompletion] = useState(false);
  const completionPrefetchRef =
    useRef<Promise<CompleteInterviewResult | null> | null>(null);
  const { isCompleting, completeError, completeInterview } =
    useInterviewCompletion({
      sessionId,
    });
  const { endInterview, isEnding } = useEndInterview(
    sessionId,
    billId,
    previewToken
  );
  const reportId = completionResult?.report?.id;
  const recipientSelection = completionResult?.recipientSelection;

  const startCompletionPrefetch = useCallback(() => {
    if (
      !canPrefetchCompletion ||
      !hasReport ||
      isLoading ||
      completionResult ||
      prefetchedCompletionResult ||
      completionPrefetchRef.current
    ) {
      return;
    }

    const promise = callCompleteApi({ sessionId, isPublic: false })
      .then((result) => {
        setPrefetchedCompletionResult(result);
        return result;
      })
      .catch((error) => {
        console.error("Failed to prefetch interview completion:", error);
        completionPrefetchRef.current = null;
        return null;
      });
    completionPrefetchRef.current = promise;
  }, [
    canPrefetchCompletion,
    completionResult,
    hasReport,
    isLoading,
    prefetchedCompletionResult,
    sessionId,
  ]);

  useEffect(() => {
    startCompletionPrefetch();
  }, [startCompletionPrefetch]);

  const showRecipientSelection = (result: CompleteInterviewResult | null) => {
    if (result?.report?.id && result.recipientSelection) {
      setCompletionResult(result);
      return true;
    }
    if (result?.report?.id) {
      setRecipientSelectionError(
        "議員選択の準備に失敗しました。時間をおいて再度お試しください。"
      );
      return false;
    }
    setRecipientSelectionError(
      "インタビュー完了処理に失敗しました。時間をおいて再度お試しください。"
    );
    return false;
  };

  const handleStartRecipientSelection = async () => {
    setRecipientSelectionError(null);
    if (
      prefetchedCompletionResult &&
      showRecipientSelection(prefetchedCompletionResult)
    ) {
      return;
    }

    setIsWaitingForCompletion(true);
    const prefetchedResult = completionPrefetchRef.current
      ? await completionPrefetchRef.current
      : null;
    if (prefetchedResult && showRecipientSelection(prefetchedResult)) {
      setIsWaitingForCompletion(false);
      return;
    }

    const result = await completeInterview(false);
    showRecipientSelection(result);
    setIsWaitingForCompletion(false);
  };

  const isPreparingRecipientSelection = isCompleting || isWaitingForCompletion;

  return (
    <>
      {reportId && recipientSelection ? (
        <div className="mb-3">
          <InterviewRecipientSelectionStep
            sessionId={sessionId}
            reportId={reportId}
            selection={recipientSelection}
          />
        </div>
      ) : (
        !isLoading && (
          <div className="mb-3 flex flex-col gap-2">
            {hasReport ? (
              <Button
                onClick={handleStartRecipientSelection}
                disabled={isPreparingRecipientSelection}
              >
                {isPreparingRecipientSelection
                  ? "準備しています..."
                  : "内容に同意して議員を選ぶ"}
              </Button>
            ) : (
              <>
                <p className="mb-2 text-sm font-medium leading-[1.8] text-mirai-text">
                  お話しいただいた内容が短く、レポートを作成できませんでした。もう少しインタビューを続けると、レポートを作成できます。
                </p>
                <Button onClick={() => onResume?.()}>
                  インタビューを続ける
                </Button>
                <Button
                  variant="outline"
                  onClick={endInterview}
                  disabled={isEnding}
                >
                  {isEnding ? "終了中..." : "インタビューを終了する"}
                </Button>
              </>
            )}
            {completeError && (
              <p className="text-sm text-red-500">{completeError}</p>
            )}
            {recipientSelectionError && (
              <p className="text-sm text-red-500">{recipientSelectionError}</p>
            )}
          </div>
        )
      )}
      {hasReport && !completionResult && (
        <InterviewChatInput
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          placeholder="レポートの修正要望を入力する"
          isResponding={isLoading}
          error={error}
        />
      )}
    </>
  );
}
