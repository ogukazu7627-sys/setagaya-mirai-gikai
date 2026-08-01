import { describe, expect, it } from "vitest";
import type {
  BudgetExplorationCategory,
  BudgetExplorationTopic,
} from "../types/budget-exploration";
import {
  BUDGET_MAP_V2_ARRIVE_ZOOM,
  BUDGET_MAP_V2_BACK_MS,
  BUDGET_MAP_V2_DIVE_MS,
  BUDGET_MAP_V2_DIVE_ZOOM,
  BUDGET_MAP_V2_PROGRAM_MS,
  BUDGET_MAP_V2_PROGRAM_ZOOM,
  BUDGET_MAP_V2_SETTLE_MS,
  BUDGET_MAP_V2_WARP_SHELL_COUNT,
  createBudgetMapV2WarpShells,
  getBudgetMapV2CameraStep,
  getBudgetMapV2DiveFocus,
  getBudgetMapV2TransitionKind,
  getBudgetMapV2ViewDepth,
} from "./budget-map-v2-transition";

const topic: BudgetExplorationTopic = {
  id: "topic-1",
  slug: "school-facility-aging",
  name: "学校施設の老朽化への対応",
  shortDescription: "",
  topicKind: "problem",
  categorySlugs: ["education"],
  programs: [],
};

const category: BudgetExplorationCategory = {
  id: "category-1",
  slug: "education",
  name: "教育",
  shortDescription: "",
  sortOrder: 1,
  tone: "cyan",
  topics: [topic],
};

describe("getBudgetMapV2ViewDepth", () => {
  it("overview / category / topic の順に深くなる", () => {
    expect(getBudgetMapV2ViewDepth({ kind: "overview" })).toBe(0);
    expect(getBudgetMapV2ViewDepth({ kind: "category", category })).toBe(1);
    expect(getBudgetMapV2ViewDepth({ kind: "topic", category, topic })).toBe(2);
  });
});

describe("getBudgetMapV2TransitionKind", () => {
  it("深い階層へ進むならワープを伴う forward", () => {
    expect(
      getBudgetMapV2TransitionKind(
        { kind: "overview" },
        { kind: "category", category }
      )
    ).toBe("forward");
    expect(
      getBudgetMapV2TransitionKind(
        { kind: "category", category },
        { kind: "topic", category, topic }
      )
    ).toBe("forward");
  });

  it("浅い階層へ戻るならワープなしの back", () => {
    expect(
      getBudgetMapV2TransitionKind(
        { kind: "topic", category, topic },
        { kind: "category", category }
      )
    ).toBe("back");
    expect(
      getBudgetMapV2TransitionKind(
        { kind: "category", category },
        { kind: "overview" }
      )
    ).toBe("back");
  });

  it("同じ深さの分野切り替えは forward として扱う", () => {
    expect(
      getBudgetMapV2TransitionKind(
        { kind: "category", category },
        { kind: "category", category }
      )
    ).toBe("forward");
  });

  it("事業選択は program", () => {
    expect(
      getBudgetMapV2TransitionKind(
        { kind: "topic", category, topic },
        { kind: "program", budgetProgramIdentityId: "identity-1" }
      )
    ).toBe("program");
  });
});

describe("getBudgetMapV2DiveFocus", () => {
  it("中心から目的地の方向へ 74px 進んだ点を返す", () => {
    expect(
      getBudgetMapV2DiveFocus({ x: 500, y: 325 }, { x: 500, y: 179 })
    ).toEqual({ x: 500, y: 251 });
  });

  it("目的地が中心と同じでも例外にならない", () => {
    const focus = getBudgetMapV2DiveFocus({ x: 10, y: 10 }, { x: 10, y: 10 });

    expect(Number.isFinite(focus.x)).toBe(true);
    expect(Number.isFinite(focus.y)).toBe(true);
  });
});

describe("getBudgetMapV2CameraStep", () => {
  const restFocus = { x: 500, y: 310 };
  const diveFocus = { x: 500, y: 251 };

  it("dive では目的地側の縁へ強く寄る", () => {
    const step = getBudgetMapV2CameraStep({
      phase: "dive",
      kind: "forward",
      restFocus,
      diveFocus,
      reduceMotion: false,
    });

    expect(step).toMatchObject({
      focus: diveFocus,
      zoom: BUDGET_MAP_V2_DIVE_ZOOM,
      durationMs: BUDGET_MAP_V2_DIVE_MS,
    });
  });

  it("warp 中はカメラを動かさず寄った位置を保つ", () => {
    const step = getBudgetMapV2CameraStep({
      phase: "warp",
      kind: "forward",
      restFocus,
      diveFocus,
      reduceMotion: false,
    });

    expect(step.durationMs).toBe(0);
    expect(step.zoom).toBe(BUDGET_MAP_V2_DIVE_ZOOM);
  });

  it("arrive は少し引いた位置から始める", () => {
    const step = getBudgetMapV2CameraStep({
      phase: "arrive",
      kind: "forward",
      restFocus,
      diveFocus,
      reduceMotion: false,
    });

    expect(step).toMatchObject({
      focus: restFocus,
      zoom: BUDGET_MAP_V2_ARRIVE_ZOOM,
      durationMs: 0,
    });
  });

  it("idle では等倍へ引き戻す", () => {
    const step = getBudgetMapV2CameraStep({
      phase: "idle",
      kind: null,
      restFocus,
      diveFocus: null,
      reduceMotion: false,
    });

    expect(step).toMatchObject({
      focus: restFocus,
      zoom: 1,
      durationMs: BUDGET_MAP_V2_SETTLE_MS,
    });
  });

  it("戻りはワープなしで前画面へ引く", () => {
    const step = getBudgetMapV2CameraStep({
      phase: "dive",
      kind: "back",
      restFocus,
      diveFocus,
      reduceMotion: false,
    });

    expect(step).toMatchObject({
      focus: restFocus,
      zoom: 1,
      durationMs: BUDGET_MAP_V2_BACK_MS,
    });
  });

  it("事業選択はそのノードへ短く寄る", () => {
    const step = getBudgetMapV2CameraStep({
      phase: "dive",
      kind: "program",
      restFocus,
      diveFocus,
      reduceMotion: false,
    });

    expect(step).toMatchObject({
      focus: diveFocus,
      zoom: BUDGET_MAP_V2_PROGRAM_ZOOM,
      durationMs: BUDGET_MAP_V2_PROGRAM_MS,
    });
  });

  it("reduced-motion ではどのフェーズでも1フレームで着地する", () => {
    for (const phase of ["idle", "dive", "warp", "arrive"] as const) {
      const step = getBudgetMapV2CameraStep({
        phase,
        kind: "forward",
        restFocus,
        diveFocus,
        reduceMotion: true,
      });

      expect(step.durationMs).toBe(0);
      expect(step.zoom).toBe(1);
      expect(step.focus).toEqual(restFocus);
    }
  });

  it("dive の目的地が無い場合は待機位置へ落とす", () => {
    const step = getBudgetMapV2CameraStep({
      phase: "dive",
      kind: "forward",
      restFocus,
      diveFocus: null,
      reduceMotion: false,
    });

    expect(step.focus).toEqual(restFocus);
    expect(step.zoom).toBe(1);
  });
});

describe("createBudgetMapV2WarpShells", () => {
  it("シェル7枚を確定デザインの値で作る", () => {
    const shells = createBudgetMapV2WarpShells();

    expect(shells).toHaveLength(BUDGET_MAP_V2_WARP_SHELL_COUNT);
    expect(shells[0]).toMatchObject({
      sizePx: 380,
      fromDegrees: 0,
      spin: "a",
      durationMs: 480,
      delayMs: 0,
    });
    expect(shells[6]).toMatchObject({
      sizePx: 1880,
      fromDegrees: 138,
      spin: "a",
      durationMs: 636,
      delayMs: 84,
    });
  });

  it("偶数と奇数のシェルで回転方向を分ける", () => {
    const shells = createBudgetMapV2WarpShells();

    expect(shells.filter((shell) => shell.spin === "a")).toHaveLength(4);
    expect(shells.filter((shell) => shell.spin === "b")).toHaveLength(3);
  });
});
