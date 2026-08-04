import { describe, expect, it } from "vitest";
import {
  BUDGET_MAP_V2_CORE,
  BUDGET_MAP_V2_DEFAULT_HUE,
  getBudgetMapV2AmountTier,
  getBudgetMapV2CameraFocus,
  getBudgetMapV2CategoryHue,
  getBudgetMapV2CategoryTopicNodes,
  getBudgetMapV2DistantNodes,
  getBudgetMapV2OverviewRing,
  getBudgetMapV2ProgramDiameter,
  getBudgetMapV2ProgramNodes,
  getBudgetMapV2RingNodes,
  getBudgetMapV2SpokePath,
  getBudgetMapV2WorldDimensions,
  getUnitVector,
} from "./budget-map-v2-geometry";

describe("getBudgetMapV2CategoryHue", () => {
  it("10分野それぞれに確定デザインの色相を返す", () => {
    expect(getBudgetMapV2CategoryHue("education")).toBe(220);
    expect(getBudgetMapV2CategoryHue("child-rearing")).toBe(350);
    expect(getBudgetMapV2CategoryHue("welfare")).toBe(25);
    expect(getBudgetMapV2CategoryHue("urban-development")).toBe(265);
    expect(getBudgetMapV2CategoryHue("disaster-prevention")).toBe(60);
    expect(getBudgetMapV2CategoryHue("administration-finance")).toBe(242);
    expect(getBudgetMapV2CategoryHue("culture-sports")).toBe(320);
    expect(getBudgetMapV2CategoryHue("industry")).toBe(100);
    expect(getBudgetMapV2CategoryHue("environment")).toBe(152);
    expect(getBudgetMapV2CategoryHue("daily-life")).toBe(188);
  });

  it("未知の分野でも既定色相を返して描画を止めない", () => {
    expect(getBudgetMapV2CategoryHue("unknown-category")).toBe(
      BUDGET_MAP_V2_DEFAULT_HUE
    );
  });
});

describe("getBudgetMapV2RingNodes", () => {
  it("10件なら36度間隔で1周する", () => {
    const nodes = getBudgetMapV2RingNodes(10, { x: 500, y: 325 }, 300, 146);

    expect(nodes).toHaveLength(10);
    // i=0 は真上
    expect(nodes[0]).toMatchObject({ x: 500, y: 179 });
    // i=5 は真下
    expect(nodes[5]).toMatchObject({ x: 500, y: 471 });
  });

  it("件数が10以外でも等間隔で1周に収める", () => {
    const nodes = getBudgetMapV2RingNodes(4, { x: 0, y: 0 }, 100, 100);

    expect(nodes).toHaveLength(4);
    expect(nodes[0]).toMatchObject({ x: 0, y: -100 });
    expect(nodes[1]).toMatchObject({ x: 100, y: 0 });
    expect(nodes[2]).toMatchObject({ x: 0, y: 100 });
    expect(nodes[3]).toMatchObject({ x: -100, y: 0 });
  });

  it("0件なら空配列を返す", () => {
    expect(getBudgetMapV2RingNodes(0, { x: 0, y: 0 }, 100, 100)).toEqual([]);
  });

  it("ラベルは中心から放射方向へ逃がす", () => {
    const nodes = getBudgetMapV2RingNodes(4, { x: 0, y: 0 }, 100, 100, 118);

    expect(nodes[0]?.labelOffsetX).toBe(0);
    expect(nodes[0]?.labelOffsetY).toBe(-118);
    expect(nodes[1]?.labelOffsetX).toBe(118);
    expect(nodes[1]?.labelOffsetY).toBe(0);
  });
});

describe("getBudgetMapV2OverviewRing", () => {
  it("desktop は中心 (500,325) の楕円リングに載せる", () => {
    const nodes = getBudgetMapV2OverviewRing(10, "desktop");

    expect(nodes[0]).toMatchObject({ x: 500, y: 179 });
    expect(nodes).toHaveLength(10);
  });

  it("desktopの真下の分野は中心見出しを避け、ラベルをアイコンへ近づける", () => {
    const nodes = getBudgetMapV2OverviewRing(10, "desktop");

    expect(nodes[5]).toMatchObject({
      x: 500,
      y: 505,
      labelOffsetX: 0,
      labelOffsetY: 58,
    });
  });

  it("mobile は縦長のリングになる", () => {
    const nodes = getBudgetMapV2OverviewRing(10, "mobile");

    expect(nodes[0]).toMatchObject({ x: 180, y: 120 });
    expect(nodes).toHaveLength(10);
  });

  it("全ノードが world の内側に収まる", () => {
    for (const mode of ["desktop", "mobile"] as const) {
      const world = getBudgetMapV2WorldDimensions("overview", mode);
      for (const node of getBudgetMapV2OverviewRing(10, mode)) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x).toBeLessThanOrEqual(world.width);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeLessThanOrEqual(world.height);
      }
    }
  });
});

describe("getBudgetMapV2CategoryTopicNodes", () => {
  it("課題1件なら中心コアの真上へ置く", () => {
    const nodes = getBudgetMapV2CategoryTopicNodes(1, "desktop");

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ x: 500, y: 187, ux: 0, uy: -1 });
  });

  it("mobile の課題1件はコアの真上 154px", () => {
    const nodes = getBudgetMapV2CategoryTopicNodes(1, "mobile");

    expect(nodes[0]).toMatchObject({ x: 180, y: 146 });
  });

  it("複数件なら等角リングに載せる", () => {
    const nodes = getBudgetMapV2CategoryTopicNodes(3, "desktop");

    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toMatchObject({ x: 500, y: 187 });
    expect(new Set(nodes.map((node) => `${node.x},${node.y}`)).size).toBe(3);
  });

  it("課題0件なら空配列を返す", () => {
    expect(getBudgetMapV2CategoryTopicNodes(0, "desktop")).toEqual([]);
  });
});

describe("getBudgetMapV2ProgramNodes", () => {
  it("desktop は 18度始まりの楕円リングに10件を並べる", () => {
    const nodes = getBudgetMapV2ProgramNodes(10, "desktop");

    expect(nodes).toHaveLength(10);
    // t = 18°, RX 355 / RY 215, 中心 (500,365)
    expect(nodes[0]?.x).toBeCloseTo(609.7, 0);
    expect(nodes[0]?.y).toBeCloseTo(160.5, 0);
  });

  it("mobile は2列グリッドの固定スロットを使う", () => {
    const nodes = getBudgetMapV2ProgramNodes(6, "mobile");

    expect(nodes.map((node) => ({ x: node.x, y: node.y }))).toEqual([
      { x: 96, y: 262 },
      { x: 264, y: 262 },
      { x: 96, y: 402 },
      { x: 264, y: 402 },
      { x: 96, y: 542 },
      { x: 264, y: 542 },
    ]);
  });

  it("件数が少なくても等間隔で1周に収める", () => {
    const nodes = getBudgetMapV2ProgramNodes(3, "desktop");

    expect(nodes).toHaveLength(3);
    expect(new Set(nodes.map((node) => `${node.x},${node.y}`)).size).toBe(3);
  });

  it("0件なら空配列を返す", () => {
    expect(getBudgetMapV2ProgramNodes(0, "desktop")).toEqual([]);
  });
});

describe("getBudgetMapV2DistantNodes", () => {
  it("他分野の件数ぶんだけ遠景の座標を返す", () => {
    expect(getBudgetMapV2DistantNodes(9)).toHaveLength(9);
    expect(getBudgetMapV2DistantNodes(0)).toEqual([]);
  });
});

describe("getBudgetMapV2SpokePath", () => {
  it("両端をトリムした直線を返す", () => {
    const path = getBudgetMapV2SpokePath(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      20,
      10
    );

    expect(path).toBe("M 20 0 L 90 0");
  });

  it("始点と終点が同一でも例外にならない", () => {
    expect(
      getBudgetMapV2SpokePath({ x: 10, y: 10 }, { x: 10, y: 10 }, 5, 5)
    ).toBe("M 10 10 L 10 10");
  });
});

describe("getBudgetMapV2AmountTier", () => {
  const amounts = [4_210_841, 4_140_518, 1_517_614, 292_171, 29_593];

  it("最大額の40%以上は high", () => {
    expect(getBudgetMapV2AmountTier(4_210_841, amounts)).toBe("high");
    expect(getBudgetMapV2AmountTier(1_684_337, amounts)).toBe("high");
  });

  it("最大額の10%以上40%未満は mid", () => {
    expect(getBudgetMapV2AmountTier(1_517_614, amounts)).toBe("mid");
    expect(getBudgetMapV2AmountTier(421_085, amounts)).toBe("mid");
  });

  it("最大額の10%未満は low", () => {
    expect(getBudgetMapV2AmountTier(292_171, amounts)).toBe("low");
    expect(getBudgetMapV2AmountTier(29_593, amounts)).toBe("low");
  });

  it("0円の事業も low として扱い、除外しない", () => {
    expect(getBudgetMapV2AmountTier(0, amounts)).toBe("low");
  });

  it("表示中の事業がすべて0円なら low に落とす", () => {
    expect(getBudgetMapV2AmountTier(0, [0, 0, 0])).toBe("low");
  });

  it("表示件数が1件なら high になる", () => {
    expect(getBudgetMapV2AmountTier(1000, [1000])).toBe("high");
  });
});

describe("getBudgetMapV2ProgramDiameter", () => {
  it("金額連動オンなら3段の直径を返す", () => {
    expect(getBudgetMapV2ProgramDiameter("high", "desktop", true)).toBe(56);
    expect(getBudgetMapV2ProgramDiameter("mid", "desktop", true)).toBe(44);
    expect(getBudgetMapV2ProgramDiameter("low", "desktop", true)).toBe(34);
    expect(getBudgetMapV2ProgramDiameter("high", "mobile", true)).toBe(48);
  });

  it("金額連動オフなら一定サイズになる", () => {
    expect(getBudgetMapV2ProgramDiameter("high", "desktop", false)).toBe(42);
    expect(getBudgetMapV2ProgramDiameter("low", "mobile", false)).toBe(40);
  });
});

describe("getUnitVector", () => {
  it("単位ベクトルを返す", () => {
    expect(getUnitVector({ x: 0, y: 0 }, { x: 0, y: -10 })).toEqual({
      ux: 0,
      uy: -1,
    });
  });

  it("同一点でもゼロ除算にならない", () => {
    const vector = getUnitVector({ x: 5, y: 5 }, { x: 5, y: 5 });

    expect(Number.isFinite(vector.ux)).toBe(true);
    expect(Number.isFinite(vector.uy)).toBe(true);
  });
});

describe("world とカメラ焦点", () => {
  it("画面ごとの world 寸法を返す", () => {
    expect(getBudgetMapV2WorldDimensions("overview", "desktop")).toEqual({
      width: 1000,
      height: 620,
    });
    expect(getBudgetMapV2WorldDimensions("topic", "desktop")).toEqual({
      width: 1000,
      height: 700,
    });
    expect(getBudgetMapV2WorldDimensions("category", "mobile")).toEqual({
      width: 360,
      height: 660,
    });
  });

  it("カメラ焦点は world の内側にある", () => {
    for (const mode of ["desktop", "mobile"] as const) {
      for (const kind of ["overview", "category", "topic"] as const) {
        const focus = getBudgetMapV2CameraFocus(kind, mode);
        const world = getBudgetMapV2WorldDimensions(kind, mode);
        expect(focus.x).toBeGreaterThan(0);
        expect(focus.x).toBeLessThan(world.width);
        expect(focus.y).toBeGreaterThan(0);
        expect(focus.y).toBeLessThan(world.height);
      }
    }
  });

  it("中心コアは world の内側にある", () => {
    for (const mode of ["desktop", "mobile"] as const) {
      for (const kind of ["overview", "category", "topic"] as const) {
        const core = BUDGET_MAP_V2_CORE[mode][kind];
        const world = getBudgetMapV2WorldDimensions(kind, mode);
        expect(core.center.x).toBeGreaterThan(0);
        expect(core.center.x).toBeLessThan(world.width);
        expect(core.center.y).toBeGreaterThan(0);
        expect(core.center.y).toBeLessThan(world.height);
      }
    }
  });
});
