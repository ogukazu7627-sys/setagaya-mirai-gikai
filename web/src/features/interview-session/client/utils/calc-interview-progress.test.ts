import { describe, expect, it } from "vitest";
import { calcInterviewProgress } from "./calc-interview-progress";

function buildQuestionMessages(questionCount: number) {
  const messages: Array<{
    role: "assistant" | "user";
    questionId?: string;
  }> = [];

  for (let index = 0; index < questionCount; index += 1) {
    messages.push({
      role: "assistant",
      questionId: `q${index + 1}`,
    });
    if (index < questionCount - 1) {
      messages.push({ role: "user" });
    }
  }

  return messages;
}

describe("calcInterviewProgress", () => {
  describe("totalQuestionsが未定義または0の場合", () => {
    it("undefinedならnullを返す", () => {
      expect(calcInterviewProgress(undefined, "chat", [])).toBeNull();
    });

    it("0ならnullを返す", () => {
      expect(calcInterviewProgress(0, "chat", [])).toBeNull();
    });
  });

  describe("summary_completeステージ", () => {
    it("100%を返す", () => {
      const result = calcInterviewProgress(5, "summary_complete", []);
      expect(result).toEqual({
        percentage: 100,
        currentTopic: null,
        remainingQuestionRange: null,
        showSkip: false,
      });
    });

    it("メッセージにトピックがあればcurrentTopicを返す", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1", topicTitle: "経済" },
        { role: "user" as const },
      ];
      const result = calcInterviewProgress(5, "summary_complete", messages);
      expect(result).toEqual({
        percentage: 100,
        currentTopic: "経済",
        remainingQuestionRange: null,
        showSkip: false,
      });
    });
  });

  describe("summaryステージ", () => {
    it("90%固定を返す", () => {
      const result = calcInterviewProgress(5, "summary", []);
      expect(result).toEqual({
        percentage: 90,
        currentTopic: null,
        remainingQuestionRange: null,
        showSkip: false,
      });
    });

    it("メッセージにトピックがあればcurrentTopicを返す", () => {
      const messages = [
        {
          role: "assistant" as const,
          questionId: "q1",
          topicTitle: "社会保障",
        },
      ];
      const result = calcInterviewProgress(5, "summary", messages);
      expect(result).toEqual({
        percentage: 90,
        currentTopic: "社会保障",
        remainingQuestionRange: null,
        showSkip: false,
      });
    });
  });

  describe("chatステージ", () => {
    it("質問が未開始なら0%", () => {
      const result = calcInterviewProgress(5, "chat", []);
      expect(result).toEqual({
        percentage: 0,
        currentTopic: null,
        remainingQuestionRange: { min: 7, max: 10 },
        showSkip: true,
      });
    });

    it("1つ目の質問を聞いている最中は0%（現在の質問は完了扱いしない）", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1", topicTitle: "経済" },
      ];
      const result = calcInterviewProgress(5, "chat", messages);
      expect(result).toEqual({
        percentage: 0,
        currentTopic: "経済",
        remainingQuestionRange: { min: 7, max: 10 },
        showSkip: true,
      });
    });

    it("2問目に進んだら1問完了で16%（1/5 × 80）", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1", topicTitle: "経済" },
        { role: "user" as const },
        {
          role: "assistant" as const,
          questionId: "q2",
          topicTitle: "社会保障",
        },
      ];
      const result = calcInterviewProgress(5, "chat", messages);
      expect(result).toEqual({
        percentage: 16,
        currentTopic: "社会保障",
        remainingQuestionRange: { min: 6, max: 9 },
        showSkip: true,
      });
    });

    it("5問中4問完了で64%（4/5 × 80）", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1", topicTitle: "テーマ1" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q2", topicTitle: "テーマ2" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q3", topicTitle: "テーマ3" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q4", topicTitle: "テーマ4" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q5", topicTitle: "テーマ5" },
      ];
      const result = calcInterviewProgress(5, "chat", messages);
      expect(result).toEqual({
        percentage: 64,
        currentTopic: "テーマ5",
        remainingQuestionRange: { min: 3, max: 6 },
        showSkip: true,
      });
    });

    it("同じquestionIdの重複メッセージは進捗率ではカウントしない", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1", topicTitle: "経済" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q2", topicTitle: "教育" },
      ];
      // askedIds = {q1, q2}, size=2, completedCount=1
      const result = calcInterviewProgress(4, "chat", messages);
      expect(result).toEqual({
        percentage: 20, // 1/4 × 80 = 20
        currentTopic: "教育",
        remainingQuestionRange: { min: 5, max: 8 },
        showSkip: true,
      });
    });

    it("topicTitleがないメッセージばかりならcurrentTopicはnull", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q2" },
      ];
      const result = calcInterviewProgress(3, "chat", messages);
      expect(result?.currentTopic).toBeNull();
    });

    it("全問完了で80%", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q2" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q3" },
        { role: "user" as const },
      ];
      // askedIds = {q1, q2, q3}, size=3, completedCount=2
      // → 2/2 × 80 = 80 (totalQuestions=2 だと全完了)
      const result = calcInterviewProgress(2, "chat", messages);
      expect(result?.percentage).toBe(80);
    });

    it.each([
      {
        questionCount: 1,
        expected: { min: 7, max: 10 },
      },
      {
        questionCount: 2,
        expected: { min: 6, max: 9 },
      },
      {
        questionCount: 3,
        expected: { min: 5, max: 8 },
      },
      {
        questionCount: 4,
        expected: { min: 4, max: 7 },
      },
      {
        questionCount: 5,
        expected: { min: 3, max: 6 },
      },
      {
        questionCount: 6,
        expected: { min: 2, max: 5 },
      },
      {
        questionCount: 7,
        expected: { min: 1, max: 4 },
      },
      {
        questionCount: 8,
        expected: { min: 1, max: 3 },
      },
      {
        questionCount: 12,
        expected: { min: 1, max: 3 },
      },
    ])("$questionCount個目の質問では$expected.min〜$expected.max問と表示する", ({
      questionCount,
      expected,
    }) => {
      const messages = buildQuestionMessages(questionCount);

      expect(
        calcInterviewProgress(4, "chat", messages)?.remainingQuestionRange
      ).toEqual(expected);
    });

    it("ユーザー回答だけでは残り問数を減らさない", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        { role: "user" as const },
      ];

      expect(
        calcInterviewProgress(4, "chat", messages)?.remainingQuestionRange
      ).toEqual({ min: 7, max: 10 });
    });

    it("questionIdの有無にかかわらず表示済みのAI質問を数える", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        { role: "assistant" as const },
      ];

      expect(
        calcInterviewProgress(4, "chat", messages)?.remainingQuestionRange
      ).toEqual({ min: 6, max: 9 });
    });

    it.each([
      {
        questionCount: 0,
        expected: { min: 7, max: 10 },
      },
      {
        questionCount: 7,
        expected: { min: 1, max: 4 },
      },
      {
        questionCount: 8,
        expected: { min: 1, max: 3 },
      },
    ])("$questionCount問表示済みでもレポート文は質問数として数えない", ({
      questionCount,
      expected,
    }) => {
      const messages = [
        ...buildQuestionMessages(questionCount),
        {
          role: "assistant" as const,
          report: { summary: "途中レポート" },
        },
      ];

      expect(
        calcInterviewProgress(4, "chat", messages)?.remainingQuestionRange
      ).toEqual(expected);
    });
  });
});
