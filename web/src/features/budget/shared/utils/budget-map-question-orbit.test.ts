import { describe, expect, it } from "vitest";
import {
  BUDGET_MAP_QUESTION_LIMIT,
  BUDGET_MAP_QUESTION_Z_INDEX,
  type BudgetMapQuestion,
  createBudgetMapQuestionOrbits,
  formatBudgetMapQuestionMember,
  getBudgetMapQuestionMarkOffset,
  getBudgetMapQuestionScale,
  selectBudgetMapQuestions,
} from "./budget-map-question-orbit";

function createQuestion(index: number): BudgetMapQuestion {
  return {
    questionId: `question-${index}`,
    text: `質問${index}`,
    member: `議員${index}`,
    photo: `/icons/councilors/member-${index}.jpg`,
  };
}

const center = { x: 500, y: 325 };

describe("getBudgetMapQuestionScale", () => {
  it("モバイルでは縮める", () => {
    expect(getBudgetMapQuestionScale("desktop")).toBe(1);
    expect(getBudgetMapQuestionScale("mobile")).toBe(0.6);
  });
});

describe("formatBudgetMapQuestionMember", () => {
  it("必ず「議員」を添える", () => {
    expect(formatBudgetMapQuestionMember("くろだあいこ")).toBe(
      "くろだあいこ議員"
    );
  });

  it("既に付いている場合は重ねない", () => {
    expect(formatBudgetMapQuestionMember("くろだあいこ議員")).toBe(
      "くろだあいこ議員"
    );
  });

  it("前後の空白を落とす", () => {
    expect(formatBudgetMapQuestionMember("  世田谷太郎  ")).toBe(
      "世田谷太郎議員"
    );
  });

  it("名前が空なら何も付けない", () => {
    expect(formatBudgetMapQuestionMember("")).toBe("");
    expect(formatBudgetMapQuestionMember("   ")).toBe("");
  });
});

describe("getBudgetMapQuestionMarkOffset", () => {
  it("バッジを顔の円に外接させる", () => {
    const avatarPx = 34;
    const markPx = 15;
    const offset = getBudgetMapQuestionMarkOffset(avatarPx, markPx);

    // right/bottom は負方向のオフセットとして使うため、中心間距離から逆算する
    const centerX = avatarPx / 2 + offset.rightPx - markPx / 2;
    const centerY = avatarPx / 2 + offset.bottomPx - markPx / 2;
    const distance = Math.hypot(centerX, centerY);

    // 中心間距離 = 顔半径 + バッジ半径 なら、円同士がちょうど外接する
    expect(distance).toBeCloseTo((avatarPx + markPx) / 2, 0);
  });

  it("水平から下向き20度の方向に置く", () => {
    const offset = getBudgetMapQuestionMarkOffset(34, 15);
    const centerX = 34 / 2 + offset.rightPx - 15 / 2;
    const centerY = 34 / 2 + offset.bottomPx - 15 / 2;
    const degrees = (Math.atan2(centerY, centerX) * 180) / Math.PI;

    expect(degrees).toBeCloseTo(20, 0);
  });

  it("モバイル寸法でも外接する", () => {
    const avatarPx = Math.round(34 * 0.6);
    const markPx = Math.round(15 * 0.6);
    const offset = getBudgetMapQuestionMarkOffset(avatarPx, markPx);
    const centerX = avatarPx / 2 + offset.rightPx - markPx / 2;
    const centerY = avatarPx / 2 + offset.bottomPx - markPx / 2;

    expect(Math.hypot(centerX, centerY)).toBeCloseTo(
      (avatarPx + markPx) / 2,
      0
    );
  });
});

describe("selectBudgetMapQuestions", () => {
  it("上限まで先頭から取る", () => {
    const questions = [0, 1, 2, 3].map(createQuestion);

    expect(selectBudgetMapQuestions(questions)).toHaveLength(
      BUDGET_MAP_QUESTION_LIMIT
    );
    expect(selectBudgetMapQuestions(questions)[0]?.questionId).toBe(
      "question-0"
    );
  });

  it("0件ならダミーで埋めない", () => {
    expect(selectBudgetMapQuestions([])).toEqual([]);
  });
});

describe("createBudgetMapQuestionOrbits", () => {
  const questions = [0, 1].map(createQuestion);

  it("質問が0件なら衛星を作らない", () => {
    expect(
      createBudgetMapQuestionOrbits({
        center,
        questions: [],
        seed: 13,
        mode: "desktop",
      })
    ).toEqual([]);
  });

  it("上限を超える質問は載せない", () => {
    const orbits = createBudgetMapQuestionOrbits({
      center,
      questions: [0, 1, 2, 3].map(createQuestion),
      seed: 13,
      mode: "desktop",
    });

    expect(orbits).toHaveLength(BUDGET_MAP_QUESTION_LIMIT);
  });

  it("左右の側面へ振り分け、中心の真上・真下を通らせない", () => {
    const orbits = createBudgetMapQuestionOrbits({
      center,
      questions,
      seed: 13,
      mode: "desktop",
    });

    expect(orbits[0]?.originX).toBe(304);
    expect(orbits[1]?.originX).toBe(696);
    for (const orbit of orbits) {
      expect(Math.abs(orbit.originX - center.x)).toBeGreaterThan(150);
    }
  });

  it("seed 固定で同じ軌道になる", () => {
    expect(
      createBudgetMapQuestionOrbits({
        center,
        questions,
        seed: 13,
        mode: "desktop",
      })
    ).toEqual(
      createBudgetMapQuestionOrbits({
        center,
        questions,
        seed: 13,
        mode: "desktop",
      })
    );
  });

  it("確定デザインの範囲に収まる", () => {
    const orbits = createBudgetMapQuestionOrbits({
      center,
      questions,
      seed: 13,
      mode: "desktop",
    });

    for (const orbit of orbits) {
      expect(orbit.amplitudeXPx).toBeGreaterThanOrEqual(66);
      expect(orbit.amplitudeXPx).toBeLessThanOrEqual(82);
      expect(orbit.amplitudeYPx).toBeGreaterThanOrEqual(74);
      expect(orbit.amplitudeYPx).toBeLessThanOrEqual(92);
      expect(orbit.durationXSeconds).toBeGreaterThanOrEqual(27);
      expect(orbit.durationXSeconds).toBeLessThanOrEqual(35);
      expect(orbit.bobDurationSeconds).toBeGreaterThanOrEqual(3.6);
      expect(orbit.bobDurationSeconds).toBeLessThanOrEqual(5);
      expect(orbit.avatarPx).toBe(34);
      expect(orbit.markPx).toBe(15);
    }
  });

  it("Y の周期は X の 0.31 倍で、位相を負の遅延でずらす", () => {
    const orbits = createBudgetMapQuestionOrbits({
      center,
      questions,
      seed: 13,
      mode: "desktop",
    });

    for (const orbit of orbits) {
      expect(orbit.durationYSeconds).toBeCloseTo(
        orbit.durationXSeconds * 0.31,
        1
      );
      expect(orbit.delaySeconds).toBeLessThan(0);
    }
    expect(orbits[0]?.delaySeconds).not.toBe(orbits[1]?.delaySeconds);
  });

  it("モバイルでは全体を縮める", () => {
    const orbits = createBudgetMapQuestionOrbits({
      center: { x: 180, y: 300 },
      questions,
      seed: 13,
      mode: "mobile",
    });

    expect(orbits[0]?.avatarPx).toBe(20);
    expect(orbits[0]?.markPx).toBe(9);
    // アイコンは最小7pxを下回らない
    expect(orbits[0]?.markIconPx).toBeGreaterThanOrEqual(7);
  });

  it("質問の内容をそのまま持ち回る", () => {
    const orbits = createBudgetMapQuestionOrbits({
      center,
      questions,
      seed: 13,
      mode: "desktop",
    });

    expect(orbits[0]?.question).toEqual(questions[0]);
  });

  it("静止時はラベルの背面、開いたら最前面へ置く", () => {
    expect(BUDGET_MAP_QUESTION_Z_INDEX.idle).toBeLessThan(20);
    expect(BUDGET_MAP_QUESTION_Z_INDEX.open).toBeGreaterThan(20);
  });
});
