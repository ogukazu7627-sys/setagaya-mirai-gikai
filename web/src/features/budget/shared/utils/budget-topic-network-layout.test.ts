import { describe, expect, it } from "vitest";
import {
  getBudgetCategoryCenterY,
  getBudgetCategoryStageHeightRem,
  getBudgetCategoryTopicPositions,
  getBudgetTopicProgramPositions,
  getBudgetTopicStageClassName,
  getBudgetTopicStageHeightRem,
} from "./budget-topic-network-layout";

describe("budget topic network layout", () => {
  it("13事業を決定的かつ表示領域内へ配置する", () => {
    const first = getBudgetTopicProgramPositions(13, "desktop");
    const second = getBudgetTopicProgramPositions(13, "desktop");

    expect(first).toEqual(second);
    expect(first).toHaveLength(13);
    expect(
      first.every(
        (position) =>
          position.x >= 10 &&
          position.x <= 90 &&
          position.y >= 10 &&
          position.y <= 90
      )
    ).toBe(true);
    expect(new Set(first.map(({ x, y }) => `${x}:${y}`)).size).toBe(13);

    const viewport = { width: 1024, height: 800 };
    const programNode = { width: 144, height: 112 };
    const topicNode = { x: 50, y: 58, width: 288, height: 96 };
    expect(
      first.every(
        (position, index) =>
          !overlaps(position, topicNode, programNode, viewport) &&
          first
            .slice(index + 1)
            .every(
              (other) =>
                !overlaps(position, other, programNode, viewport, programNode)
            )
      )
    ).toBe(true);
  });

  it("mobileでは2列にして動的内容でレイアウトをずらさない", () => {
    const positions = getBudgetTopicProgramPositions(13, "mobile");

    expect(new Set(positions.map((position) => position.x))).toEqual(
      new Set([26, 74])
    );
    expect(positions.at(-1)?.y).toBeLessThan(100);
    expect(getBudgetTopicStageClassName(13, "mobile")).toBe(
      "budget-network-stage-topic-mobile"
    );
  });

  it("公開事業や課題が増えてもmobileの描画領域内へ配置する", () => {
    const programs = getBudgetTopicProgramPositions(31, "mobile");
    const topics = getBudgetCategoryTopicPositions(15, "mobile");

    expect(programs.every(({ y }) => y > 0 && y < 90)).toBe(true);
    expect(topics.every(({ y }) => y > 0 && y < 90)).toBe(true);
    expect(getBudgetTopicStageHeightRem(31, "mobile")).toBeGreaterThan(88);
    expect(getBudgetCategoryStageHeightRem(15, "mobile")).toBeGreaterThan(42);
    expect(getBudgetCategoryCenterY(15, "mobile")).toBeLessThan(
      topics[0]?.y ?? 0
    );
  });

  it("topicが1件ならcategoryの真下へ配置する", () => {
    expect(getBudgetCategoryTopicPositions(1, "desktop")).toEqual([
      { index: 0, x: 50, y: 73 },
    ]);
    expect(getBudgetCategoryTopicPositions(1, "mobile")).toEqual([
      { index: 0, x: 50, y: 66.667 },
    ]);
  });
});

function overlaps(
  left: { x: number; y: number },
  right: { x: number; y: number; width?: number; height?: number },
  leftSize: { width: number; height: number },
  viewport: { width: number; height: number },
  rightSize = { width: right.width ?? 0, height: right.height ?? 0 }
): boolean {
  const horizontalDistance =
    (Math.abs(left.x - right.x) * viewport.width) / 100;
  const verticalDistance = (Math.abs(left.y - right.y) * viewport.height) / 100;
  return (
    horizontalDistance < (leftSize.width + rightSize.width) / 2 &&
    verticalDistance < (leftSize.height + rightSize.height) / 2
  );
}
