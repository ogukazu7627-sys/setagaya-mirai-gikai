import type { InterviewStage } from "../../shared/schemas";
import type { ConversationMessage } from "./message-utils";

interface GetActiveInterviewQuestionParams {
  messages: ConversationMessage[];
  stage: InterviewStage;
  isLoading: boolean;
  isPreparingInitialQuestion: boolean;
  streamingText?: string | null;
  streamingNextStage?: InterviewStage | null;
  isStreamingMessageCommitted: boolean;
}

export interface ActiveInterviewQuestion {
  text: string;
  isLoading: boolean;
}

const NEXT_QUESTION_LOADING_TEXT = "次の質問を考えています…";
const INITIAL_QUESTION_LOADING_TEXT = "最初の質問を考えています…";
const REPORT_LOADING_TEXT = "レポートを作成しています…";

export function getActiveInterviewQuestion({
  messages,
  stage,
  isLoading,
  isPreparingInitialQuestion,
  streamingText,
  streamingNextStage,
  isStreamingMessageCommitted,
}: GetActiveInterviewQuestionParams): ActiveInterviewQuestion | null {
  if (stage !== "chat") {
    return null;
  }

  if (
    streamingNextStage === "summary" ||
    streamingNextStage === "summary_complete"
  ) {
    return {
      text: REPORT_LOADING_TEXT,
      isLoading: true,
    };
  }

  const trimmedStreamingText = streamingText?.trim();
  if (isLoading && trimmedStreamingText && !isStreamingMessageCommitted) {
    return {
      text: trimmedStreamingText,
      isLoading: true,
    };
  }

  if (isLoading || isPreparingInitialQuestion) {
    return {
      text:
        messages.length === 0
          ? INITIAL_QUESTION_LOADING_TEXT
          : NEXT_QUESTION_LOADING_TEXT,
      isLoading: true,
    };
  }

  const lastUserIndex = messages.findLastIndex(
    (message) => message.role === "user"
  );
  const unansweredAssistantMessage = messages
    .slice(lastUserIndex + 1)
    .findLast(
      (message) =>
        message.role === "assistant" &&
        message.report == null &&
        message.content.trim().length > 0
    );

  if (unansweredAssistantMessage) {
    return {
      text: unansweredAssistantMessage.content,
      isLoading: false,
    };
  }

  return {
    text: NEXT_QUESTION_LOADING_TEXT,
    isLoading: true,
  };
}
