import type {
  BudgetMapMode,
  BudgetMapPosition,
  BudgetMapWorldDimensions,
} from "./budget-map-layout";

/**
 * 触れる予算・宇宙マップ v2 の確定デザイン値。
 * 数値の原典は `docs/budget-map-v2-spec.md`（Claude Design 引き継ぎ仕様）。
 */

export type BudgetMapV2Vector = BudgetMapPosition & {
  ux: number;
  uy: number;
};

export type BudgetMapV2AmountTier = "high" | "mid" | "low";

export const BUDGET_MAP_V2_DEFAULT_HUE = 220;

/** 分野ごとの固有色相。順序がそのまま overview リング上の角度になる。 */
export const BUDGET_MAP_V2_CATEGORY_HUES: Readonly<Record<string, number>> = {
  education: 220,
  "child-rearing": 350,
  welfare: 25,
  "urban-development": 265,
  "disaster-prevention": 60,
  "administration-finance": 242,
  "culture-sports": 320,
  industry: 100,
  environment: 152,
  "daily-life": 188,
};

export function getBudgetMapV2CategoryHue(slug: string): number {
  return BUDGET_MAP_V2_CATEGORY_HUES[slug] ?? BUDGET_MAP_V2_DEFAULT_HUE;
}

/** world 座標系の寸法。viewport 高さが伸縮しても構図は変わらない。 */
export const BUDGET_MAP_V2_WORLD: Readonly<
  Record<
    BudgetMapMode,
    Record<"overview" | "category" | "topic", BudgetMapWorldDimensions>
  >
> = {
  desktop: {
    overview: { width: 1000, height: 620 },
    category: { width: 1000, height: 620 },
    topic: { width: 1000, height: 700 },
  },
  mobile: {
    overview: { width: 360, height: 560 },
    category: { width: 360, height: 660 },
    topic: { width: 360, height: 700 },
  },
};

export function getBudgetMapV2WorldDimensions(
  kind: "overview" | "category" | "topic",
  mode: BudgetMapMode
): BudgetMapWorldDimensions {
  return BUDGET_MAP_V2_WORLD[mode][kind];
}

/** 各画面のカメラ焦点。zoom 1 で world 全体が viewport に収まる。 */
export const BUDGET_MAP_V2_CAMERA_FOCUS: Readonly<
  Record<
    BudgetMapMode,
    Record<"overview" | "category" | "topic", BudgetMapPosition>
  >
> = {
  desktop: {
    overview: { x: 500, y: 310 },
    category: { x: 500, y: 310 },
    topic: { x: 500, y: 350 },
  },
  mobile: {
    overview: { x: 180, y: 280 },
    category: { x: 180, y: 330 },
    topic: { x: 180, y: 350 },
  },
};

export function getBudgetMapV2CameraFocus(
  kind: "overview" | "category" | "topic",
  mode: BudgetMapMode
): BudgetMapPosition {
  return BUDGET_MAP_V2_CAMERA_FOCUS[mode][kind];
}

/** 中心の粒子球体・中実コアの位置と大きさ。 */
export const BUDGET_MAP_V2_CORE = {
  desktop: {
    overview: { center: { x: 500, y: 325 }, radius: 80, dotCount: 560 },
    category: { center: { x: 500, y: 352 }, radius: 84, dotCount: 460 },
    topic: { center: { x: 500, y: 365 }, radius: 63, dotCount: 0 },
  },
  mobile: {
    overview: { center: { x: 180, y: 300 }, radius: 48, dotCount: 300 },
    category: { center: { x: 180, y: 300 }, radius: 46, dotCount: 260 },
    topic: { center: { x: 180, y: 112 }, radius: 40, dotCount: 190 },
  },
} as const;

/**
 * 中心コアの下に置く見出しの縦位置。コア中心からの距離で、
 * 確定デザインの実測値をそのまま持つ。
 */
export const BUDGET_MAP_V2_CAPTION_OFFSET: Readonly<
  Record<BudgetMapMode, Record<"overview" | "category" | "topic", number>>
> = {
  desktop: { overview: 89, category: 110, topic: 96 },
  mobile: { overview: 68, category: 104, topic: 66 },
};

export function getBudgetMapV2CaptionOffset(
  kind: "overview" | "category" | "topic",
  mode: BudgetMapMode
): number {
  return BUDGET_MAP_V2_CAPTION_OFFSET[mode][kind];
}

/** overview の等角リング。10分野を36度間隔で楕円上に置く。 */
const OVERVIEW_RING = {
  desktop: { rx: 300, ry: 146, labelReach: 118 },
  mobile: { rx: 132, ry: 180, labelReach: 0 },
} as const;

export type BudgetMapV2RingNode = BudgetMapV2Vector & {
  index: number;
  labelOffsetX: number;
  labelOffsetY: number;
};

/**
 * 中心から等角でリング上に配置する。件数が10でなくても
 * 360/N 度で等間隔に割り、必ず1周に収める。
 */
export function getBudgetMapV2RingNodes(
  count: number,
  center: BudgetMapPosition,
  radiusX: number,
  radiusY: number,
  labelReach = 0
): BudgetMapV2RingNode[] {
  if (count <= 0) {
    return [];
  }
  const step = 360 / count;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index * step * Math.PI) / 180;
    const x = round(center.x + radiusX * Math.sin(angle));
    const y = round(center.y - radiusY * Math.cos(angle));
    const { ux, uy } = getUnitVector(center, { x, y });
    return {
      index,
      x,
      y,
      ux,
      uy,
      labelOffsetX: round(ux * labelReach),
      labelOffsetY: round(uy * labelReach),
    };
  });
}

export function getBudgetMapV2OverviewRing(
  count: number,
  mode: BudgetMapMode
): BudgetMapV2RingNode[] {
  const ring = OVERVIEW_RING[mode];
  const core = BUDGET_MAP_V2_CORE[mode].overview;
  const nodes = getBudgetMapV2RingNodes(
    count,
    core.center,
    ring.rx,
    ring.ry,
    ring.labelReach
  );

  if (mode !== "desktop") {
    return nodes;
  }

  return nodes.map((node) =>
    Math.abs(node.ux) < 0.01 && node.uy > 0.99
      ? {
          ...node,
          y: node.y + 34,
          labelOffsetY: 58,
        }
      : node
  );
}

const CATEGORY_TOPIC_RING = {
  desktop: { rx: 320, ry: 165 },
  mobile: { rx: 132, ry: 154 },
} as const;

/**
 * category 画面の課題ノード。1件なら中心コアの真上、
 * 複数なら overview と同じ等角リングに載せる。
 */
export function getBudgetMapV2CategoryTopicNodes(
  count: number,
  mode: BudgetMapMode
): BudgetMapV2RingNode[] {
  if (count <= 0) {
    return [];
  }
  const core = BUDGET_MAP_V2_CORE[mode].category;
  const ring = CATEGORY_TOPIC_RING[mode];
  if (count === 1) {
    const y = round(core.center.y - ring.ry);
    return [
      {
        index: 0,
        x: core.center.x,
        y,
        ux: 0,
        uy: -1,
        labelOffsetX: 0,
        labelOffsetY: 0,
      },
    ];
  }
  return getBudgetMapV2RingNodes(count, core.center, ring.rx, ring.ry);
}

const TOPIC_PROGRAM_RING = { rx: 355, ry: 215, startAngle: 18 } as const;

/** mobile topic は 2列グリッド固定。 */
const MOBILE_PROGRAM_SLOTS: readonly BudgetMapPosition[] = [
  { x: 96, y: 262 },
  { x: 264, y: 262 },
  { x: 96, y: 402 },
  { x: 264, y: 402 },
  { x: 96, y: 542 },
  { x: 264, y: 542 },
];

/**
 * topic 画面の事業ノード。desktop は t = (18 + i * 36)° の楕円リング、
 * mobile は固定2列グリッド。件数はページサイズ以内であること。
 */
export function getBudgetMapV2ProgramNodes(
  count: number,
  mode: BudgetMapMode
): BudgetMapV2Vector[] {
  if (count <= 0) {
    return [];
  }
  const core = BUDGET_MAP_V2_CORE[mode].topic;
  if (mode === "mobile") {
    return MOBILE_PROGRAM_SLOTS.slice(0, count).map((slot) => ({
      ...slot,
      ...getUnitVector(core.center, slot),
    }));
  }
  const step = 360 / Math.max(count, 1);
  return Array.from({ length: count }, (_, index) => {
    const angle =
      ((TOPIC_PROGRAM_RING.startAngle + index * step) * Math.PI) / 180;
    const position = {
      x: round(core.center.x + TOPIC_PROGRAM_RING.rx * Math.sin(angle)),
      y: round(core.center.y - TOPIC_PROGRAM_RING.ry * Math.cos(angle)),
    };
    return { ...position, ...getUnitVector(core.center, position) };
  });
}

/** category 画面で遠景に残す他分野の配置。 */
const DISTANT_RING = { center: { x: 500, y: 315 }, rx: 440, ry: 255 } as const;

export function getBudgetMapV2DistantNodes(count: number): BudgetMapV2Vector[] {
  return getBudgetMapV2RingNodes(
    count,
    DISTANT_RING.center,
    DISTANT_RING.rx,
    DISTANT_RING.ry
  ).map(({ x, y, ux, uy }) => ({ x, y, ux, uy }));
}

/**
 * 球体の縁からノードのアイコン縁まで両端をトリムした直線を引く。
 * 線の太さに意味は持たせない。
 */
export function getBudgetMapV2SpokePath(
  from: BudgetMapPosition,
  to: BudgetMapPosition,
  startTrim: number,
  endTrim: number
): string {
  const { ux, uy } = getUnitVector(from, to);
  const start = {
    x: round(from.x + ux * startTrim),
    y: round(from.y + uy * startTrim),
  };
  const end = {
    x: round(to.x - ux * endTrim),
    y: round(to.y - uy * endTrim),
  };
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

/** 各画面の線のトリム量。 */
export const BUDGET_MAP_V2_TRIM = {
  desktop: {
    overview: { start: 84, end: 23 },
    category: { start: 88, end: 27 },
    topic: { start: 70 },
  },
  mobile: {
    overview: { start: 52, end: 20 },
    category: { start: 50, end: 26 },
    topic: { start: 46 },
  },
} as const;

/** 事業ノードの直径。金額の相対的な大小だけを表し、優先順位は示さない。 */
export const BUDGET_MAP_V2_PROGRAM_DIAMETER = {
  desktop: { high: 56, mid: 44, low: 34, uniform: 42 },
  mobile: { high: 48, mid: 40, low: 32, uniform: 40 },
} as const;

/**
 * 表示中ページ内の最大額に対する比率で3段に分ける。
 * 閾値は確定デザインの 40% / 10%。
 */
export function getBudgetMapV2AmountTier(
  amountThousandYen: number,
  visibleAmountsThousandYen: readonly number[]
): BudgetMapV2AmountTier {
  const maxAmount = visibleAmountsThousandYen.reduce(
    (largest, amount) => Math.max(largest, amount),
    0
  );
  if (maxAmount <= 0) {
    return "low";
  }
  if (amountThousandYen >= maxAmount * 0.4) {
    return "high";
  }
  if (amountThousandYen >= maxAmount * 0.1) {
    return "mid";
  }
  return "low";
}

export function getBudgetMapV2ProgramDiameter(
  tier: BudgetMapV2AmountTier,
  mode: BudgetMapMode,
  sizeByAmount: boolean
): number {
  const sizes = BUDGET_MAP_V2_PROGRAM_DIAMETER[mode];
  return sizeByAmount ? sizes[tier] : sizes.uniform;
}

export function getUnitVector(
  from: BudgetMapPosition,
  to: BudgetMapPosition
): { ux: number; uy: number } {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  return { ux: deltaX / length, uy: deltaY / length };
}

/** 小数1桁へ丸める。`-0` は SVG パス文字列に出さないため 0 に寄せる。 */
export function round(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}
