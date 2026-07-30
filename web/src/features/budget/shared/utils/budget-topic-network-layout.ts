import type { BudgetNetworkPosition } from "../types/budget-page";

export interface BudgetPositionedNode extends BudgetNetworkPosition {
  index: number;
}

const MOBILE_TOPIC_PROGRAM_START_REM = 28;
const MOBILE_TOPIC_PROGRAM_ROW_GAP_REM = 8;
const MOBILE_CATEGORY_TOPIC_START_REM = 26;
const MOBILE_CATEGORY_TOPIC_ROW_GAP_REM = 7;

export function getBudgetTopicProgramPositions(
  count: number,
  mode: "mobile" | "desktop"
): BudgetPositionedNode[] {
  if (count <= 0) {
    return [];
  }
  if (mode === "mobile") {
    const stageHeightRem = getBudgetTopicStageHeightRem(count, mode);
    return Array.from({ length: count }, (_, index) => ({
      index,
      x: index % 2 === 0 ? 26 : 74,
      y: round(
        ((MOBILE_TOPIC_PROGRAM_START_REM +
          Math.floor(index / 2) * MOBILE_TOPIC_PROGRAM_ROW_GAP_REM) /
          stageHeightRem) *
          100
      ),
    }));
  }

  if (count <= 8) {
    return createRing(count, 50, 58, 35, 28, -90);
  }

  const outerCount = Math.min(8, count);
  const innerCount = count - outerCount;
  return [
    ...createRing(outerCount, 50, 58, 40, 32, -90),
    ...createRing(innerCount, 50, 58, 23, 17, -90).map((node) => ({
      ...node,
      index: node.index + outerCount,
    })),
  ];
}

export function getBudgetCategoryTopicPositions(
  count: number,
  mode: "mobile" | "desktop"
): BudgetPositionedNode[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [
      {
        index: 0,
        x: 50,
        y:
          mode === "mobile"
            ? round(
                (MOBILE_CATEGORY_TOPIC_START_REM /
                  getBudgetCategoryStageHeightRem(count, mode)) *
                  100
              )
            : 73,
      },
    ];
  }
  if (mode === "mobile") {
    const stageHeightRem = getBudgetCategoryStageHeightRem(count, mode);
    return Array.from({ length: count }, (_, index) => ({
      index,
      x: index % 2 === 0 ? 28 : 72,
      y: round(
        ((MOBILE_CATEGORY_TOPIC_START_REM +
          Math.floor(index / 2) * MOBILE_CATEGORY_TOPIC_ROW_GAP_REM) /
          stageHeightRem) *
          100
      ),
    }));
  }
  return createRing(count, 50, 56, 31, 24, 90);
}

export function getBudgetTopicStageHeightRem(
  programCount: number,
  mode: "mobile" | "desktop"
): number {
  if (mode === "desktop") {
    return 50;
  }
  if (programCount <= 4) {
    return 52;
  }
  const rowCount = Math.ceil(programCount / 2);
  return Math.max(52, 40 + rowCount * MOBILE_TOPIC_PROGRAM_ROW_GAP_REM);
}

export function getBudgetCategoryStageHeightRem(
  topicCount: number,
  mode: "mobile" | "desktop"
): number {
  if (mode === "desktop") {
    return 42;
  }
  const rowCount = Math.max(1, Math.ceil(topicCount / 2));
  return Math.max(36, 32 + rowCount * MOBILE_CATEGORY_TOPIC_ROW_GAP_REM);
}

export function getBudgetCategoryCenterY(
  topicCount: number,
  mode: "mobile" | "desktop"
): number {
  if (mode === "desktop") {
    return 53;
  }
  return round((18 / getBudgetCategoryStageHeightRem(topicCount, mode)) * 100);
}

export function getBudgetTopicStageClassName(
  programCount: number,
  mode: "mobile" | "desktop"
): string {
  if (mode === "desktop") {
    return "budget-network-stage-topic-desktop";
  }
  if (programCount <= 4) {
    return "budget-network-stage-topic-mobile-short";
  }
  return "budget-network-stage-topic-mobile";
}

function createRing(
  count: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  startAngleDegrees: number
): BudgetPositionedNode[] {
  if (count <= 0) {
    return [];
  }
  return Array.from({ length: count }, (_, index) => {
    const angle = ((startAngleDegrees + (360 * index) / count) * Math.PI) / 180;
    return {
      index,
      x: round(centerX + Math.cos(angle) * radiusX),
      y: round(centerY + Math.sin(angle) * radiusY),
    };
  });
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
