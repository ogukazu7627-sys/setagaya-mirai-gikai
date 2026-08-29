import { describe, expect, it } from "vitest";
import { extractBillFaq } from "./extract-bill-faq";

describe("extractBillFaq", () => {
  it("よくある質問のH2と回答だけを抽出する", () => {
    const markdown = `# 具体的な内容

## 対象外の見出し

これはFAQではありません。

# よくある質問

## 誰が利用できますか？

区内に住む人が利用できます。

## いつ始まりますか？

- 令和8年度から開始予定です。
- 詳細は公式資料で確認できます。

# 議員、会派の意見

## 山田議員

意見本文`;

    expect(extractBillFaq(markdown)).toEqual([
      {
        question: "誰が利用できますか？",
        answer: "区内に住む人が利用できます。",
      },
      {
        question: "いつ始まりますか？",
        answer: "令和8年度から開始予定です。 詳細は公式資料で確認できます。",
      },
    ]);
  });

  it("空の質問や回答は構造化データへ含めない", () => {
    const markdown = `# よくある質問

## 回答がない質問

## 回答がある質問

回答です。

##

見出しが空です。`;

    expect(extractBillFaq(markdown)).toEqual([
      { question: "回答がある質問", answer: "回答です。" },
    ]);
  });

  it("全角半角や空白のあるFAQ見出しを正規化する", () => {
    expect(
      extractBillFaq(`# よく ある 質問

## 質問

回答`)
    ).toEqual([{ question: "質問", answer: "回答" }]);
  });
});
