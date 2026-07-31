import { describe, expect, it } from "vitest";
import {
  getBudgetCategoryTopicPositions,
  getBudgetTopicProgramPositions,
} from "./budget-topic-network-layout";

const programIds = Array.from({ length: 10 }, (_, index) => `bpi_${index}`);

describe("budget topic network layout", () => {
  it("10事業をIDから決定的なdesktop星系へ配置する", () => {
    const dimensions = { width: 1000, height: 700 };
    const first = getBudgetTopicProgramPositions(
      programIds,
      "desktop",
      dimensions
    );
    const second = getBudgetTopicProgramPositions(
      programIds,
      "desktop",
      dimensions
    );

    expect(first).toEqual(second);
    expect(first).toHaveLength(10);
    expect(new Set(first.map(({ x, y }) => `${x}:${y}`)).size).toBe(10);
    expect(
      first.every(
        (position) =>
          position.x >= 10 &&
          position.x <= 90 &&
          position.y >= 20 &&
          position.y <= 90
      )
    ).toBe(true);
  });

  it("入力順が同じなら再描画でも各IDの位置が変わらない", () => {
    const dimensions = { width: 1000, height: 700 };
    const positions = getBudgetTopicProgramPositions(
      programIds,
      "desktop",
      dimensions
    );
    const positionsById = new Map(
      positions.map((position) => [position.nodeId, position])
    );

    for (const position of getBudgetTopicProgramPositions(
      programIds,
      "desktop",
      dimensions
    )) {
      expect(position).toEqual(positionsById.get(position.nodeId));
    }
  });

  it("mobileでは10事業を2列5段に収める", () => {
    const dimensions = { width: 360, height: 850 };
    const positions = getBudgetTopicProgramPositions(
      programIds,
      "mobile",
      dimensions
    );

    expect(new Set(positions.map((position) => position.x))).toEqual(
      new Set([25, 75])
    );
    expect(positions).toHaveLength(10);
    expect(
      positions.every(
        (position) =>
          position.y > 35 &&
          position.y < 90 &&
          position.x >= 20 &&
          position.x <= 80
      )
    ).toBe(true);
  });

  it("課題が1件なら長い名称を置ける位置へ固定する", () => {
    expect(
      getBudgetCategoryTopicPositions(["topic-school-aging"], "desktop", {
        width: 1000,
        height: 620,
      })
    ).toEqual([
      {
        index: 0,
        nodeId: "topic-school-aging",
        x: 76,
        y: 56,
      },
    ]);
    expect(
      getBudgetCategoryTopicPositions(["topic-school-aging"], "mobile", {
        width: 360,
        height: 660,
      })
    ).toEqual([
      {
        index: 0,
        nodeId: "topic-school-aging",
        x: 50,
        y: 59.091,
      },
    ]);
  });
});
