import { describe, expect, it } from "vitest";
import {
  BUDGET_MAP_V2_DESKTOP_STAR_COUNT,
  BUDGET_MAP_V2_MAX_STAR_COUNT,
  BUDGET_MAP_V2_MOBILE_STAR_COUNT,
  createBudgetMapV2Branches,
  createBudgetMapV2CoreDots,
  createBudgetMapV2FlowParticles,
  createBudgetMapV2Satellites,
  createBudgetMapV2Stars,
  createSeededRandom,
  getBudgetMapV2StarCount,
} from "./budget-map-v2-particles";

describe("createSeededRandom", () => {
  it("同じ seed なら同じ列を返す", () => {
    const first = createSeededRandom(31);
    const second = createSeededRandom(31);

    expect(Array.from({ length: 5 }, first)).toEqual(
      Array.from({ length: 5 }, second)
    );
  });

  it("0 以上 1 未満に収まる", () => {
    const random = createSeededRandom(7);

    for (let index = 0; index < 200; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("createBudgetMapV2Stars", () => {
  it("SSR と CSR で同じ配置になる", () => {
    expect(createBudgetMapV2Stars(3, 40)).toEqual(
      createBudgetMapV2Stars(3, 40)
    );
  });

  it("上限を超える件数を要求されても切り詰める", () => {
    expect(createBudgetMapV2Stars(3, 999)).toHaveLength(
      BUDGET_MAP_V2_MAX_STAR_COUNT
    );
  });

  it("画面ごとの既定数が上限内に収まる", () => {
    expect(getBudgetMapV2StarCount("desktop")).toBe(
      BUDGET_MAP_V2_DESKTOP_STAR_COUNT
    );
    expect(getBudgetMapV2StarCount("mobile")).toBe(
      BUDGET_MAP_V2_MOBILE_STAR_COUNT
    );
    expect(BUDGET_MAP_V2_DESKTOP_STAR_COUNT).toBeLessThanOrEqual(
      BUDGET_MAP_V2_MAX_STAR_COUNT
    );
    expect(BUDGET_MAP_V2_MOBILE_STAR_COUNT).toBeLessThanOrEqual(70);
  });

  it("確定デザインの範囲に収まる", () => {
    for (const star of createBudgetMapV2Stars(3, 200)) {
      expect(star.sizePx).toBeGreaterThanOrEqual(0.9);
      expect(star.sizePx).toBeLessThanOrEqual(2.6);
      expect(star.opacity).toBeGreaterThanOrEqual(0.12);
      expect(star.opacity).toBeLessThanOrEqual(0.67);
      expect(star.leftPercent).toBeGreaterThanOrEqual(0);
      expect(star.leftPercent).toBeLessThanOrEqual(100);
      expect(star.topPercent).toBeGreaterThanOrEqual(0);
      expect(star.topPercent).toBeLessThanOrEqual(100);
      expect(["cyan", "mint", "gold"]).toContain(star.tone);
    }
  });

  it("明滅するのは一部だけにとどめる", () => {
    const stars = createBudgetMapV2Stars(3, 200);
    const twinkling = stars.filter((star) => star.twinkles).length;

    expect(twinkling).toBeGreaterThan(0);
    expect(twinkling / stars.length).toBeLessThan(0.5);
  });

  it("0件を要求されたら空配列を返す", () => {
    expect(createBudgetMapV2Stars(3, 0)).toEqual([]);
  });
});

describe("createBudgetMapV2CoreDots", () => {
  const dots = createBudgetMapV2CoreDots({
    center: { x: 500, y: 325 },
    radius: 80,
    hues: [220, 350, 25, 265],
    seed: 31,
    count: 300,
  });

  it("指定した粒数を返し、seed 固定で再現する", () => {
    expect(dots).toHaveLength(300);
    expect(
      createBudgetMapV2CoreDots({
        center: { x: 500, y: 325 },
        radius: 80,
        hues: [220, 350, 25, 265],
        seed: 31,
        count: 300,
      })
    ).toEqual(dots);
  });

  it("すべての粒が球体の半径内に収まる", () => {
    for (const dot of dots) {
      const distance = Math.hypot(dot.x - 500, (dot.y - 325) / 0.97);
      expect(distance).toBeLessThanOrEqual(80.5);
    }
  });

  it("粒の半径と微動の指定が範囲内にある", () => {
    for (const dot of dots) {
      expect(dot.radius).toBeGreaterThanOrEqual(0.32);
      expect(dot.radius).toBeLessThanOrEqual(1.32);
      expect(dot.driftIndex).toBeGreaterThanOrEqual(1);
      expect(dot.driftIndex).toBeLessThanOrEqual(6);
      expect(dot.durationSeconds).toBeGreaterThanOrEqual(4.4);
      expect(dot.durationSeconds).toBeLessThanOrEqual(9);
    }
  });

  it("白い粒と分野色の粒が混ざる", () => {
    expect(dots.some((dot) => dot.hue === null)).toBe(true);
    expect(dots.some((dot) => dot.hue !== null)).toBe(true);
  });

  it("色相が空でも例外にならない", () => {
    expect(
      createBudgetMapV2CoreDots({
        center: { x: 0, y: 0 },
        radius: 10,
        hues: [],
        seed: 1,
        count: 10,
      })
    ).toEqual([]);
  });
});

describe("createBudgetMapV2Branches", () => {
  const branches = createBudgetMapV2Branches({
    nodes: [
      { x: 500, y: 179, ux: 0, uy: -1, hue: 220 },
      { x: 800, y: 325, ux: 1, uy: 0, hue: 350 },
    ],
    seed: 7,
  });

  it("ノードごとに3〜4本の枝を出す", () => {
    const firstDepthLines = branches.lines.filter((line) => line.depth === 1);

    expect(firstDepthLines.length).toBeGreaterThanOrEqual(6);
    expect(firstDepthLines.length).toBeLessThanOrEqual(8);
  });

  it("枝は球体と反対方向へ伸びる", () => {
    // 中心が真下にあるノードの枝は、ノードより上へ出る
    const upward = branches.lines.filter(
      (line) => line.depth === 1 && line.d.startsWith("M 5")
    );

    expect(upward.length).toBeGreaterThan(0);
  });

  it("枝先の粒はハローと本体の2つを持つ", () => {
    const haloCount = branches.dots.filter((dot) => dot.kind === "halo").length;
    const coreCount = branches.dots.filter((dot) => dot.kind === "core").length;

    expect(haloCount).toBe(coreCount);
  });

  it("seed 固定で再現する", () => {
    expect(
      createBudgetMapV2Branches({
        nodes: [{ x: 500, y: 179, ux: 0, uy: -1, hue: 220 }],
        seed: 7,
      })
    ).toEqual(
      createBudgetMapV2Branches({
        nodes: [{ x: 500, y: 179, ux: 0, uy: -1, hue: 220 }],
        seed: 7,
      })
    );
  });

  it("mobile 用の縮小率で枝が短くなる", () => {
    const full = createBudgetMapV2Branches({
      nodes: [{ x: 0, y: 0, ux: 1, uy: 0, hue: 220 }],
      seed: 7,
    });
    const half = createBudgetMapV2Branches({
      nodes: [{ x: 0, y: 0, ux: 1, uy: 0, hue: 220 }],
      seed: 7,
      scale: 0.5,
    });
    const reach = (branch: typeof full) =>
      Math.max(...branch.dots.map((dot) => Math.hypot(dot.x, dot.y)));

    expect(reach(half)).toBeLessThan(reach(full));
  });

  it("ノードが無ければ何も作らない", () => {
    expect(createBudgetMapV2Branches({ nodes: [], seed: 7 })).toEqual({
      lines: [],
      dots: [],
    });
  });
});

describe("createBudgetMapV2Satellites", () => {
  it("ノードごとに2〜3個の衛星を作る", () => {
    const satellites = createBudgetMapV2Satellites({
      nodes: [{ x: 100, y: 100, hue: 220 }],
      seed: 21,
      scale: 0.62,
    });

    expect(satellites.dots.length).toBeGreaterThanOrEqual(2);
    expect(satellites.dots.length).toBeLessThanOrEqual(3);
    expect(satellites.lines).toHaveLength(satellites.dots.length);
  });
});

describe("createBudgetMapV2FlowParticles", () => {
  it("線1本につき2粒を流す", () => {
    const particles = createBudgetMapV2FlowParticles({
      center: { x: 500, y: 325 },
      nodes: [
        { x: 500, y: 179, hue: 220, startTrim: 84, endTrim: 23 },
        { x: 800, y: 325, hue: 350, startTrim: 84, endTrim: 23 },
      ],
      seed: 41,
    });

    expect(particles).toHaveLength(4);
    expect(particles[0]?.path).toBe("M 500 241 L 500 202");
  });

  it("ノードが無ければ粒も作らない", () => {
    expect(
      createBudgetMapV2FlowParticles({
        center: { x: 0, y: 0 },
        nodes: [],
        seed: 41,
      })
    ).toEqual([]);
  });
});
