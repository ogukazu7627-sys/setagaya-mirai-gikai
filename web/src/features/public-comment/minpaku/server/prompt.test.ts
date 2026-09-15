import { describe, expect, it } from "vitest";
import { buildDraftPrompt, buildInterviewPrompt } from "./prompt";

describe("民泊パブリックコメント用プロンプト", () => {
  const messages = [
    { role: "assistant" as const, content: "このテーマに関わりはありますか？" },
    { role: "user" as const, content: "近隣で暮らしています。" },
  ];

  it("公式資料のみを参照し、検索を使わない方針を含める", () => {
    const prompt = buildInterviewPrompt({
      messages,
      nextQuestionId: "priority",
    });

    expect(prompt).toContain(
      "参照できるのは、このプロンプトにある世田谷区の公式資料の説明だけです"
    );
    expect(prompt).toContain("web検索、外部知識、ツール呼び出しは使いません");
    expect(prompt).toContain("民泊、旅館業、対象条例");
    expect(prompt).toContain("騒音、ごみ出し");
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
});
