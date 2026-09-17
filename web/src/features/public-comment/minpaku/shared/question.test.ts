import { describe, expect, it } from "vitest";
import { MINPAKU_QUESTIONS } from "./campaign";
import { composeMinpakuInterviewMessage } from "./question";

describe("民泊インタビューの固定質問", () => {
  it("AIの受け止め、固定説明、固定質問を順に結合する", () => {
    expect(
      composeMinpakuInterviewMessage("前置きです。", {
        context: "制度の説明です。",
        question: "あなたの考えを教えてください。",
      })
    ).toBe(
      "前置きです。\n\n制度の説明です。\n\nあなたの考えを教えてください。"
    );
  });

  it("受け止めや説明がなくても固定質問を返す", () => {
    expect(
      composeMinpakuInterviewMessage("  ", {
        context: "",
        question: "固定質問です。",
      })
    ).toBe("固定質問です。");
  });

  it("7段階の質問文を固定する", () => {
    expect(MINPAKU_QUESTIONS.map((item) => item.question)).toEqual([
      "あなたが今回、区に意見を伝えたいと思ったのは、どのような立場や経験からですか。",
      "このうち、あなたが特に意見を伝えたいのは、どの部分ですか。",
      "先ほど挙げていただいた点について、どのような場面で、誰の暮らしや仕事に、どのような影響があると感じていますか。",
      "この目的や改正内容について、納得できる点と、説明や対策がまだ不十分だと感じる点はありますか。",
      "今回、区が「適正に運営している」と判断して営業期間の制限解除を認めるとしたら、何を、どのような方法で確認すべきだと思いますか。",
      "ルールが実際に守られるようにするため、区や事業者の対応を、どの段階で、どのように変えてほしいですか。",
      "ここまでのお話の中で、今回の改正について、区に最も伝えたい要望は何ですか。",
    ]);
  });
});
