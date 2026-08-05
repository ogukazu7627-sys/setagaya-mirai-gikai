import type { BudgetMapMode, BudgetMapPosition } from "./budget-map-layout";
import { createSeededRandom } from "./budget-map-v2-particles";

/**
 * 議員の質問衛星の軌道。
 *
 * 中心の予算コアの周りを、線でつながずにゆっくり漂う顔写真として置く。
 * 分野・課題・事業は中心から放射線で結ぶが、質問衛星は結ばない。
 * 「予算の構造の一部ではなく、その周りを巡っている別の存在」を線の有無で区別する。
 *
 * 衛星の数・位置・軌道に意味はない。質問が多い分野が重要という読み方はできない。
 */

/** 中心の周りに置く最大数。増やすと中心付近が混雑して可読性が落ちる。 */
export const BUDGET_MAP_QUESTION_LIMIT = 2;

/** カメラスケール。モバイルでは全体を縮める。 */
export const BUDGET_MAP_QUESTION_SCALE: Readonly<
  Record<BudgetMapMode, number>
> = {
  desktop: 1,
  mobile: 0.6,
};

/** 静止時はラベルの背面を通し、開いたときだけ最前面へ出す。 */
export const BUDGET_MAP_QUESTION_Z_INDEX = { idle: 6, open: 30 } as const;

const AVATAR_BASE_PX = 34;
const MARK_BASE_PX = 15;
const MARK_ANGLE_DEGREES = 20;
const ORBIT_OFFSET_X_PX = 196;
const ORBIT_OFFSET_Y_PX = 22;

export type BudgetMapQuestion = {
  /** 遷移に使う唯一のキー。URLは渡さない。 */
  questionId: string;
  /** 質問の件名。 */
  text: string;
  /** 議員名。 */
  member: string;
  /** 顔写真URL。公開許諾を得たものだけを使う。 */
  photo: string;
};

export type BudgetMapQuestionOrbit = {
  id: string;
  question: BudgetMapQuestion;
  /** 軌道の起点。中心から左右へ振り分ける。 */
  originX: number;
  originY: number;
  amplitudeXPx: number;
  amplitudeYPx: number;
  durationXSeconds: number;
  durationYSeconds: number;
  delaySeconds: number;
  bobDurationSeconds: number;
  avatarPx: number;
  markPx: number;
  markRightPx: number;
  markBottomPx: number;
  markIconPx: number;
  gapPx: number;
  bodyPaddingRightPx: number;
  labelFontPx: number;
  memberFontPx: number;
};

export function getBudgetMapQuestionScale(mode: BudgetMapMode): number {
  return BUDGET_MAP_QUESTION_SCALE[mode];
}

/**
 * 質問バッジを顔の円に外接させる位置。水平から下向き20度の方向。
 *
 * 顔は `box-sizing: border-box` であることが前提。`content-box` だと
 * 1px枠のぶん外径が顔の直径より大きくなり、この式が成り立たなくなる。
 */
export function getBudgetMapQuestionMarkOffset(
  avatarPx: number,
  markPx: number
): { rightPx: number; bottomPx: number } {
  const centerDistance = (avatarPx + markPx) / 2;
  const radians = (MARK_ANGLE_DEGREES * Math.PI) / 180;
  return {
    rightPx: Math.round(
      centerDistance * Math.cos(radians) - (avatarPx - markPx) / 2
    ),
    bottomPx: Math.round(
      centerDistance * Math.sin(radians) - (avatarPx - markPx) / 2
    ),
  };
}

/**
 * 中心の周りを漂う軌道を作る。
 *
 * X と Y に周期の異なる往復運動を掛け合わせ、閉じないリサージュ状の軌跡にする。
 * 回転は掛けない。顔写真が傾くと不自然なため。
 * 左右の側面へ振り分け、分野名やコアラベルで混雑する真上・真下は通らせない。
 */
export function createBudgetMapQuestionOrbits(input: {
  center: BudgetMapPosition;
  questions: readonly BudgetMapQuestion[];
  seed: number;
  mode: BudgetMapMode;
}): BudgetMapQuestionOrbit[] {
  const scale = getBudgetMapQuestionScale(input.mode);
  const visible = input.questions.slice(0, BUDGET_MAP_QUESTION_LIMIT);
  if (visible.length === 0) {
    return [];
  }

  const random = createSeededRandom(input.seed);
  const avatarPx = Math.round(AVATAR_BASE_PX * scale);
  const markPx = Math.round(MARK_BASE_PX * scale);
  const markOffset = getBudgetMapQuestionMarkOffset(avatarPx, markPx);

  return visible.map((question, index) => {
    const side = index === 0 ? -1 : 1;
    const amplitudeXPx = (66 + random() * 16) * scale;
    const amplitudeYPx = (74 + random() * 18) * scale;
    const durationXSeconds = 27 + random() * 8;
    // 負の遅延で位相をずらし、2つが同じ動きに見えないようにする。
    const delaySeconds = -(durationXSeconds * (index === 0 ? 0.05 : 0.53));
    return {
      id: `${input.seed}-${index}`,
      question,
      originX: round(input.center.x + side * ORBIT_OFFSET_X_PX * scale),
      originY: round(input.center.y - ORBIT_OFFSET_Y_PX * scale),
      amplitudeXPx: Math.round(amplitudeXPx),
      amplitudeYPx: Math.round(amplitudeYPx),
      durationXSeconds: round(durationXSeconds),
      durationYSeconds: round(durationXSeconds * 0.31),
      delaySeconds: round(delaySeconds),
      bobDurationSeconds: round(3.6 + random() * 1.4),
      avatarPx,
      markPx,
      markRightPx: markOffset.rightPx,
      markBottomPx: markOffset.bottomPx,
      markIconPx: Math.max(7, Math.round(9 * scale)),
      gapPx: Math.round(9 * scale),
      bodyPaddingRightPx: Math.round(14 * scale),
      labelFontPx: round(11.5 * scale),
      memberFontPx: round(9.5 * scale),
    };
  });
}

/**
 * 表示する質問を選ぶ。3件以上あれば先頭から上限件数まで。
 * 0件ならダミーで埋めず、衛星自体を出さない。
 */
export function selectBudgetMapQuestions(
  questions: readonly BudgetMapQuestion[]
): BudgetMapQuestion[] {
  return questions.slice(0, BUDGET_MAP_QUESTION_LIMIT);
}

/** 小数1桁へ丸める。`-0` は CSS へ出さないため 0 に寄せる。 */
function round(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}
