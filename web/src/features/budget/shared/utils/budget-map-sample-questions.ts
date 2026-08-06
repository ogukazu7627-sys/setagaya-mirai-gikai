import type { BudgetMapQuestion } from "./budget-map-question-orbit";

/**
 * 質問衛星の見本データ。
 *
 * ここにあるのは実際に議会で行われた質問ではなく、衛星の見え方と操作を
 * 確かめるための差し込み用データである。既定で表示し、`?questionSample=0`
 * を付けたときだけ止める。
 *
 * 実在の議員名と顔写真を使うため、遷移先の質問詳細ページでは見本である
 * ことを明記する。予算特別委員会の質問が入ったら、この経路ごと実データへ
 * 差し替える。
 */

export const BUDGET_MAP_SAMPLE_QUESTION_PARAM = "questionSample";

/** 見本であることが一目で分かるID。実データのIDと衝突させない。 */
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
 * URL パラメータから、見本の質問を出すかどうかを決める。
 * 既定は表示。`0` を指定したときだけ止める。
 */
export function shouldShowBudgetMapSampleQuestions(
  value: string | string[] | undefined | null
): boolean {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate !== "0";
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
