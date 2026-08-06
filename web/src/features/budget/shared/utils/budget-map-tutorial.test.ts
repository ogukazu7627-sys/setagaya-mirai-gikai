import { describe, expect, it } from "vitest";
import {
  BUDGET_MAP_TUTORIAL_HOLD_MS,
  BUDGET_MAP_TUTORIAL_HOLD_REDUCED_MS,
  BUDGET_MAP_TUTORIAL_LAST_STEP_INDEX,
  BUDGET_MAP_TUTORIAL_STEPS,
  clampStepIndex,
  getBudgetMapTutorialAdvance,
  getBudgetMapTutorialCaretDirection,
  getBudgetMapTutorialHoldMs,
  getBudgetMapTutorialMaskImage,
  getBudgetMapTutorialPreviousScene,
  getBudgetMapTutorialStep,
  isBudgetMapTutorialLastStep,
  shouldAutoOpenBudgetMapTutorial,
} from "./budget-map-tutorial";

describe("BUDGET_MAP_TUTORIAL_STEPS", () => {
  it("4ステップを持つ", () => {
    expect(BUDGET_MAP_TUTORIAL_STEPS).toHaveLength(4);
    expect(BUDGET_MAP_TUTORIAL_LAST_STEP_INDEX).toBe(3);
  });

  it("見せている画面が overview → category → topic と進む", () => {
    expect(BUDGET_MAP_TUTORIAL_STEPS.map((step) => step.scene)).toEqual([
      "overview",
      "category",
      "topic",
      "topic",
    ]);
  });

  it("step3で丸の大きさが金額の相対的な大小だと伝える", () => {
    expect(BUDGET_MAP_TUTORIAL_STEPS[2]?.body).toContain(
      "この画面内での金額の相対的な大小"
    );
  });

  it("スポットライトは画面内に収まり、大きすぎない", () => {
    for (const step of BUDGET_MAP_TUTORIAL_STEPS) {
      for (const mode of ["desktop", "mobile"] as const) {
        const spotlight = step.spotlight[mode];
        expect(spotlight.xPercent).toBeGreaterThan(0);
        expect(spotlight.xPercent).toBeLessThanOrEqual(100);
        expect(spotlight.yPercent).toBeGreaterThan(0);
        expect(spotlight.yPercent).toBeLessThanOrEqual(100);
        expect(spotlight.radiusXPx).toBeGreaterThan(0);
        expect(spotlight.radiusYPx).toBeGreaterThan(0);
        // 横に広い対象でも縦を余分に覆わないよう、縦半径は横半径以下
        expect(spotlight.radiusYPx).toBeLessThanOrEqual(spotlight.radiusXPx);
      }
    }
  });

  it("見出しと本文が空でない", () => {
    for (const step of BUDGET_MAP_TUTORIAL_STEPS) {
      expect(step.title.trim()).not.toBe("");
      expect(step.body.trim()).not.toBe("");
    }
  });
});

describe("clampStepIndex", () => {
  it("範囲外を丸める", () => {
    expect(clampStepIndex(-3)).toBe(0);
    expect(clampStepIndex(0)).toBe(0);
    expect(clampStepIndex(3)).toBe(3);
    expect(clampStepIndex(9)).toBe(3);
    expect(clampStepIndex(1.7)).toBe(1);
  });
});

describe("getBudgetMapTutorialStep", () => {
  it("インデックスに対応するステップを返す", () => {
    expect(getBudgetMapTutorialStep(0).title).toBe("大分類をタップ");
    expect(getBudgetMapTutorialStep(3).title).toBe("検索からも探せる");
  });

  it("範囲外でも例外にならない", () => {
    expect(getBudgetMapTutorialStep(99).index).toBe(3);
  });
});

describe("isBudgetMapTutorialLastStep", () => {
  it("最終ステップを判定する", () => {
    expect(isBudgetMapTutorialLastStep(2)).toBe(false);
    expect(isBudgetMapTutorialLastStep(3)).toBe(true);
  });
});

describe("getBudgetMapTutorialAdvance", () => {
  it("step1・step2は実際の画面遷移を走らせる", () => {
    expect(getBudgetMapTutorialAdvance(0)).toEqual({ kind: "select-category" });
    expect(getBudgetMapTutorialAdvance(1)).toEqual({ kind: "select-topic" });
  });

  it("step3は遷移せず次のステップを出す", () => {
    expect(getBudgetMapTutorialAdvance(2)).toEqual({ kind: "next-step" });
  });

  it("step4は保存して閉じる", () => {
    expect(getBudgetMapTutorialAdvance(3)).toEqual({ kind: "finish" });
  });
});

describe("getBudgetMapTutorialPreviousScene", () => {
  it("前のステップの画面へ巻き戻す", () => {
    expect(getBudgetMapTutorialPreviousScene(1)).toBe("overview");
    expect(getBudgetMapTutorialPreviousScene(2)).toBe("category");
    expect(getBudgetMapTutorialPreviousScene(3)).toBe("topic");
  });

  it("最初のステップからは戻れない", () => {
    expect(getBudgetMapTutorialPreviousScene(0)).toBeNull();
  });
});

describe("getBudgetMapTutorialMaskImage", () => {
  it("楕円のスポットライトを作る", () => {
    const mask = getBudgetMapTutorialMaskImage({
      xPercent: 50,
      yPercent: 29,
      radiusXPx: 104,
      radiusYPx: 90,
    });

    expect(mask).toContain("ellipse 104px 90px at 50% 29%");
    expect(mask).toContain("rgba(0,0,0,0) 0%");
  });
});

describe("getBudgetMapTutorialCaretDirection", () => {
  it("三角はスポットライトの方角を向く", () => {
    expect(getBudgetMapTutorialCaretDirection("bottom")).toBe("up");
    expect(getBudgetMapTutorialCaretDirection("left")).toBe("right");
  });
});

describe("getBudgetMapTutorialHoldMs", () => {
  it("着地の直後にカードを戻す", () => {
    expect(getBudgetMapTutorialHoldMs(false)).toBe(BUDGET_MAP_TUTORIAL_HOLD_MS);
  });

  it("reduced-motion では短く待つ", () => {
    expect(getBudgetMapTutorialHoldMs(true)).toBe(
      BUDGET_MAP_TUTORIAL_HOLD_REDUCED_MS
    );
  });
});

describe("shouldAutoOpenBudgetMapTutorial", () => {
  it("未ログインは localStorage で判定する", () => {
    expect(
      shouldAutoOpenBudgetMapTutorial({
        signedIn: false,
        tutorialSeen: false,
        storedValue: null,
      })
    ).toBe(true);
    expect(
      shouldAutoOpenBudgetMapTutorial({
        signedIn: false,
        tutorialSeen: false,
        storedValue: "done",
      })
    ).toBe(false);
  });

  it("ログイン済みは親から渡された設定で判定する", () => {
    expect(
      shouldAutoOpenBudgetMapTutorial({
        signedIn: true,
        tutorialSeen: true,
        storedValue: null,
      })
    ).toBe(false);
    expect(
      shouldAutoOpenBudgetMapTutorial({
        signedIn: true,
        tutorialSeen: false,
        storedValue: "done",
      })
    ).toBe(true);
  });
});
