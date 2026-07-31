import type { BudgetNetworkPosition } from "../types/budget-page";

export interface BudgetPositionedNode extends BudgetNetworkPosition {
  index: number;
  nodeId: string;
}

type WorldDimensions = {
  width: number;
  height: number;
};

const DESKTOP_PROGRAM_SLOTS: readonly BudgetNetworkPosition[] = [
  { x: 55, y: 22 },
  { x: 78, y: 27 },
  { x: 88, y: 43 },
  { x: 88, y: 65 },
  { x: 76, y: 81 },
  { x: 53, y: 84 },
  { x: 31, y: 82 },
  { x: 13, y: 68 },
  { x: 14, y: 44 },
  { x: 30, y: 28 },
];

export function getBudgetTopicProgramPositions(
  nodeIds: readonly string[],
  mode: "mobile" | "desktop",
  dimensions: WorldDimensions
): BudgetPositionedNode[] {
  if (nodeIds.length === 0) {
    return [];
  }

  const slots =
    mode === "mobile"
      ? createMobileProgramSlots(nodeIds.length, dimensions)
      : DESKTOP_PROGRAM_SLOTS.slice(0, nodeIds.length);
  return assignOrderedSlots(nodeIds, slots);
}

export function getBudgetCategoryTopicPositions(
  nodeIds: readonly string[],
  mode: "mobile" | "desktop",
  dimensions: WorldDimensions
): BudgetPositionedNode[] {
  if (nodeIds.length === 0) {
    return [];
  }
  if (nodeIds.length === 1) {
    return [
      {
        index: 0,
        nodeId: nodeIds[0] ?? "",
        x: mode === "mobile" ? 50 : 76,
        y: mode === "mobile" ? round((390 / dimensions.height) * 100) : 56,
      },
    ];
  }

  const slots =
    mode === "mobile"
      ? createMobileCategoryTopicSlots(nodeIds.length, dimensions)
      : createDesktopOrbitSlots(nodeIds.length);
  return assignOrderedSlots(nodeIds, slots);
}

function createMobileProgramSlots(
  count: number,
  dimensions: WorldDimensions
): BudgetNetworkPosition[] {
  return Array.from({ length: count }, (_, index) => ({
    x: index % 2 === 0 ? 25 : 75,
    y: round(((350 + Math.floor(index / 2) * 96) / dimensions.height) * 100),
  }));
}

function createMobileCategoryTopicSlots(
  count: number,
  dimensions: WorldDimensions
): BudgetNetworkPosition[] {
  return Array.from({ length: count }, (_, index) => ({
    x: index % 2 === 0 ? 29 : 71,
    y: round(((390 + Math.floor(index / 2) * 110) / dimensions.height) * 100),
  }));
}

function createDesktopOrbitSlots(count: number): BudgetNetworkPosition[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = ((-90 + (360 * index) / count) * Math.PI) / 180;
    return {
      x: round(50 + Math.cos(angle) * 32),
      y: round(56 + Math.sin(angle) * 29),
    };
  });
}

function assignOrderedSlots(
  nodeIds: readonly string[],
  slots: readonly BudgetNetworkPosition[]
): BudgetPositionedNode[] {
  if (slots.length < nodeIds.length) {
    throw new Error("Budget map does not have enough deterministic slots");
  }

  return nodeIds.map((nodeId, index) => {
    const slot = slots[index];
    if (!slot) {
      throw new Error("Budget map slot could not be resolved");
    }
    return {
      index,
      nodeId,
      ...slot,
    };
  });
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
