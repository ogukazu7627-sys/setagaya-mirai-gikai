import { describe, expect, it } from "vitest";
import { MINPAKU_QUESTIONS, MINPAKU_SOURCES } from "../shared/campaign";
import { MINPAKU_LESSONS } from "../shared/learning";
import { buildDraftPrompt, buildInterviewPrompt } from "./prompt";

describe("民泊パブリックコメント用プロンプト", () => {
  const messages = [
    { role: "assistant" as const, content: "このテーマに関わりはありますか？" },
    { role: "user" as const, content: "近隣で暮らしています。" },
  ];

  it("登録済みの行政資料・議員の主張だけを参照し、検索を使わない", () => {
    const prompt = buildInterviewPrompt({
      messages,
      nextQuestionId: "priority",
    });

    expect(prompt).toContain(
      "参照できるのは、このプロンプトにある行政の公式資料の説明と、出典を明示した議員個人の主張だけです"
    );
    expect(prompt).toContain("web検索、外部知識、ツール呼び出しは使いません");
    expect(prompt).toContain("民泊、旅館業、対象条例");
    expect(prompt).toContain("騒音やごみ");
  });

  it("直前の回答だけをAIが受け止め、質問文は固定文を使う", () => {
    const prompt = buildInterviewPrompt({
      messages,
      nextQuestionId: "priority",
    });
    const question = MINPAKU_QUESTIONS.find((item) => item.id === "priority");
    if (!question) throw new Error("固定質問が見つかりません");

    expect(prompt).toContain(`固定説明: ${question.context}`);
    expect(prompt).toContain(`固定質問: ${question.question}`);
    expect(prompt).toContain("textには直前のユーザー回答への短い受け止めだけ");
    expect(prompt).toContain("サーバーが固定説明と固定質問を後ろに付けます");
  });

  it("下書きでは経験・意見・提案を分け、個人情報を除外する", () => {
    const prompt = buildDraftPrompt({
      messages,
      targetOrdinances: ["世田谷区旅館業法施行条例（改正素案）"],
    });

    expect(prompt).toContain(
      "事実、ユーザーの経験、意見、提案が読み分けられる文章"
    );
    expect(prompt).toContain(
      "住所、氏名、施設名などの個人・施設特定情報は本文に含めません"
    );
    expect(prompt).toContain("世田谷区旅館業法施行条例（改正素案）");
  });

  it("教材と同じ説明を使うが、クイズや受講からユーザーの意見を作らない", () => {
    const prompts = [
      buildInterviewPrompt({ messages, nextQuestionId: "priority" }),
      buildDraftPrompt({ messages, targetOrdinances: [] }),
    ];
    for (const prompt of prompts) {
      for (const lesson of MINPAKU_LESSONS) {
        for (const section of lesson.sections)
          expect(prompt).toContain(section.body);
        expect(prompt).not.toContain(lesson.quiz.question);
      }
      expect(prompt).not.toContain("正解：");
      expect(prompt).not.toContain(
        "新宿区が示した改正案は、すでに施行されている"
      );
      expect(prompt).toContain("区の説明や改正素案への賛同と解釈しない");
      expect(prompt).toContain("他区の制度を世田谷区のルールとして説明せず");
      expect(prompt).toContain("区の公式見解や区民全体の意見として扱わない");
      for (const source of MINPAKU_SOURCES) {
        const label =
          source.kind === "opinion" ? "議員個人の主張" : "行政の公式資料";
        expect(prompt).toContain(
          `- ${source.id} [${label}]: ${source.title} (${source.url})`
        );
      }
    }
  });
});
