"use client";

import type { InterviewMode } from "@mirai-gikai/shared/interview-prompts/types";
import type { FocusEventHandler, PointerEventHandler } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { getBillDetailLink } from "@/features/interview-config/shared/utils/interview-links";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useVisualViewportFrame } from "@/hooks/use-visual-viewport-frame";
import { isLoopFamilyMode } from "../../shared/utils/is-loop-family-mode";
import { useInterviewChat } from "../hooks/use-interview-chat";
import { useInterviewTimer } from "../hooks/use-interview-timer";
import { calcInterviewProgress } from "../utils/calc-interview-progress";
import { embedBillLink } from "../utils/embed-bill-link";
import { getActiveInterviewQuestion } from "../utils/get-active-interview-question";
import { InterviewAnswerFocusLayer } from "./interview-answer-focus-layer";
import { InterviewChatInput } from "./interview-chat-input";
import { InterviewErrorDisplay } from "./interview-error-display";
import { InterviewMessage } from "./interview-message";
import { InterviewProgressBar } from "./interview-progress-bar";
import { InterviewSummaryInput } from "./interview-summary-input";
import { QuickReplyButtons } from "./quick-reply-buttons";
import { SkipActionPopover } from "./skip-action-popover";
import { TimeUpPrompt } from "./time-up-prompt";

interface InterviewChatClientProps {
  billId: string;
  billTitle: string;
  sessionId: string;
  initialMessages: Array<{
    id: string;
    role: "assistant" | "user";
    content: string;
    created_at: string;
  }>;
  mode?: InterviewMode;
  totalQuestions?: number;
  estimatedDuration?: number | null;
  sessionStartedAt?: string;
  hasRated?: boolean;
  previewToken?: string;
  layout?: "page" | "panel";
  isPreparingInitialQuestion?: boolean;
}

export function InterviewChatClient({
  billId,
  billTitle,
  sessionId,
  initialMessages,
  mode,
  totalQuestions,
  estimatedDuration,
  sessionStartedAt,
  previewToken,
  layout = "page",
  isPreparingInitialQuestion = false,
}: InterviewChatClientProps) {
  const {
    input,
    setInput,
    stage,
    messages,
    isLoading,
    error,
    object,
    streamingReportData,
    currentQuickReplies,
    streamingQuickReplies,
    canRetry,
    handleSubmit,
    handleQuickReply,
    handleRetry,
    handleResumeInterview,
  } = useInterviewChat({
    billId,
    initialMessages,
    previewToken,
  });

  const { remainingMinutes, isTimeUp } = useInterviewTimer({
    estimatedDuration,
    sessionStartedAt,
  });

  const [timeUpDismissed, setTimeUpDismissed] = useState(false);
  const [isAnswerFocusMode, setIsAnswerFocusMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const answerFocusScrollYRef = useRef(0);
  const answerSelectionRef = useRef<{
    start: number | null;
    end: number | null;
  }>({ start: null, end: null });
  const keepFocusThroughSubmitRef = useRef(false);
  const wasLoadingRef = useRef(isLoading);
  const isMobileViewport = useMediaQuery("(max-width: 767px)");
  const shouldUseMobileAnswerFocus = layout === "page" && isMobileViewport;
  const visualViewportFrame = useVisualViewportFrame(
    shouldUseMobileAnswerFocus && isAnswerFocusMode
  );

  const progress = useMemo(
    () => calcInterviewProgress(totalQuestions, stage, messages),
    [messages, totalQuestions, stage]
  );

  const billDetailLink = getBillDetailLink(billId, previewToken);

  const showProgressBar = isLoopFamilyMode(mode) && progress !== null;
  const timerMinutes =
    remainingMinutes !== null && stage === "chat" && !timeUpDismissed
      ? remainingMinutes
      : null;
  const showTimeUpPrompt =
    isTimeUp && !timeUpDismissed && stage === "chat" && !isLoading;
  const isPanelLayout = layout === "panel";
  const isChatInputBusy = isLoading || isPreparingInitialQuestion;

  // チャット操作時にタイムアップアラートを自動非表示にする
  const dismissTimeUpIfNeeded = useCallback(() => {
    if (isTimeUp && !timeUpDismissed) {
      setTimeUpDismissed(true);
    }
  }, [isTimeUp, timeUpDismissed]);

  const handleChatSubmit = useCallback(
    (params: { text?: string }) => {
      if (params.text) {
        dismissTimeUpIfNeeded();
      }
      handleSubmit(params);
    },
    [dismissTimeUpIfNeeded, handleSubmit]
  );

  const handleChatQuickReply = useCallback(
    (text: string) => {
      dismissTimeUpIfNeeded();
      handleQuickReply(text);
    },
    [dismissTimeUpIfNeeded, handleQuickReply]
  );

  const handleSkipAction = (text: string) => {
    handleSubmit({ text });
  };

  const handleEndInterviewTimeUp = () => {
    setTimeUpDismissed(true);
    handleSubmit({
      text: "目安時間になりました。レポート作成に進みたいです。",
    });
  };

  const handleContinueInterview = () => {
    setTimeUpDismissed(true);
  };

  // ストリーミング中のメッセージがすでに会話履歴に追加されているかどうか
  const isStreamingMessageCommitted =
    object &&
    messages.some((m) => m.role === "assistant" && m.content === object.text);

  // ストリーミング中のメッセージを表示するかどうか
  const showStreamingMessage = object && !isStreamingMessageCommitted;

  const activeQuestion = useMemo(
    () =>
      getActiveInterviewQuestion({
        messages,
        stage,
        isLoading,
        isPreparingInitialQuestion,
        streamingText: object?.text,
        streamingNextStage: object?.next_stage,
        isStreamingMessageCommitted: Boolean(isStreamingMessageCommitted),
      }),
    [
      isLoading,
      isPreparingInitialQuestion,
      isStreamingMessageCommitted,
      messages,
      object?.next_stage,
      object?.text,
      stage,
    ]
  );

  // メッセージ内にレポートが存在するかどうか
  const hasReport = messages.some((m) => m.report != null);

  // 最後のAIメッセージのインデックスを事前計算
  const lastAssistantIndex = messages.findLastIndex(
    (m) => m.role === "assistant"
  );

  const openAnswerFocusMode = useCallback(
    (textarea: HTMLTextAreaElement) => {
      if (
        !shouldUseMobileAnswerFocus ||
        stage !== "chat" ||
        isChatInputBusy ||
        isAnswerFocusMode
      ) {
        return;
      }

      answerFocusScrollYRef.current = window.scrollY;
      answerSelectionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      };

      flushSync(() => {
        setIsAnswerFocusMode(true);
      });

      const focusedTextarea = textareaRef.current;
      focusedTextarea?.focus({ preventScroll: true });
      const { start, end } = answerSelectionRef.current;
      if (focusedTextarea && start !== null && end !== null) {
        focusedTextarea.setSelectionRange(start, end);
      }
    },
    [isAnswerFocusMode, isChatInputBusy, shouldUseMobileAnswerFocus, stage]
  );

  const handleNormalInputPointerDown: PointerEventHandler<HTMLTextAreaElement> =
    useCallback(
      (event) => {
        if (!shouldUseMobileAnswerFocus) {
          return;
        }
        event.preventDefault();
        openAnswerFocusMode(event.currentTarget);
      },
      [openAnswerFocusMode, shouldUseMobileAnswerFocus]
    );

  const handleNormalInputFocus: FocusEventHandler<HTMLTextAreaElement> =
    useCallback(
      (event) => {
        openAnswerFocusMode(event.currentTarget);
      },
      [openAnswerFocusMode]
    );

  const handleFocusedInputBlur: FocusEventHandler<HTMLTextAreaElement> =
    useCallback((event) => {
      answerSelectionRef.current = {
        start: event.currentTarget.selectionStart,
        end: event.currentTarget.selectionEnd,
      };

      if (keepFocusThroughSubmitRef.current) {
        window.requestAnimationFrame(() => {
          textareaRef.current?.focus({ preventScroll: true });
        });
        return;
      }

      setIsAnswerFocusMode(false);
    }, []);

  const handleSubmitPointerDown: PointerEventHandler<HTMLButtonElement> =
    useCallback(() => {
      keepFocusThroughSubmitRef.current = true;
      window.requestAnimationFrame(() => {
        keepFocusThroughSubmitRef.current = false;
      });
    }, []);

  useEffect(() => {
    if (
      isAnswerFocusMode &&
      (!shouldUseMobileAnswerFocus || stage !== "chat")
    ) {
      setIsAnswerFocusMode(false);
    }
  }, [isAnswerFocusMode, shouldUseMobileAnswerFocus, stage]);

  useEffect(() => {
    if (isAnswerFocusMode || !shouldUseMobileAnswerFocus || stage !== "chat") {
      return;
    }

    const textarea = textareaRef.current;
    const { start, end } = answerSelectionRef.current;
    if (textarea && start !== null && end !== null) {
      textarea.setSelectionRange(start, end);
    }
  }, [isAnswerFocusMode, shouldUseMobileAnswerFocus, stage]);

  useEffect(() => {
    const wasLoading = wasLoadingRef.current;
    wasLoadingRef.current = isLoading;

    if (isAnswerFocusMode && stage === "chat" && wasLoading && !isLoading) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [isAnswerFocusMode, isLoading, stage]);

  return (
    <div
      className={
        isPanelLayout
          ? "flex h-full min-h-0 flex-col bg-white"
          : "h-dvh md:h-[calc(100dvh-96px)] bg-mirai-surface-light"
      }
      data-testid="interview-chat-root"
    >
      <div
        className={
          isPanelLayout
            ? "flex min-h-0 flex-1 flex-col bg-white"
            : "flex flex-col h-full pt-23 md:pt-10 bg-white md:rounded-t-[36px] md:px-12"
        }
      >
        {showProgressBar && progress && (
          <div className={isPanelLayout ? "px-6 pb-1" : "px-4 pb-1"}>
            <InterviewProgressBar
              percentage={progress.percentage}
              currentTopic={progress.currentTopic}
              remainingMinutes={timerMinutes}
            />
          </div>
        )}
        <Conversation className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
          <ConversationContent
            className={`flex flex-col gap-4 ${isPanelLayout ? "px-6 py-2" : ""}`}
          >
            {/* 初期表示メッセージ */}
            {messages.length === 0 && !object && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-bold leading-[1.8] text-mirai-text">
                  案件についてのAIインタビューを開始します。
                </p>
                <p className="text-sm text-gray-600">
                  あなたの意見や経験をお聞かせください。
                </p>
                {isPreparingInitialQuestion && (
                  <p className="text-sm font-medium text-gray-500">
                    最初の質問を準備しています...
                  </p>
                )}
              </div>
            )}

            {/* メッセージ一覧を表示 */}
            {messages.map((message, index) => {
              // 最後のAIメッセージかつストリーミング中でない場合にスキップボタンを表示
              const showSkipFooter =
                index === lastAssistantIndex &&
                stage === "chat" &&
                !isLoading &&
                !showStreamingMessage;

              // 最初のAIメッセージの案件名をリンクに変換
              const content =
                index === 0 && message.role === "assistant"
                  ? embedBillLink(message.content, billTitle, billDetailLink)
                  : message.content;

              return (
                <InterviewMessage
                  key={message.id}
                  message={{
                    id: message.id,
                    role: message.role,
                    parts: [{ type: "text" as const, text: content }],
                  }}
                  openLinksInNewTab={index === 0}
                  isStreaming={false}
                  report={message.report}
                  footer={
                    showSkipFooter ? (
                      <SkipActionPopover
                        onSelect={handleSkipAction}
                        disabled={isLoading}
                      />
                    ) : undefined
                  }
                />
              );
            })}

            {/* ストリーミング中のAIレスポンスを表示 */}
            {showStreamingMessage && (
              <InterviewMessage
                key="streaming-assistant"
                message={{
                  id: "streaming-assistant",
                  role: "assistant",
                  parts: [{ type: "text" as const, text: object.text ?? "" }],
                }}
                isStreaming={isLoading}
                report={streamingReportData}
              />
            )}

            {/* ローディング表示 */}
            {isLoading && !object && (
              <span className="text-sm text-gray-500">考え中...</span>
            )}

            {/* エラー表示 */}
            <InterviewErrorDisplay
              error={error}
              canRetry={canRetry}
              onRetry={handleRetry}
              isRetrying={isLoading}
            />

            {/* クイックリプライボタン */}
            {stage === "chat" &&
              (() => {
                const replies = isLoading
                  ? streamingQuickReplies
                  : currentQuickReplies;
                return (
                  replies.length > 0 && (
                    <QuickReplyButtons
                      replies={replies}
                      onSelect={handleChatQuickReply}
                      disabled={isChatInputBusy}
                    />
                  )
                );
              })()}
          </ConversationContent>
        </Conversation>

        {/* 時間超過プロンプト */}
        {showTimeUpPrompt && (
          <TimeUpPrompt
            onEndInterview={handleEndInterviewTimeUp}
            onContinue={handleContinueInterview}
            disabled={isLoading}
          />
        )}

        {/* 入力エリア */}
        <div
          className="shrink-0 bg-white px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
          data-testid="interview-chat-composer"
        >
          {(stage === "summary" || stage === "summary_complete") && (
            <InterviewSummaryInput
              sessionId={sessionId}
              billId={billId}
              hasReport={hasReport}
              previewToken={previewToken}
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              canPrefetchCompletion={stage === "summary_complete"}
              onResume={handleResumeInterview}
              isLoading={isLoading}
              error={error}
            />
          )}

          {stage === "chat" && !isAnswerFocusMode && (
            <InterviewChatInput
              input={input}
              onInputChange={setInput}
              onSubmit={handleChatSubmit}
              placeholder={
                isPreparingInitialQuestion
                  ? "最初の質問を準備中"
                  : "AIの質問に回答する"
              }
              isResponding={isChatInputBusy}
              textareaRef={textareaRef}
              onTextareaPointerDown={handleNormalInputPointerDown}
              onTextareaFocus={handleNormalInputFocus}
            />
          )}
        </div>
      </div>

      {isAnswerFocusMode &&
        shouldUseMobileAnswerFocus &&
        stage === "chat" &&
        activeQuestion && (
          <InterviewAnswerFocusLayer
            currentTopic={progress?.currentTopic ?? null}
            frame={visualViewportFrame}
            isQuestionLoading={activeQuestion.isLoading}
            latestQuestion={activeQuestion.text}
            progressPercentage={
              showProgressBar && progress ? progress.percentage : null
            }
            remainingMinutes={timerMinutes}
            restoreScrollY={answerFocusScrollYRef.current}
          >
            <InterviewChatInput
              input={input}
              onInputChange={setInput}
              onSubmit={handleChatSubmit}
              placeholder={
                isChatInputBusy ? "次の質問を準備中" : "AIの質問に回答する"
              }
              isResponding={isChatInputBusy}
              showHint={false}
              textareaRef={textareaRef}
              onTextareaBlur={handleFocusedInputBlur}
              onSubmitPointerDown={handleSubmitPointerDown}
              preserveFocusWhileResponding
            />
          </InterviewAnswerFocusLayer>
        )}
    </div>
  );
}
