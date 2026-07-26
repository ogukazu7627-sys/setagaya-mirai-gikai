import type { InterviewStage } from "../schemas";

export interface InterviewProgress {
  percentage: number;
  currentTopic: string | null;
  remainingQuestionRange: RemainingQuestionRange | null;
  showSkip: boolean;
}

export interface RemainingQuestionRange {
  min: number;
  max: number;
}

interface ProgressMessage {
  role: "assistant" | "user";
  questionId?: string | null;
  topicTitle?: string | null;
}

const MIN_FOLLOW_UP_QUESTIONS = 2;
const MAX_FOLLOW_UP_QUESTIONS = 3;

function hasUserResponse(
  messages: ProgressMessage[],
  assistantIndex: number
): boolean {
  for (let index = assistantIndex + 1; index < messages.length; index += 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      return false;
    }
    if (message?.role === "user") {
      return true;
    }
  }
  return false;
}

function calcRemainingQuestionRange(
  totalQuestions: number,
  messages: ProgressMessage[]
): RemainingQuestionRange {
  const seenQuestionIds = new Set<string>();
  let currentThemeStartIndex = -1;

  messages.forEach((message, index) => {
    if (
      message.role !== "assistant" ||
      !message.questionId ||
      seenQuestionIds.has(message.questionId)
    ) {
      return;
    }

    seenQuestionIds.add(message.questionId);
    currentThemeStartIndex = index;
  });

  const startedThemeCount = Math.min(totalQuestions, seenQuestionIds.size);
  const unstartedThemeCount = Math.max(0, totalQuestions - startedThemeCount);
  const unstartedMin = unstartedThemeCount * (1 + MIN_FOLLOW_UP_QUESTIONS);
  const unstartedMax = unstartedThemeCount * (1 + MAX_FOLLOW_UP_QUESTIONS);

  if (currentThemeStartIndex < 0) {
    return { min: unstartedMin, max: unstartedMax };
  }

  const currentThemeAssistantIndexes = messages
    .map((message, index) => ({ message, index }))
    .filter(
      ({ message, index }) =>
        index >= currentThemeStartIndex && message.role === "assistant"
    )
    .map(({ index }) => index);
  const baseQuestionIndex = currentThemeAssistantIndexes[0];

  if (baseQuestionIndex === undefined) {
    return { min: unstartedMin, max: unstartedMax };
  }

  const baseQuestionOutstanding = hasUserResponse(messages, baseQuestionIndex)
    ? 0
    : 1;
  const followUpIndexes = currentThemeAssistantIndexes.slice(1);
  const outstandingFollowUps = followUpIndexes.filter(
    (index) => !hasUserResponse(messages, index)
  ).length;
  const additionalFollowUpsMin = Math.max(
    0,
    MIN_FOLLOW_UP_QUESTIONS - followUpIndexes.length
  );
  const additionalFollowUpsMax = Math.max(
    0,
    MAX_FOLLOW_UP_QUESTIONS - followUpIndexes.length
  );

  return {
    min:
      unstartedMin +
      baseQuestionOutstanding +
      outstandingFollowUps +
      additionalFollowUpsMin,
    max:
      unstartedMax +
      baseQuestionOutstanding +
      outstandingFollowUps +
      additionalFollowUpsMax,
  };
}

/**
 * インタビューのプログレスバー進捗を計算する純粋関数
 *
 * - summary_complete: 100%
 * - summary: 90% 固定
 * - chat: 完了質問数 / 全質問数 x 80%（残り20%はsummary+summary_complete）
 *
 * currentTopic は全ステージ共通で最後のトピック名を返す。
 */
export function calcInterviewProgress(
  totalQuestions: number | undefined,
  stage: InterviewStage,
  messages: ProgressMessage[]
): InterviewProgress | null {
  if (!totalQuestions || totalQuestions === 0) return null;

  // 全ステージ共通: 最後のトピック名を取得
  const lastTopicMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.topicTitle);
  const currentTopic = lastTopicMessage?.topicTitle ?? null;

  if (stage === "summary_complete") {
    return {
      percentage: 100,
      currentTopic,
      remainingQuestionRange: null,
      showSkip: false,
    };
  }

  if (stage === "summary") {
    return {
      percentage: 90,
      currentTopic,
      remainingQuestionRange: null,
      showSkip: false,
    };
  }

  // chat: 質問ベースの進捗
  const askedIds = new Set(
    messages
      .filter((m) => m.role === "assistant" && m.questionId)
      .map((m) => m.questionId as string)
  );
  // 現在聞いている質問は「完了」ではないので除外
  const completedCount = Math.max(0, askedIds.size - 1);
  // chatステージでは最大80%まで
  const percentage = Math.round((completedCount / totalQuestions) * 80);

  return {
    percentage,
    currentTopic,
    remainingQuestionRange: calcRemainingQuestionRange(
      totalQuestions,
      messages
    ),
    showSkip: true,
  };
}
