import { describe, expect, it } from "vitest";
import {
  BUDGET_NETWORK_TOPICS,
  getBudgetNetworkLayout,
} from "./budget-network-layout";

const requiredLabels = [
  "教育",
  "子育て",
  "福祉",
  "まちづくり",
  "防災",
  "行財政",
  "文化・スポーツ",
  "産業",
  "環境問題",
  "暮らし",
];

type Rect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

describe("budget network layout", () => {
  it("contains exactly the ten public entry categories", () => {
    expect(BUDGET_NETWORK_TOPICS.map((topic) => topic.label)).toEqual(
      requiredLabels
    );
  });

  it.each([
    "mobile",
    "desktop",
  ] as const)("keeps every %s point inside the stable coordinate system", (mode) => {
    const layout = getBudgetNetworkLayout(mode);
    expect(layout.topics).toHaveLength(10);
    expect(layout.decorations.length).toBeGreaterThan(0);
    expect(layout.edges.length).toBeGreaterThan(0);

    for (const point of [...layout.topics, ...layout.decorations]) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(100);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(100);
    }
  });

  it("returns the same layout on every run", () => {
    expect(getBudgetNetworkLayout("desktop")).toEqual(
      getBudgetNetworkLayout("desktop")
    );
  });

  it.each([
    {
      mode: "mobile",
      stageWidth: 320,
      stageHeight: 480,
      topicWidth: 96,
      titleBottom: 145,
    },
    {
      mode: "desktop",
      stageWidth: 1180,
      stageHeight: 558,
      topicWidth: 112,
      titleBottom: 136,
    },
  ] as const)("keeps $mode topics readable, separated, and inside the clipped stage", ({
    mode,
    stageWidth,
    stageHeight,
    topicWidth,
    titleBottom,
  }) => {
    const focusMargin = 5;
    const topicHeight = 64;
    const titleRect: Rect = {
      left: 0,
      right: mode === "mobile" ? stageWidth : 560,
      top: 0,
      bottom: titleBottom,
    };
    const rects = getBudgetNetworkLayout(mode).topics.map((topic) => ({
      id: topic.id,
      rect: getTopicRect(
        topic.x,
        topic.y,
        stageWidth,
        stageHeight,
        topicWidth,
        topicHeight
      ),
    }));

    for (const { rect } of rects) {
      expect(rect.left).toBeGreaterThanOrEqual(focusMargin);
      expect(rect.right).toBeLessThanOrEqual(stageWidth - focusMargin);
      expect(rect.top).toBeGreaterThanOrEqual(focusMargin);
      expect(rect.bottom).toBeLessThanOrEqual(stageHeight - focusMargin);
      expect(rectsOverlap(rect, titleRect)).toBe(false);
    }

    for (const [index, topic] of rects.entries()) {
      for (const otherTopic of rects.slice(index + 1)) {
        expect(
          rectsOverlap(topic.rect, otherTopic.rect),
          `${topic.id} overlaps ${otherTopic.id}`
        ).toBe(false);
      }
    }
  });
});

function getTopicRect(
  xPercent: number,
  yPercent: number,
  stageWidth: number,
  stageHeight: number,
  topicWidth: number,
  topicHeight: number
): Rect {
  const centerX = (xPercent / 100) * stageWidth;
  const centerY = (yPercent / 100) * stageHeight;

  return {
    left: centerX - topicWidth / 2,
    right: centerX + topicWidth / 2,
    top: centerY - topicHeight / 2,
    bottom: centerY + topicHeight / 2,
  };
}

function rectsOverlap(first: Rect, second: Rect): boolean {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}
