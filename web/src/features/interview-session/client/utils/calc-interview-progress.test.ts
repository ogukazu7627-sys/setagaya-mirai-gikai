import { describe, expect, it } from "vitest";
import { calcInterviewProgress } from "./calc-interview-progress";
import { parseMessageContent } from "./message-utils";

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
        remainingQuestionRange: { min: 15, max: 20 },
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
        remainingQuestionRange: { min: 15, max: 20 },
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
        remainingQuestionRange: { min: 12, max: 16 },
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
        remainingQuestionRange: { min: 3, max: 4 },
        showSkip: true,
      });
    });

    it("同じquestionIdの重複メッセージはカウントしない", () => {
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
        remainingQuestionRange: { min: 9, max: 12 },
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

    it("4テーマの開始時はあと約12〜16問", () => {
      const result = calcInterviewProgress(4, "chat", []);

      expect(result?.remainingQuestionRange).toEqual({ min: 12, max: 16 });
    });

    it("現在表示中の基本質問を残り問数に含める", () => {
      const messages = [
        {
          role: "assistant" as const,
          questionId: "q1",
          topicTitle: "お願いしたいこと",
        },
      ];

      const result = calcInterviewProgress(4, "chat", messages);

      expect(result?.remainingQuestionRange).toEqual({ min: 12, max: 16 });
    });

    it("基本質問へ回答すると残り範囲が1問減る", () => {
      const messages = [
        {
          role: "assistant" as const,
          questionId: "q1",
          topicTitle: "お願いしたいこと",
        },
        { role: "user" as const },
      ];

      const result = calcInterviewProgress(4, "chat", messages);

      expect(result?.remainingQuestionRange).toEqual({ min: 11, max: 15 });
    });

    it("questionIdのない深掘り質問も回答ごとに残り範囲から減らす", () => {
      const messages = [
        {
          role: "assistant" as const,
          questionId: "q1",
          topicTitle: "お願いしたいこと",
        },
        { role: "user" as const },
        { role: "assistant" as const },
        { role: "user" as const },
        { role: "assistant" as const },
      ];

      const result = calcInterviewProgress(4, "chat", messages);

      expect(result?.remainingQuestionRange).toEqual({ min: 10, max: 14 });
    });

    it("次の基本テーマへ進んだら前テーマの残り深掘りを持ち越さない", () => {
      const messages = [
        {
          role: "assistant" as const,
          questionId: "q1",
          topicTitle: "お願いしたいこと",
        },
        { role: "user" as const },
        {
          role: "assistant" as const,
          questionId: "q2",
          topicTitle: "お願いしたい理由",
        },
      ];

      const result = calcInterviewProgress(4, "chat", messages);

      expect(result?.remainingQuestionRange).toEqual({ min: 9, max: 12 });
    });

    it.each([
      {
        label: "深掘り2問へすべて回答した場合",
        followUps: 2,
        answerLast: true,
        expected: { min: 0, max: 1 },
      },
      {
        label: "深掘り3問目が未回答の場合",
        followUps: 3,
        answerLast: false,
        expected: { min: 1, max: 1 },
      },
      {
        label: "深掘り3問へすべて回答した場合",
        followUps: 3,
        answerLast: true,
        expected: { min: 0, max: 0 },
      },
      {
        label: "想定を超える深掘り4問目が未回答の場合",
        followUps: 4,
        answerLast: false,
        expected: { min: 1, max: 1 },
      },
    ])("$labelも残り範囲へ反映する", ({ followUps, answerLast, expected }) => {
      const messages: Array<{
        role: "assistant" | "user";
        questionId?: string;
      }> = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
      ];

      for (let index = 0; index < followUps; index += 1) {
        messages.push({ role: "assistant" as const });
        if (index < followUps - 1 || answerLast) {
          messages.push({ role: "user" as const });
        }
      }

      expect(
        calcInterviewProgress(1, "chat", messages)?.remainingQuestionRange
      ).toEqual(expected);
    });

    it("レポート文は深掘り質問として数えない", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        {
          role: "assistant" as const,
          report: { summary: "途中レポート" },
        },
      ];

      expect(
        calcInterviewProgress(1, "chat", messages)?.remainingQuestionRange
      ).toEqual({ min: 2, max: 3 });
    });

    it("DB保存形式から再読み込みしても同じ残り範囲を復元する", () => {
      const storedMessages = [
        {
          role: "assistant" as const,
          content: JSON.stringify({
            text: "基本質問",
            question_id: "q1",
            topic_title: "お願いしたいこと",
          }),
        },
        { role: "user" as const, content: "基本質問への回答" },
        {
          role: "assistant" as const,
          content: JSON.stringify({
            text: "深掘り質問",
            question_id: null,
            topic_title: null,
          }),
        },
      ];
      const restoredMessages = storedMessages.map((message) => {
        if (message.role === "user") {
          return { role: message.role };
        }
        const parsed = parseMessageContent(message.content);
        return {
          role: message.role,
          questionId: parsed.questionId,
          topicTitle: parsed.topicTitle,
          report: parsed.report,
        };
      });

      expect(
        calcInterviewProgress(1, "chat", restoredMessages)
          ?.remainingQuestionRange
      ).toEqual({ min: 2, max: 3 });
    });
  });
});
