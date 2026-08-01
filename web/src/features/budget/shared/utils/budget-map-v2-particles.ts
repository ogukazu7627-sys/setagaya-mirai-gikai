import type { BudgetMapMode, BudgetMapPosition } from "./budget-map-layout";
import {
  type BudgetMapV2Vector,
  getBudgetMapV2SpokePath,
  round,
} from "./budget-map-v2-geometry";

/**
 * 触れる予算・宇宙マップ v2 の装飾粒子。
 * 乱数は seed 固定の LCG で、SSR と CSR の配置が一致すること。
 *
 * ここで作る星粒・球体・枝・流れる粒はすべて探索のための装飾であり、
 * 金額、財源の流れ、優先順位、良し悪しを一切表さない。
 */

export const BUDGET_MAP_V2_DESKTOP_STAR_COUNT = 200;
export const BUDGET_MAP_V2_MOBILE_STAR_COUNT = 70;
export const BUDGET_MAP_V2_MAX_STAR_COUNT = 220;

export type BudgetMapV2Star = {
  id: string;
  leftPercent: number;
  topPercent: number;
  sizePx: number;
  opacity: number;
  tone: "cyan" | "mint" | "gold";
  twinkles: boolean;
  durationSeconds: number;
  delaySeconds: number;
};

export type BudgetMapV2CoreDot = {
  id: string;
  x: number;
  y: number;
  radius: number;
  hue: number | null;
  alpha: number;
  driftIndex: number;
  durationSeconds: number;
  delaySeconds: number;
};

export type BudgetMapV2BranchLine = {
  id: string;
  d: string;
  depth: 1 | 2;
};

export type BudgetMapV2BranchDot = {
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: "halo" | "core";
  depth: 1 | 2;
  hue: number | null;
};

export type BudgetMapV2Branches = {
  lines: BudgetMapV2BranchLine[];
  dots: BudgetMapV2BranchDot[];
};

export type BudgetMapV2FlowParticle = {
  id: string;
  path: string;
  sizePx: number;
  hue: number;
  durationSeconds: number;
  delaySeconds: number;
};

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

export function getBudgetMapV2StarCount(mode: BudgetMapMode): number {
  return mode === "mobile"
    ? BUDGET_MAP_V2_MOBILE_STAR_COUNT
    : BUDGET_MAP_V2_DESKTOP_STAR_COUNT;
}

export function createBudgetMapV2Stars(
  seed: number,
  count: number
): BudgetMapV2Star[] {
  const random = createSeededRandom(seed);
  const total = Math.min(
    Math.max(0, Math.floor(count)),
    BUDGET_MAP_V2_MAX_STAR_COUNT
  );
  return Array.from({ length: total }, (_, index) => {
    const sizePx = round2(0.9 + random() * 1.7);
    const opacity = round2(0.12 + random() * 0.55);
    const twinkles = random() > 0.68;
    const leftPercent = round2(random() * 100);
    const topPercent = round2(random() * 100);
    const toneRoll = random();
    const tone = toneRoll > 0.88 ? "gold" : toneRoll > 0.72 ? "mint" : "cyan";
    return {
      id: `v2-star-${index}`,
      leftPercent,
      topPercent,
      sizePx,
      opacity,
      tone,
      twinkles,
      durationSeconds: round1(3 + random() * 5),
      delaySeconds: round1(random() * 4),
    };
  });
}

/**
 * 中心の粒子球体。粒の角度から分野色を引くため、
 * overview では10分野が混ざって見えるのが正しい。
 */
export function createBudgetMapV2CoreDots(input: {
  center: BudgetMapPosition;
  radius: number;
  hues: readonly number[];
  seed: number;
  count: number;
}): BudgetMapV2CoreDot[] {
  const { center, radius, hues, seed, count } = input;
  if (count <= 0 || hues.length === 0) {
    return [];
  }
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const angle = random() * Math.PI * 2;
    const distance = radius * random() ** 0.52;
    const depth = 1 - distance / radius;
    const isWhite = random() > 0.76;
    const hueIndex = Math.min(
      hues.length - 1,
      Math.floor(((angle + Math.PI) / (Math.PI * 2)) * hues.length)
    );
    return {
      id: `v2-core-${index}`,
      x: round(center.x + Math.cos(angle) * distance),
      y: round(center.y + Math.sin(angle) * distance * 0.97),
      radius: round2(0.32 + depth * 0.7 + random() * 0.3),
      hue: isWhite ? null : (hues[hueIndex] ?? null),
      alpha: isWhite ? round2(0.34 + depth * 0.5) : round2(0.3 + depth * 0.55),
      driftIndex: 1 + Math.floor(random() * 6),
      durationSeconds: round1(4.4 + random() * 4.6),
      delaySeconds: round1(random() * 6),
    };
  });
}

/**
 * 各ノードから外向きに伸びる枝。必ず中心球体と反対方向へ出す。
 */
export function createBudgetMapV2Branches(input: {
  nodes: readonly (BudgetMapV2Vector & { hue: number })[];
  seed: number;
  scale?: number;
}): BudgetMapV2Branches {
  const { nodes, seed } = input;
  const scale = input.scale ?? 1;
  const random = createSeededRandom(seed);
  const lines: BudgetMapV2BranchLine[] = [];
  const dots: BudgetMapV2BranchDot[] = [];

  nodes.forEach((node, nodeIndex) => {
    const base = Math.atan2(node.uy, node.ux);
    const offsets = random() > 0.45 ? [-68, -22.7, 22.7, 68] : [-68, 0, 68];
    offsets.forEach((offsetDegrees, branchIndex) => {
      const sign = offsetDegrees < 0 ? -1 : 1;
      const angle =
        base + ((offsetDegrees + sign * (random() - 0.5) * 14) * Math.PI) / 180;
      const firstLength = (32 + random() * 24) * scale;
      const origin = {
        x: round(node.x + Math.cos(angle) * 22 * scale),
        y: round(node.y + Math.sin(angle) * 22 * scale),
      };
      const first = {
        x: round(node.x + Math.cos(angle) * firstLength),
        y: round(node.y + Math.sin(angle) * firstLength),
      };
      const key = `v2-branch-${nodeIndex}-${branchIndex}`;
      lines.push({
        id: `${key}-l1`,
        d: `M ${origin.x} ${origin.y} L ${first.x} ${first.y}`,
        depth: 1,
      });
      const firstRadius = round2(2.1 + random() * 1.1);
      dots.push({
        id: `${key}-d1-halo`,
        x: first.x,
        y: first.y,
        radius: round2(firstRadius * 2.7),
        kind: "halo",
        depth: 1,
        hue: null,
      });
      dots.push({
        id: `${key}-d1`,
        x: first.x,
        y: first.y,
        radius: firstRadius,
        kind: "core",
        depth: 1,
        hue: null,
      });

      if (random() <= 0.42) {
        return;
      }
      const secondAngle = angle + sign * (0.18 + random() * 0.42);
      const secondLength = (22 + random() * 18) * scale;
      const second = {
        x: round(first.x + Math.cos(secondAngle) * secondLength),
        y: round(first.y + Math.sin(secondAngle) * secondLength),
      };
      lines.push({
        id: `${key}-l2`,
        d: `M ${first.x} ${first.y} L ${second.x} ${second.y}`,
        depth: 2,
      });
      const secondRadius = round2(1.3 + random() * 0.9);
      dots.push({
        id: `${key}-d2-halo`,
        x: second.x,
        y: second.y,
        radius: round2(secondRadius * 2.6),
        kind: "halo",
        depth: 2,
        hue: node.hue,
      });
      dots.push({
        id: `${key}-d2`,
        x: second.x,
        y: second.y,
        radius: secondRadius,
        kind: "core",
        depth: 2,
        hue: random() > 0.5 ? null : node.hue,
      });
    });
  });

  return { lines, dots };
}

/** topic 画面だけで使う、事業ノード周りの小さな衛星。 */
export function createBudgetMapV2Satellites(input: {
  nodes: readonly (BudgetMapPosition & { hue: number })[];
  seed: number;
  scale?: number;
}): BudgetMapV2Branches {
  const { nodes, seed } = input;
  const scale = input.scale ?? 1;
  const random = createSeededRandom(seed);
  const lines: BudgetMapV2BranchLine[] = [];
  const dots: BudgetMapV2BranchDot[] = [];

  nodes.forEach((node, nodeIndex) => {
    const count = 2 + Math.floor(random() * 2);
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = (30 + random() * 46) * scale;
      const point = {
        x: round(node.x + Math.cos(angle) * distance),
        y: round(node.y + Math.sin(angle) * distance * 0.72),
      };
      const key = `v2-satellite-${nodeIndex}-${index}`;
      lines.push({
        id: `${key}-l`,
        d: `M ${node.x} ${node.y} L ${point.x} ${point.y}`,
        depth: 2,
      });
      dots.push({
        id: `${key}-d`,
        x: point.x,
        y: point.y,
        radius: round2(0.9 + random() * 1.5),
        kind: "core",
        depth: 2,
        hue: node.hue,
      });
    }
  });

  return { lines, dots };
}

/**
 * 放射線の上を流れる粒。1本につき2粒。
 * reduced-motion では要素ごと生成しないため、呼び出し側で分岐する。
 */
export function createBudgetMapV2FlowParticles(input: {
  center: BudgetMapPosition;
  nodes: readonly (BudgetMapPosition & {
    hue: number;
    startTrim: number;
    endTrim: number;
  })[];
  seed: number;
}): BudgetMapV2FlowParticle[] {
  const random = createSeededRandom(input.seed);
  const particles: BudgetMapV2FlowParticle[] = [];
  input.nodes.forEach((node, nodeIndex) => {
    const path = getBudgetMapV2SpokePath(
      input.center,
      node,
      node.startTrim,
      node.endTrim
    );
    for (let index = 0; index < 2; index += 1) {
      particles.push({
        id: `v2-flow-${nodeIndex}-${index}`,
        path,
        sizePx: round1(1.8 + random() * 1.4),
        hue: node.hue,
        durationSeconds: round1(3.4 + random() * 2.6),
        delaySeconds: round1(random() * 6),
      });
    }
  });
  return particles;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
