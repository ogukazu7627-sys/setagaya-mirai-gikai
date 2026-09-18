"use client";

import type { UIMessage } from "@ai-sdk/react";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { useActiveInterviewLayout } from "@/components/layouts/interview-layout-context";
import { Button } from "@/components/ui/button";
import { InterviewChatInput } from "@/features/interview-session/client/components/interview-chat-input";
import { InterviewErrorDisplay } from "@/features/interview-session/client/components/interview-error-display";
import { InterviewMessage } from "@/features/interview-session/client/components/interview-message";
import { InterviewProgressBar } from "@/features/interview-session/client/components/interview-progress-bar";
import { DelayedQuickReplies } from "@/features/public-comment/minpaku/client/delayed-quick-replies";
import type {
  CheckpointChoice,
  InterviewAction,
  InterviewMode,
  InterviewProgress,
} from "../interview-state";

type PublicCommentMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  question_id?: string | null;
};

export interface PublicCommentInterviewChatProps {
  progress: InterviewProgress;
  mode: InterviewMode;
  onAction: (action: Exclude<InterviewAction, "answer">) => void;
  onCheckpointChoice: (choice: CheckpointChoice) => void;
  messages: PublicCommentMessage[];
  quickReplies: string[];
  isLoading: boolean;
  error: string | null;
  answer: string;
  isComplete: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  onQuickReply: (reply: string) => void;
  onContinueToDraft: () => void;
  questions: readonly { id: string; topic: string }[];
  screenReaderTitle: string;
  privacyNotice: string;
}

function toUiMessage(message: PublicCommentMessage): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

export function PublicCommentInterviewChat({
  messages,
  quickReplies,
  isLoading,
  error,
  answer,
  isComplete,
  onAnswerChange,
  onSubmit,
  onQuickReply,
  onContinueToDraft,
  progress,
  mode,
  onAction,
  onCheckpointChoice,
  screenReaderTitle,
  privacyNotice,
}: PublicCommentInterviewChatProps) {
  useActiveInterviewLayout();
  const errorObject = error ? new Error(error) : null;
  const questionId = messages.findLast(
    (message) => message.role === "assistant"
  )?.id;
  const [typedQuestionId, setTypedQuestionId] = useState<string | null>(null);

  return (
    <div
      className="h-[calc(100dvh-var(--app-header-layout-offset))] bg-mirai-surface-light"
      data-testid="public-comment-interview-chat"
    >
      <h1 className="sr-only">{screenReaderTitle}</h1>
      <div className="flex h-full flex-col bg-white pt-4 min-[768px]:rounded-t-[36px] min-[768px]:px-12 min-[768px]:pt-10">
        <div className="px-4 pb-1">
          {mode === "targeted" && !isComplete ? (
            <p className="text-sm font-bold text-mirai-text">
              {progress.currentTopic}
            </p>
          ) : (
            <InterviewProgressBar {...progress} />
          )}
        </div>
        <p className="px-4 pb-2 text-center text-[11px] leading-5 text-mirai-text-secondary">
          {privacyNotice}
        </p>
        <Conversation className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
          <ConversationContent className="flex flex-col gap-4">
            {messages.map((message) => (
              <InterviewMessage
                key={message.id}
                message={toUiMessage(message)}
                isStreaming={false}
              />
            ))}
            {isLoading && (
              <p className="text-sm text-gray-500" aria-live="polite">
                考え中...
              </p>
            )}
            <InterviewErrorDisplay
              error={errorObject}
              canRetry={false}
              onRetry={() => undefined}
              isRetrying={isLoading}
            />
            <DelayedQuickReplies
              key={questionId}
              replies={quickReplies}
              onSelect={onQuickReply}
              disabled={
                isLoading ||
                Boolean(error) ||
                !questionId ||
                messages.at(-1)?.role !== "assistant" ||
                answer.length > 0 ||
                typedQuestionId === questionId
              }
            />
          </ConversationContent>
        </Conversation>
        <div className="shrink-0 bg-white px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          {isComplete ? (
            <Button
              type="button"
              onClick={onContinueToDraft}
              className="h-12 w-full rounded-full text-[15px] font-bold"
            >
              内容を確認して下書き作成へ進む
              <ArrowRight className="size-4" />
            </Button>
          ) : progress.checkpoint === "after_core" ? (
            <div className="space-y-3 rounded-2xl border border-primary/20 bg-mirai-surface-light p-4">
              <p className="text-sm font-bold leading-6 text-mirai-text">
                ここまでの3問で、簡易版の意見を作成できます。
                <br />
                続ける場合は、残りのテーマについて回答に応じた深掘りを行い、
                <br />
                詳細版の意見を作成できます。
              </p>
              <div className="flex flex-col gap-2 min-[480px]:flex-row">
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onCheckpointChoice("simple")}
                  className="min-h-11 flex-1 whitespace-normal text-sm"
                >
                  簡易版を作成して終了
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => onCheckpointChoice("detailed")}
                  className="min-h-11 flex-1 whitespace-normal text-sm"
                >
                  詳しく続ける
                </Button>
              </div>
            </div>
          ) : progress.paused ? (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => onAction("resume")}
            >
              意見整理を再開する
            </Button>
          ) : (
            <>
              <InterviewChatInput
                input={answer}
                onInputChange={(value) => {
                  if (questionId && value.length > 0)
                    setTypedQuestionId(questionId);
                  onAnswerChange(value);
                }}
                onSubmit={onSubmit}
                placeholder="答えたくない内容は書かなくて大丈夫です"
                isResponding={isLoading}
              />
              <div className="mt-2 flex flex-wrap justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => onAction("skip")}
                >
                  このテーマを飛ばす
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => {
                    if (window.confirm("ここまでの回答で意見をまとめますか？"))
                      onAction("finish");
                  }}
                >
                  ここまでで終了する
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
