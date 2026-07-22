"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import type { ReportRecipientSelection } from "@/features/councilor-digest/shared/types";
import { useEndInterview } from "../hooks/use-end-interview";
import { useInterviewCompletion } from "../hooks/use-interview-completion";
import {
  type CompleteInterviewResult,
  callCompleteApi,
  callRecipientCandidatesApi,
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
  const [recipientSelectionPreview, setRecipientSelectionPreview] =
    useState<ReportRecipientSelection | null>(null);
  const [recipientSelectionError, setRecipientSelectionError] = useState<
    string | null
  >(null);
  const [prefetchedCompletionResult, setPrefetchedCompletionResult] =
    useState<CompleteInterviewResult | null>(null);
  const [isRecipientSelectionVisible, setIsRecipientSelectionVisible] =
    useState(false);
  const [isRecipientSelectionLoading, setIsRecipientSelectionLoading] =
    useState(false);
  const completionPrefetchRef =
    useRef<Promise<CompleteInterviewResult | null> | null>(null);
  const recipientSelectionPrefetchRef =
    useRef<Promise<ReportRecipientSelection | null> | null>(null);
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
  const recipientSelection =
    completionResult?.recipientSelection ?? recipientSelectionPreview;

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

    const promise = callCompleteApi({
      sessionId,
      isPublic: false,
      includeRecipientSelection: false,
    })
      .then((result) => {
        setPrefetchedCompletionResult(result);
        if (isRecipientSelectionVisible) {
          setCompletionResult(result);
        }
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
    isRecipientSelectionVisible,
    isLoading,
    prefetchedCompletionResult,
    sessionId,
  ]);

  const startRecipientSelectionPrefetch = useCallback(() => {
    if (
      !canPrefetchCompletion ||
      !hasReport ||
      recipientSelectionPreview ||
      recipientSelectionPrefetchRef.current
    ) {
      return recipientSelectionPrefetchRef.current;
    }

    setIsRecipientSelectionLoading(true);
    const promise = callRecipientCandidatesApi({ sessionId })
      .then((result) => {
        setRecipientSelectionPreview(result.recipientSelection);
        return result.recipientSelection;
      })
      .catch((error) => {
        console.error("Failed to prefetch recipient candidates:", error);
        setRecipientSelectionError(
          "議員候補の確認に失敗しました。時間をおいて再度お試しください。"
        );
        recipientSelectionPrefetchRef.current = null;
        return null;
      })
      .finally(() => {
        setIsRecipientSelectionLoading(false);
      });

    recipientSelectionPrefetchRef.current = promise;
    return promise;
  }, [canPrefetchCompletion, hasReport, recipientSelectionPreview, sessionId]);

  useEffect(() => {
    startCompletionPrefetch();
    startRecipientSelectionPrefetch();
  }, [startCompletionPrefetch, startRecipientSelectionPrefetch]);

  const resolveCompletionResult = (result: CompleteInterviewResult | null) => {
    if (result?.report?.id) {
      setCompletionResult(result);
      return true;
    }
    setRecipientSelectionError(
      "インタビュー完了処理に失敗しました。時間をおいて再度お試しください。"
    );
    return false;
  };

  const handleStartRecipientSelection = async () => {
    setIsRecipientSelectionVisible(true);
    setRecipientSelectionError(null);
    startRecipientSelectionPrefetch();

    if (prefetchedCompletionResult) {
      resolveCompletionResult(prefetchedCompletionResult);
      return;
    }

    const prefetchedResult = completionPrefetchRef.current
      ? await completionPrefetchRef.current
      : null;
    if (prefetchedResult && resolveCompletionResult(prefetchedResult)) {
      return;
    }

    const result = await completeInterview(false);
    resolveCompletionResult(result);
  };

  const isReportPreparing = isCompleting || (!reportId && !completeError);

  return (
    <>
      {isRecipientSelectionVisible ? (
        <div className="mb-3">
          {recipientSelection ? (
            <InterviewRecipientSelectionStep
              sessionId={sessionId}
              reportId={reportId ?? null}
              selection={recipientSelection}
              isReportPreparing={isReportPreparing}
              reportPreparationError={completeError}
            />
          ) : (
            <div className="rounded-2xl border border-primary/20 bg-white px-4 py-4 text-sm font-bold leading-[1.8] text-mirai-text-secondary shadow-sm">
              {isRecipientSelectionLoading
                ? "議員候補を確認しています..."
                : (recipientSelectionError ??
                  "議員候補を確認できませんでした。時間をおいて再度お試しください。")}
            </div>
          )}
          {completeError && (
            <p className="mt-2 text-sm text-red-500">{completeError}</p>
          )}
          {recipientSelectionError && recipientSelection && (
            <p className="mt-2 text-sm text-red-500">
              {recipientSelectionError}
            </p>
          )}
        </div>
      ) : (
        !isLoading && (
          <div className="mb-3 flex flex-col gap-2">
            {hasReport ? (
              <Button
                onClick={handleStartRecipientSelection}
                disabled={isCompleting}
              >
                内容に同意して議員を選ぶ
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
      {hasReport && !isRecipientSelectionVisible && (
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
