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
  { x: 78, y: 24 },
  { x: 86, y: 40 },
  { x: 88, y: 65 },
  { x: 78, y: 80 },
  { x: 56, y: 84 },
  { x: 32, y: 82 },
  { x: 14, y: 68 },
  { x: 14, y: 45 },
  { x: 30, y: 28 },
  { x: 56, y: 34 },
];

const DESKTOP_CATEGORY_TOPIC_SLOTS: readonly BudgetNetworkPosition[] = [
  { x: 76, y: 56 },
  { x: 70, y: 29 },
  { x: 82, y: 75 },
  { x: 48, y: 83 },
  { x: 23, y: 70 },
  { x: 24, y: 40 },
  { x: 48, y: 25 },
  { x: 72, y: 76 },
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
  return assignDeterministicSlots(nodeIds, slots);
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
      : createDesktopOrbitSlots(nodeIds.length, DESKTOP_CATEGORY_TOPIC_SLOTS);
  return assignDeterministicSlots(nodeIds, slots);
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

function createDesktopOrbitSlots(
  count: number,
  preferredSlots: readonly BudgetNetworkPosition[]
): BudgetNetworkPosition[] {
  if (count <= preferredSlots.length) {
    return preferredSlots.slice(0, count);
  }

  return Array.from({ length: count }, (_, index) => {
    const angle = ((-72 + (360 * index) / count) * Math.PI) / 180;
    return {
      x: round(50 + Math.cos(angle) * 34),
      y: round(56 + Math.sin(angle) * 29),
    };
  });
}

function assignDeterministicSlots(
  nodeIds: readonly string[],
  slots: readonly BudgetNetworkPosition[]
): BudgetPositionedNode[] {
  if (slots.length < nodeIds.length) {
    throw new Error("Budget map does not have enough deterministic slots");
  }

  const assignments = new Map<number, BudgetPositionedNode>();
  const occupiedSlots = new Set<number>();
  const nodes = nodeIds
    .map((nodeId, index) => ({
      hash: hashBudgetMapNodeId(nodeId),
      index,
      nodeId,
    }))
    .toSorted(
      (left, right) =>
        left.hash - right.hash || left.nodeId.localeCompare(right.nodeId)
    );

  for (const node of nodes) {
    const startSlot = node.hash % slots.length;
    let slotIndex = startSlot;
    while (occupiedSlots.has(slotIndex)) {
      slotIndex = (slotIndex + 1) % slots.length;
    }
    occupiedSlots.add(slotIndex);
    const slot = slots[slotIndex];
    if (!slot) {
      throw new Error("Budget map slot could not be resolved");
    }
    assignments.set(node.index, {
      index: node.index,
      nodeId: node.nodeId,
      ...slot,
    });
  }

  return nodeIds.map((_, index) => {
    const assignment = assignments.get(index);
    if (!assignment) {
      throw new Error("Budget map node could not be placed");
    }
    return assignment;
  });
}

function hashBudgetMapNodeId(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
