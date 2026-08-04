import type {
  BudgetExplorationCategory,
  BudgetExplorationProgram,
  BudgetExplorationTopic,
  BudgetExplorerStableView,
} from "../types/budget-exploration";
import type {
  BudgetMapMode,
  BudgetMapPosition,
  BudgetMapWorldDimensions,
} from "./budget-map-layout";
import { getBudgetMapProgramPage } from "./budget-map-programs";
import {
  BUDGET_MAP_V2_CORE,
  BUDGET_MAP_V2_TRIM,
  type BudgetMapV2AmountTier,
  getBudgetMapV2AmountTier,
  getBudgetMapV2CameraFocus,
  getBudgetMapV2CaptionOffset,
  getBudgetMapV2CategoryHue,
  getBudgetMapV2CategoryTopicNodes,
  getBudgetMapV2OverviewRing,
  getBudgetMapV2ProgramDiameter,
  getBudgetMapV2ProgramNodes,
  getBudgetMapV2SpokePath,
  getBudgetMapV2WorldDimensions,
} from "./budget-map-v2-geometry";
import {
  type BudgetMapV2Branches,
  type BudgetMapV2CoreDot,
  type BudgetMapV2FlowParticle,
  createBudgetMapV2Branches,
  createBudgetMapV2CoreDots,
  createBudgetMapV2FlowParticles,
  createBudgetMapV2Satellites,
} from "./budget-map-v2-particles";

/**
 * 表示に必要な形へ変換した宇宙マップ v2 の1画面ぶん。
 * データ取得も DOM も持たない純粋な計算結果。
 */

export type BudgetMapV2Edge = {
  id: string;
  d: string;
  hue: number | null;
  opacity: number;
};

export type BudgetMapV2CategoryNode = {
  id: string;
  slug: string;
  label: string;
  sub: string;
  hue: number;
  x: number;
  y: number;
  labelOffsetX: number;
  labelOffsetY: number;
  topicCount: number;
};

export type BudgetMapV2TopicNode = {
  id: string;
  slug: string;
  title: string;
  hue: number;
  x: number;
  y: number;
};

export type BudgetMapV2ProgramNode = {
  budgetProgramIdentityId: string;
  name: string;
  amountThousandYen: number;
  isZeroAmount: boolean;
  departmentName: string;
  otherCategoryNames: string[];
  hue: number;
  x: number;
  y: number;
  tier: BudgetMapV2AmountTier;
  diameter: number;
  iconSizePx: number;
};

export type BudgetMapV2DistantNode = {
  slug: string;
  label: string;
  hue: number;
  x: number;
  y: number;
};

export type BudgetMapV2ProgramPageInfo = {
  pageIndex: number;
  pageCount: number;
  startNumber: number;
  endNumber: number;
  totalCount: number;
};

export type BudgetMapV2Scene = {
  kind: "overview" | "category" | "topic";
  world: BudgetMapWorldDimensions;
  cameraFocus: BudgetMapPosition;
  coreCenter: BudgetMapPosition;
  /** 中心コアの下に置く見出しの位置。 */
  captionCenter: BudgetMapPosition;
  coreDots: BudgetMapV2CoreDot[];
  /** category / topic では中実コアを描く。overview は粒子球体のみ。 */
  solidCoreDiameter: number | null;
  coreHue: number;
  edges: BudgetMapV2Edge[];
  branches: BudgetMapV2Branches;
  flow: BudgetMapV2FlowParticle[];
  categories: BudgetMapV2CategoryNode[];
  topics: BudgetMapV2TopicNode[];
  programs: BudgetMapV2ProgramNode[];
  distantCategories: BudgetMapV2DistantNode[];
  programPage: BudgetMapV2ProgramPageInfo | null;
};

export type BudgetMapV2SceneInput = {
  view: BudgetExplorerStableView;
  categories: readonly BudgetExplorationCategory[];
  mode: BudgetMapMode;
  /** reduced-motion のとき流れる粒は要素ごと作らない。 */
  withMotionParticles: boolean;
  programPageIndex: number;
  programPageSize: number;
  sizeByAmount?: boolean;
};

/** リング上の角度は並び順で決まるため、既定の10分野は固定順とする。 */
const CANONICAL_CATEGORY_ORDER: readonly string[] = [
  "education",
  "child-rearing",
  "welfare",
  "urban-development",
  "disaster-prevention",
  "administration-finance",
  "culture-sports",
  "industry",
  "environment",
  "daily-life",
];

const STAR_SEEDS = { overview: 3, category: 9, topic: 15 } as const;
const CORE_SEEDS = { overview: 31, category: 57, topic: 83 } as const;
const BRANCH_SEEDS = { overview: 7, category: 12, topic: 21 } as const;
const FLOW_SEEDS = { overview: 41, category: 63, topic: 77 } as const;

const CATEGORY_SOLID_CORE_DIAMETER = { desktop: 148, mobile: 0 } as const;
const TOPIC_SOLID_CORE_DIAMETER = { desktop: 126, mobile: 0 } as const;

export function getBudgetMapV2StarSeed(
  kind: "overview" | "category" | "topic"
): number {
  return STAR_SEEDS[kind];
}

export function buildBudgetMapV2Scene(
  input: BudgetMapV2SceneInput
): BudgetMapV2Scene {
  switch (input.view.kind) {
    case "overview":
      return buildOverviewScene(input);
    case "category":
      return buildCategoryScene(input, input.view.category);
    case "topic":
      return buildTopicScene(input, input.view.category, input.view.topic);
  }
}

function buildOverviewScene(input: BudgetMapV2SceneInput): BudgetMapV2Scene {
  const { mode } = input;
  const world = getBudgetMapV2WorldDimensions("overview", mode);
  const core = BUDGET_MAP_V2_CORE[mode].overview;
  const trim = BUDGET_MAP_V2_TRIM[mode].overview;
  const ordered = sortCategories(input.categories);
  const ring = getBudgetMapV2OverviewRing(ordered.length, mode);

  const categories: BudgetMapV2CategoryNode[] = ordered.map(
    (category, index) => {
      const node = ring[index];
      const hue = getBudgetMapV2CategoryHue(category.slug);
      return {
        id: category.id,
        slug: category.slug,
        label: category.name,
        sub: category.shortDescription,
        hue,
        x: node?.x ?? core.center.x,
        y: node?.y ?? core.center.y,
        labelOffsetX: node?.labelOffsetX ?? 0,
        labelOffsetY: node?.labelOffsetY ?? 0,
        topicCount: category.topics.length,
      };
    }
  );

  const vectors = categories.map((category, index) => ({
    x: category.x,
    y: category.y,
    ux: ring[index]?.ux ?? 0,
    uy: ring[index]?.uy ?? -1,
    hue: category.hue,
  }));

  return {
    kind: "overview",
    world,
    cameraFocus: getBudgetMapV2CameraFocus("overview", mode),
    coreCenter: core.center,
    captionCenter: {
      x: core.center.x,
      y: core.center.y + getBudgetMapV2CaptionOffset("overview", mode),
    },
    coreDots: createBudgetMapV2CoreDots({
      center: core.center,
      radius: core.radius,
      hues: categories.map((category) => category.hue),
      seed: CORE_SEEDS.overview,
      count: core.dotCount,
    }),
    solidCoreDiameter: null,
    coreHue: categories[0]?.hue ?? 220,
    edges: categories.map((category) => ({
      id: `v2-edge-overview-${category.slug}`,
      d: getBudgetMapV2SpokePath(core.center, category, trim.start, trim.end),
      hue: null,
      opacity: 0.15,
    })),
    branches: createBudgetMapV2Branches({
      nodes: vectors,
      seed: BRANCH_SEEDS.overview,
      scale: mode === "mobile" ? 0.5 : 1,
    }),
    flow: input.withMotionParticles
      ? createBudgetMapV2FlowParticles({
          center: core.center,
          nodes: categories.map((category) => ({
            x: category.x,
            y: category.y,
            hue: category.hue,
            startTrim: trim.start,
            endTrim: trim.end,
          })),
          seed: FLOW_SEEDS.overview,
        })
      : [],
    categories,
    topics: [],
    programs: [],
    distantCategories: [],
    programPage: null,
  };
}

function buildCategoryScene(
  input: BudgetMapV2SceneInput,
  category: BudgetExplorationCategory
): BudgetMapV2Scene {
  const { mode } = input;
  const world = getBudgetMapV2WorldDimensions("category", mode);
  const core = BUDGET_MAP_V2_CORE[mode].category;
  const trim = BUDGET_MAP_V2_TRIM[mode].category;
  const hue = getBudgetMapV2CategoryHue(category.slug);
  const nodes = getBudgetMapV2CategoryTopicNodes(category.topics.length, mode);

  const topics: BudgetMapV2TopicNode[] = category.topics.map((topic, index) => {
    const node = nodes[index];
    return {
      id: topic.id,
      slug: topic.slug,
      title: topic.name,
      hue,
      x: node?.x ?? core.center.x,
      y: node?.y ?? core.center.y,
    };
  });

  return {
    kind: "category",
    world,
    cameraFocus: getBudgetMapV2CameraFocus("category", mode),
    coreCenter: core.center,
    captionCenter: core.center,
    coreDots: createBudgetMapV2CoreDots({
      center: core.center,
      radius: core.radius,
      hues: [hue - 12, hue, hue + 12, 190],
      seed: CORE_SEEDS.category,
      count: core.dotCount,
    }),
    solidCoreDiameter: CATEGORY_SOLID_CORE_DIAMETER[mode] || null,
    coreHue: hue,
    edges: topics.map((topic) => ({
      id: `v2-edge-category-${topic.slug}`,
      d: getBudgetMapV2SpokePath(core.center, topic, trim.start, trim.end),
      hue,
      opacity: 0.5,
    })),
    branches: createBudgetMapV2Branches({
      nodes: topics.map((topic, index) => ({
        x: topic.x,
        y: topic.y,
        ux: nodes[index]?.ux ?? 0,
        uy: nodes[index]?.uy ?? -1,
        hue,
      })),
      seed: BRANCH_SEEDS.category,
      scale: mode === "mobile" ? 0.5 : 1,
    }),
    flow: input.withMotionParticles
      ? createBudgetMapV2FlowParticles({
          center: core.center,
          nodes: topics.map((topic) => ({
            x: topic.x,
            y: topic.y,
            hue,
            startTrim: trim.start,
            endTrim: trim.end,
          })),
          seed: FLOW_SEEDS.category,
        })
      : [],
    categories: [],
    topics,
    programs: [],
    distantCategories: [],
    programPage: null,
  };
}

function buildTopicScene(
  input: BudgetMapV2SceneInput,
  category: BudgetExplorationCategory,
  topic: BudgetExplorationTopic
): BudgetMapV2Scene {
  const { mode } = input;
  const world = getBudgetMapV2WorldDimensions("topic", mode);
  const core = BUDGET_MAP_V2_CORE[mode].topic;
  const trim = BUDGET_MAP_V2_TRIM[mode].topic;
  const hue = getBudgetMapV2CategoryHue(category.slug);
  const page = getBudgetMapProgramPage(
    topic.programs,
    input.programPageIndex,
    input.programPageSize
  );
  const positions = getBudgetMapV2ProgramNodes(page.items.length, mode);
  const visibleAmounts = page.items.map((program) => program.amountThousandYen);
  const categoryNameBySlug = new Map(
    input.categories.map((candidate) => [candidate.slug, candidate.name])
  );

  const programs: BudgetMapV2ProgramNode[] = page.items.map(
    (program, index) => {
      const position = positions[index];
      const tier = getBudgetMapV2AmountTier(
        program.amountThousandYen,
        visibleAmounts
      );
      const diameter = getBudgetMapV2ProgramDiameter(
        tier,
        mode,
        input.sizeByAmount ?? true
      );
      return {
        budgetProgramIdentityId: program.budgetProgramIdentityId,
        name: program.displayProgramName,
        amountThousandYen: program.amountThousandYen,
        isZeroAmount: program.isZeroAmount,
        departmentName: program.departmentDisplayName,
        otherCategoryNames: getOtherCategoryNames(
          program,
          category.slug,
          categoryNameBySlug
        ),
        hue,
        x: position?.x ?? core.center.x,
        y: position?.y ?? core.center.y,
        tier,
        diameter,
        iconSizePx: Math.round(diameter * (mode === "mobile" ? 0.38 : 0.36)),
      };
    }
  );

  return {
    kind: "topic",
    world,
    cameraFocus: getBudgetMapV2CameraFocus("topic", mode),
    coreCenter: core.center,
    captionCenter: {
      x: core.center.x,
      y: core.center.y + getBudgetMapV2CaptionOffset("topic", mode),
    },
    coreDots:
      core.dotCount > 0
        ? createBudgetMapV2CoreDots({
            center: core.center,
            radius: core.radius,
            hues: [hue - 12, hue, hue + 12, 190],
            seed: CORE_SEEDS.topic,
            count: core.dotCount,
          })
        : [],
    solidCoreDiameter: TOPIC_SOLID_CORE_DIAMETER[mode] || null,
    coreHue: hue,
    edges: programs.map((program) => ({
      id: `v2-edge-topic-${program.budgetProgramIdentityId}`,
      d: getBudgetMapV2SpokePath(
        core.center,
        program,
        trim.start,
        program.diameter / 2 + 5
      ),
      hue,
      opacity: 0.34,
    })),
    branches: createBudgetMapV2Satellites({
      nodes: programs.map((program) => ({
        x: program.x,
        y: program.y,
        hue,
      })),
      seed: BRANCH_SEEDS.topic,
      scale: 0.62,
    }),
    flow: input.withMotionParticles
      ? createBudgetMapV2FlowParticles({
          center: core.center,
          nodes: programs.map((program) => ({
            x: program.x,
            y: program.y,
            hue,
            startTrim: trim.start,
            endTrim: program.diameter / 2 + 5,
          })),
          seed: FLOW_SEEDS.topic,
        })
      : [],
    categories: [],
    topics: [],
    programs,
    distantCategories: [],
    programPage: {
      pageIndex: page.pageIndex,
      pageCount: page.pageCount,
      startNumber: page.startNumber,
      endNumber: page.endNumber,
      totalCount: page.totalCount,
    },
  };
}

function getOtherCategoryNames(
  program: BudgetExplorationProgram,
  currentCategorySlug: string,
  categoryNameBySlug: ReadonlyMap<string, string>
): string[] {
  return program.categorySlugs
    .filter((slug) => slug !== currentCategorySlug)
    .map((slug) => categoryNameBySlug.get(slug))
    .filter((name): name is string => name !== undefined);
}

/**
 * 順序を安定させる。既定の10分野は固定順、未知の分野は
 * sortOrder を保ったまま後ろへ送る。
 */
function sortCategories(
  categories: readonly BudgetExplorationCategory[]
): BudgetExplorationCategory[] {
  return [...categories].sort((left, right) => {
    const leftRank = getCategoryRank(left.slug);
    const rightRank = getCategoryRank(right.slug);
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.sortOrder - right.sortOrder;
  });
}

function getCategoryRank(slug: string): number {
  const index = CANONICAL_CATEGORY_ORDER.indexOf(slug);
  return index < 0 ? CANONICAL_CATEGORY_ORDER.length : index;
}
