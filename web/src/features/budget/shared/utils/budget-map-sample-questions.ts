import type { BudgetMapQuestion } from "./budget-map-question-orbit";

/**
 * 質問衛星の動作確認用データ。
 *
 * ここにあるのは実際の質問ではなく、衛星の見え方と操作を確かめるための
 * 差し込み用データである。実在の議員名と顔写真を使うため、本物の質問と
 * 誤解されないよう既定では表示しない。`?questionSample=1` を付けたときだけ
 * 出す。予算特別委員会の質問が入ったら、この経路ごと実データへ差し替える。
 */

export const BUDGET_MAP_SAMPLE_QUESTION_PARAM = "questionSample";

/** 動作確認用であることが一目で分かるID。実データのIDと衝突させない。 */
export const BUDGET_MAP_SAMPLE_QUESTION_ID = "sample-future-finance";

const SAMPLE_QUESTION: BudgetMapQuestion = {
  questionId: BUDGET_MAP_SAMPLE_QUESTION_ID,
  text: "将来の財政は大丈夫なのでしょうか",
  member: "くろだあいこ",
  photo: "/icons/councilors/kuroda-aiko.jpg",
};

export function isBudgetMapSampleQuestionId(questionId: string): boolean {
  return questionId === BUDGET_MAP_SAMPLE_QUESTION_ID;
}

/**
 * URL パラメータから、動作確認用の質問を出すかどうかを決める。
 * 未指定や未知の値では出さない。
 */
export function shouldShowBudgetMapSampleQuestions(
  value: string | string[] | undefined | null
): boolean {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "1";
}

/**
 * 衛星を出す場所すべて（overview と各分野）へ同じ質問を1件置く。
 * 実データでは分野ごとにその分野の質問を渡す。
 */
export function getBudgetMapSampleQuestions(
  enabled: boolean
): BudgetMapQuestion[] {
  return enabled ? [SAMPLE_QUESTION] : [];
}
