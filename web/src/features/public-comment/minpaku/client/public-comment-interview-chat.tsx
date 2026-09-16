"use client";

import type { UIMessage } from "@ai-sdk/react";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { InterviewChatInput } from "@/features/interview-session/client/components/interview-chat-input";
import { InterviewErrorDisplay } from "@/features/interview-session/client/components/interview-error-display";
import { InterviewMessage } from "@/features/interview-session/client/components/interview-message";
import { InterviewProgressBar } from "@/features/interview-session/client/components/interview-progress-bar";
import { MINPAKU_QUESTIONS } from "../shared/campaign";
import { DelayedQuickReplies } from "./delayed-quick-replies";
import { PublicCommentChatScroll } from "./public-comment-chat-scroll";
import { usePublicCommentChatViewport } from "./use-public-comment-chat-viewport";

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
  onAnswerChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  onQuickReply: (reply: string) => void;
}

function toUiMessage(message: PublicCommentMessage): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

function getProgress(messages: PublicCommentMessage[]) {
  const answerCount = messages.filter(
    (message) => message.role === "user"
  ).length;
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const fallbackQuestion =
    MINPAKU_QUESTIONS[Math.min(answerCount, MINPAKU_QUESTIONS.length - 1)];
  const currentQuestion =
    MINPAKU_QUESTIONS.find(
      (question) => question.id === lastAssistantMessage?.question_id
    ) ?? fallbackQuestion;
  const remaining = Math.max(MINPAKU_QUESTIONS.length - answerCount, 0);

  return {
    percentage: Math.min((answerCount / MINPAKU_QUESTIONS.length) * 100, 100),
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
  onAnswerChange,
  onSubmit,
  onQuickReply,
}: PublicCommentInterviewChatProps) {
  const progress = getProgress(messages);
  const errorObject = error ? new Error(error) : null;
  const questionId = messages.findLast(
    (message) => message.role === "assistant"
  )?.id;
  const [typedQuestionId, setTypedQuestionId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const { isMobile, isCompact, style } =
    usePublicCommentChatViewport(inputFocused);

  return (
    <div
      className="h-[calc(100dvh-var(--app-header-layout-offset)-var(--mobile-primary-navigation-layout-offset))] overflow-hidden bg-white [container-type:size] pc:h-[calc(100dvh-var(--app-header-layout-offset))]"
      style={style}
      data-testid="public-comment-interview-chat"
    >
      <h1 className="sr-only">民泊パブリックコメントのAIインタビュー</h1>
      <div className="flex h-full flex-col bg-white pt-2 pc:rounded-t-[36px] pc:px-12 pc:pt-10">
        <div className={isCompact ? "sr-only" : "shrink-0 px-4 pb-1"}>
          <InterviewProgressBar {...progress} />
        </div>

        <Conversation
          className="min-h-0 flex-1 overflow-hidden [&>div:first-child]:overscroll-contain [&>div:first-child]:touch-pan-y"
          initial="instant"
          resize="instant"
        >
          <ConversationContent className="flex min-h-full flex-col">
            <div className="mt-auto flex flex-col gap-4">
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
            </div>
          </ConversationContent>
          <PublicCommentChatScroll focused={inputFocused} />
        </Conversation>

        <div
          className="shrink-0 border-t border-mirai-border bg-white [&_textarea]:max-h-[min(8rem,25cqh)]"
          data-testid="public-comment-composer"
        >
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
          <div
            className={
              isMobile && inputFocused
                ? "px-4 pb-2 pt-2"
                : "px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
            }
          >
            <InterviewChatInput
              input={answer}
              onInputChange={(value) => {
                if (questionId && value.length > 0)
                  setTypedQuestionId(questionId);
                onAnswerChange(value);
              }}
              onSubmit={onSubmit}
              placeholder="AIの質問に回答する"
              isResponding={isLoading}
              onTextareaFocus={() => setInputFocused(true)}
              onTextareaBlur={() => setInputFocused(false)}
              preserveFocusWhileResponding
              showHint={!isMobile || (!inputFocused && !isCompact)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
