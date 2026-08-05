import type { BudgetMapMode } from "./budget-map-layout";

/**
 * 触れる予算の使い方（初回訪問オンボーディング・4ステップ）。
 *
 * 静止した説明ではなく、本番と同じ画面遷移を実際に走らせる。
 * step1・step2の「次へ」は、分野ノード・課題ノードを押したときと
 * まったく同じコールバックを呼ぶ。チュートリアル専用の遷移は作らない。
 */

export const BUDGET_MAP_TUTORIAL_STORAGE_KEY = "mirai:budget-map:tutorial:v2";
/** 初期描画を邪魔しないよう、マウントから少し置いて出す。 */
export const BUDGET_MAP_TUTORIAL_AUTO_OPEN_MS = 700;
/** 着地（860ms）の直後にカードを戻す。 */
export const BUDGET_MAP_TUTORIAL_HOLD_MS = 980;
export const BUDGET_MAP_TUTORIAL_HOLD_REDUCED_MS = 60;

export type BudgetMapTutorialStepIndex = 0 | 1 | 2 | 3;

export type BudgetMapTutorialSpotlight = {
  xPercent: number;
  yPercent: number;
  radiusXPx: number;
  radiusYPx: number;
};

export type BudgetMapTutorialCardPosition = "bottom" | "left";

export type BudgetMapTutorialStep = {
  index: BudgetMapTutorialStepIndex;
  title: string;
  body: string;
  /** このステップで見せている画面。「次へ」で走らせる遷移を決める。 */
  scene: "overview" | "category" | "topic";
  spotlight: Record<BudgetMapMode, BudgetMapTutorialSpotlight>;
  cardPosition: Record<BudgetMapMode, BudgetMapTutorialCardPosition>;
};

/**
 * スポットライトは「押してほしいもの1つ」に絞る。
 * 画面半分を覆う大きな円は、結局何も指していないのと同じになる。
 * 横に広い対象を縦方向まで余分に覆わないよう、円ではなく楕円を使う。
 */
export const BUDGET_MAP_TUTORIAL_STEPS: readonly BudgetMapTutorialStep[] = [
  {
    index: 0,
    title: "大分類をタップ",
    body: "中心の予算を10の分野が囲んでいます。光っている「教育」のように、気になる分野をひとつ押します。",
    scene: "overview",
    spotlight: {
      desktop: { xPercent: 50, yPercent: 29, radiusXPx: 104, radiusYPx: 90 },
      mobile: { xPercent: 50, yPercent: 21.5, radiusXPx: 88, radiusYPx: 78 },
    },
    cardPosition: { desktop: "bottom", mobile: "bottom" },
  },
  {
    index: 1,
    title: "課題を選ぶ",
    body: "その分野で区が取り組んでいる課題が浮かびます。光っている課題を押すと、関わる予算に進みます。",
    scene: "category",
    spotlight: {
      desktop: { xPercent: 50, yPercent: 28.5, radiusXPx: 126, radiusYPx: 100 },
      mobile: { xPercent: 50, yPercent: 22, radiusXPx: 100, radiusYPx: 86 },
    },
    cardPosition: { desktop: "bottom", mobile: "bottom" },
  },
  {
    index: 2,
    title: "区の予算事業を発見する",
    body: "課題に関わる予算事業が並びます。丸の大きさは、この画面内での金額の相対的な大小です。",
    scene: "topic",
    spotlight: {
      desktop: { xPercent: 50, yPercent: 33, radiusXPx: 336, radiusYPx: 152 },
      mobile: { xPercent: 50, yPercent: 40, radiusXPx: 126, radiusYPx: 94 },
    },
    cardPosition: { desktop: "bottom", mobile: "bottom" },
  },
  {
    index: 3,
    title: "検索からも探せる",
    body: "分野をたどらず、事業名や所管課から直接探せます。公式の予算分類からも一覧できます。",
    scene: "topic",
    spotlight: {
      desktop: { xPercent: 84, yPercent: 84, radiusXPx: 152, radiusYPx: 106 },
      mobile: { xPercent: 78, yPercent: 9, radiusXPx: 98, radiusYPx: 54 },
    },
    cardPosition: { desktop: "left", mobile: "bottom" },
  },
];

export const BUDGET_MAP_TUTORIAL_LAST_STEP_INDEX = 3;

export function getBudgetMapTutorialStep(index: number): BudgetMapTutorialStep {
  const step = BUDGET_MAP_TUTORIAL_STEPS[clampStepIndex(index)];
  if (!step) {
    throw new Error("チュートリアルのステップを解決できませんでした");
  }
  return step;
}

export function clampStepIndex(index: number): BudgetMapTutorialStepIndex {
  const normalized = Math.min(
    BUDGET_MAP_TUTORIAL_LAST_STEP_INDEX,
    Math.max(0, Math.floor(index))
  );
  return normalized as BudgetMapTutorialStepIndex;
}

export function isBudgetMapTutorialLastStep(index: number): boolean {
  return clampStepIndex(index) >= BUDGET_MAP_TUTORIAL_LAST_STEP_INDEX;
}

/**
 * dim に開ける穴。`mask-image` は補間できず即座に切り替わるため、
 * リング側にも位置・大きさの transition を付けてはいけない。
 * 付けるとレンダリングが抑制された環境でリングだけが前のステップに取り残され、
 * 光っている場所と輪が別のものを指す。
 */
export function getBudgetMapTutorialMaskImage(
  spotlight: BudgetMapTutorialSpotlight
): string {
  return `radial-gradient(ellipse ${spotlight.radiusXPx}px ${spotlight.radiusYPx}px at ${spotlight.xPercent}% ${spotlight.yPercent}%, rgba(0,0,0,0) 0%, rgba(0,0,0,.3) 58%, #000 100%)`;
}

/** カードの三角が向く方角。必ずスポットライトの側を向かせる。 */
export function getBudgetMapTutorialCaretDirection(
  cardPosition: BudgetMapTutorialCardPosition
): "up" | "right" {
  return cardPosition === "left" ? "right" : "up";
}

/**
 * 「次へ」で走らせる遷移。step1・step2だけが画面を進め、
 * step3は遷移なしでstep4を出し、step4は保存して閉じる。
 */
export type BudgetMapTutorialAdvance =
  | { kind: "select-category" }
  | { kind: "select-topic" }
  | { kind: "next-step" }
  | { kind: "finish" };

export function getBudgetMapTutorialAdvance(
  index: number
): BudgetMapTutorialAdvance {
  switch (clampStepIndex(index)) {
    case 0:
      return { kind: "select-category" };
    case 1:
      return { kind: "select-topic" };
    case 2:
      return { kind: "next-step" };
    case 3:
      return { kind: "finish" };
  }
}

/** 「戻る」で巻き戻す先の画面。演出は挟まない。 */
export function getBudgetMapTutorialPreviousScene(
  index: number
): "overview" | "category" | "topic" | null {
  const previous = clampStepIndex(index) - 1;
  if (previous < 0) {
    return null;
  }
  return getBudgetMapTutorialStep(previous).scene;
}

export function getBudgetMapTutorialHoldMs(reduceMotion: boolean): number {
  return reduceMotion
    ? BUDGET_MAP_TUTORIAL_HOLD_REDUCED_MS
    : BUDGET_MAP_TUTORIAL_HOLD_MS;
}

/**
 * 初回訪問かどうか。判定材料は親から渡す。
 * ログイン済みならユーザー設定、未ログインなら localStorage を見る。
 * iframe から Supabase は叩かない。
 */
export function shouldAutoOpenBudgetMapTutorial(input: {
  signedIn: boolean;
  tutorialSeen: boolean;
  storedValue: string | null;
}): boolean {
  if (input.signedIn) {
    return !input.tutorialSeen;
  }
  return input.storedValue !== "done";
}
