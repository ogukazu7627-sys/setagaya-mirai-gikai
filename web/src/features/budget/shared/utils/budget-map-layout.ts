import type {
  BudgetExplorationCategory,
  BudgetExplorerStableView,
  BudgetExplorerView,
} from "../types/budget-exploration";
import type { BudgetNetworkPosition } from "../types/budget-page";
import { getBudgetMapProgramPageSize } from "./budget-map-programs";
import { getBudgetNetworkLayout } from "./budget-network-layout";
import {
  getBudgetCategoryTopicPositions,
  getBudgetTopicProgramPositions,
} from "./budget-topic-network-layout";

export type BudgetMapMode = "mobile" | "desktop";

export type BudgetMapWorldDimensions = {
  width: number;
  height: number;
};

export type BudgetMapPosition = {
  x: number;
  y: number;
};

export type BudgetMapCameraFocus = BudgetMapPosition & {
  zoom: number;
};

export type BudgetMapCameraTransform = {
  x: number;
  y: number;
  scale: number;
};

const DESKTOP_WORLD: BudgetMapWorldDimensions = {
  width: 1000,
  height: 620,
};
const DESKTOP_TOPIC_WORLD: BudgetMapWorldDimensions = {
  width: 1000,
  height: 700,
};
const MOBILE_WORLD_WIDTH = 360;
const MOBILE_OVERVIEW_WORLD_HEIGHT = 560;
const MOBILE_CATEGORY_MIN_WORLD_HEIGHT = 660;
const MOBILE_TOPIC_MIN_WORLD_HEIGHT = 700;

export function getBudgetMapStableView(
  view: BudgetExplorerView
): BudgetExplorerStableView {
  return view.kind === "transitioning" ? view.current : view;
}

export function getBudgetMapWorldDimensions(
  view: BudgetExplorerStableView,
  mode: BudgetMapMode
): BudgetMapWorldDimensions {
  if (mode === "desktop") {
    return view.kind === "topic" ? DESKTOP_TOPIC_WORLD : DESKTOP_WORLD;
  }
  if (view.kind === "category") {
    const rowCount = Math.max(1, Math.ceil(view.category.topics.length / 2));
    return {
      width: MOBILE_WORLD_WIDTH,
      height: Math.max(
        MOBILE_CATEGORY_MIN_WORLD_HEIGHT,
        450 + (rowCount - 1) * 110
      ),
    };
  }
  if (view.kind === "topic") {
    const pageSize = getBudgetMapProgramPageSize(mode);
    const visibleProgramCount = Math.min(pageSize, view.topic.programs.length);
    const rowCount = Math.max(1, Math.ceil(visibleProgramCount / 2));
    return {
      width: MOBILE_WORLD_WIDTH,
      height: Math.max(
        MOBILE_TOPIC_MIN_WORLD_HEIGHT,
        400 + (rowCount - 1) * 96
      ),
    };
  }
  return {
    width: MOBILE_WORLD_WIDTH,
    height: MOBILE_OVERVIEW_WORLD_HEIGHT,
  };
}

export function getBudgetMapOverviewLayout(
  mode: BudgetMapMode,
  dimensions: BudgetMapWorldDimensions
) {
  const layout = getBudgetNetworkLayout(mode);
  return {
    center: toWorldPosition(layout.center, dimensions),
    topics: layout.topics.map((topic) => ({
      ...topic,
      ...toWorldPosition(topic, dimensions),
    })),
    decorations: layout.decorations.map((decoration) => ({
      ...decoration,
      ...toWorldPosition(decoration, dimensions),
    })),
    edges: layout.edges.map((edge) => ({
      ...edge,
      source: toWorldPosition(edge.source, dimensions),
      target: toWorldPosition(edge.target, dimensions),
    })),
  };
}

export function getBudgetMapCategoryLayout(
  category: BudgetExplorationCategory,
  mode: BudgetMapMode,
  dimensions: BudgetMapWorldDimensions
) {
  if (mode === "mobile") {
    return {
      center: { x: dimensions.width / 2, y: 230 },
      topics: getBudgetCategoryTopicPositions(
        category.topics.map((topic) => topic.id),
        mode,
        dimensions
      ).map((position) => ({
        ...position,
        topic: category.topics[position.index],
        ...toWorldPosition(position, dimensions),
      })),
    };
  }

  return {
    center: toWorldPosition({ x: 50, y: 57.3 }, dimensions),
    topics: getBudgetCategoryTopicPositions(
      category.topics.map((topic) => topic.id),
      mode,
      dimensions
    ).map((position) => ({
      ...position,
      topic: category.topics[position.index],
      ...toWorldPosition(position, dimensions),
    })),
  };
}

export function getBudgetMapTopicLayout(
  programIds: readonly string[],
  mode: BudgetMapMode,
  dimensions: BudgetMapWorldDimensions
) {
  const visibleProgramIds = programIds.slice(
    0,
    getBudgetMapProgramPageSize(mode)
  );
  const center =
    mode === "mobile"
      ? { x: dimensions.width / 2, y: 215 }
      : toWorldPosition({ x: 50, y: 54 }, dimensions);
  return {
    center,
    programs: getBudgetTopicProgramPositions(
      visibleProgramIds,
      mode,
      dimensions
    ).map((position) => ({
      ...position,
      ...toWorldPosition(position, dimensions),
    })),
  };
}

function getProgramPageIds(
  programIds: readonly string[],
  programIndex: number,
  mode: BudgetMapMode
): string[] {
  const pageSize = getBudgetMapProgramPageSize(mode);
  const pageStart = Math.floor(programIndex / pageSize) * pageSize;
  return programIds.slice(pageStart, pageStart + pageSize);
}

export function getBudgetMapCameraFocus(
  view: BudgetExplorerView,
  mode: BudgetMapMode,
  dimensions: BudgetMapWorldDimensions
): BudgetMapCameraFocus {
  const current = getBudgetMapStableView(view);
  if (view.kind !== "transitioning") {
    return getStableCameraFocus(current, mode, dimensions);
  }

  const target = view.target;
  switch (target.kind) {
    case "overview":
      return {
        x: dimensions.width / 2,
        y: dimensions.height * 0.58,
        zoom: 1.08,
      };
    case "category": {
      if (current.kind === "overview") {
        const position = getBudgetMapOverviewLayout(
          mode,
          dimensions
        ).topics.find((topic) => topic.id === target.category.slug);
        if (position) {
          return { x: position.x, y: position.y, zoom: 1.38 };
        }
      }
      const categoryLayout = getBudgetMapCategoryLayout(
        target.category,
        mode,
        dimensions
      );
      return { ...categoryLayout.center, zoom: 1.2 };
    }
    case "topic": {
      const topicIndex = target.category.topics.findIndex(
        (topic) => topic.slug === target.topic.slug
      );
      const position = getBudgetMapCategoryLayout(
        target.category,
        mode,
        dimensions
      ).topics.find((topic) => topic.index === topicIndex);
      return position
        ? { x: position.x, y: position.y, zoom: 1.38 }
        : getStableCameraFocus(current, mode, dimensions);
    }
    case "program": {
      if (current.kind !== "topic") {
        return getStableCameraFocus(current, mode, dimensions);
      }
      const programIndex = current.topic.programs.findIndex(
        (program) =>
          program.budgetProgramIdentityId === target.budgetProgramIdentityId
      );
      if (programIndex < 0) {
        return getStableCameraFocus(current, mode, dimensions);
      }
      const programIds = current.topic.programs.map(
        (program) => program.budgetProgramIdentityId
      );
      const pageIds = getProgramPageIds(programIds, programIndex, mode);
      const position = getBudgetMapTopicLayout(
        pageIds,
        mode,
        dimensions
      ).programs.find(
        (program) => program.nodeId === target.budgetProgramIdentityId
      );
      return position
        ? { x: position.x, y: position.y, zoom: 1.34 }
        : getStableCameraFocus(current, mode, dimensions);
    }
  }
}

export function getBudgetMapCameraTransform(input: {
  viewportWidth: number;
  viewportHeight: number;
  dimensions: BudgetMapWorldDimensions;
  focus: BudgetMapCameraFocus;
}): BudgetMapCameraTransform {
  const fitScale = Math.min(
    input.viewportWidth / input.dimensions.width,
    input.viewportHeight / input.dimensions.height
  );
  const scale = clamp(fitScale * input.focus.zoom, 0.25, 1.6);
  return {
    x: round(input.viewportWidth / 2 - input.focus.x * scale),
    y: round(input.viewportHeight / 2 - input.focus.y * scale),
    scale: round(scale),
  };
}

function getStableCameraFocus(
  view: BudgetExplorerStableView,
  mode: BudgetMapMode,
  dimensions: BudgetMapWorldDimensions
): BudgetMapCameraFocus {
  if (mode === "mobile") {
    return {
      x: dimensions.width / 2,
      y: dimensions.height / 2,
      zoom: 1,
    };
  }
  if (view.kind === "category") {
    return {
      ...getBudgetMapCategoryLayout(view.category, mode, dimensions).center,
      zoom: 1.08,
    };
  }
  if (view.kind === "topic") {
    const pageSize = getBudgetMapProgramPageSize(mode);
    const firstProgramPageIds = view.topic.programs
      .slice(0, pageSize)
      .map((program) => program.budgetProgramIdentityId);
    return {
      ...getBudgetMapTopicLayout(firstProgramPageIds, mode, dimensions).center,
      zoom: 1,
    };
  }
  return {
    x: dimensions.width / 2,
    y: dimensions.height * 0.59,
    zoom: 1,
  };
}

function toWorldPosition(
  position: BudgetNetworkPosition,
  dimensions: BudgetMapWorldDimensions
): BudgetMapPosition {
  return {
    x: round((position.x / 100) * dimensions.width),
    y: round((position.y / 100) * dimensions.height),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
