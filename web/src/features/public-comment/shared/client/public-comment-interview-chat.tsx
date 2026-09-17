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

type PublicCommentMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  question_id?: string | null;
};

interface PublicCommentInterviewChatProps {
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

function getProgress(
  messages: PublicCommentMessage[],
  questions: readonly { id: string; topic: string }[]
) {
  const answerCount = messages.filter(
    (message) => message.role === "user"
  ).length;
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const fallbackQuestion =
    questions[Math.min(answerCount, questions.length - 1)];
  const currentQuestion =
    questions.find(
      (question) => question.id === lastAssistantMessage?.question_id
    ) ?? fallbackQuestion;
  const remaining = Math.max(questions.length - answerCount, 0);

  return {
    percentage: Math.min((answerCount / questions.length) * 100, 100),
    currentTopic: currentQuestion?.topic ?? null,
    remainingQuestionRange: { min: remaining, max: remaining },
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
  questions,
  screenReaderTitle,
  privacyNotice,
}: PublicCommentInterviewChatProps) {
  useActiveInterviewLayout();
  const progress = getProgress(messages, questions);
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
          <InterviewProgressBar {...progress} />
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
