import type {
  BudgetNetworkDecoration,
  BudgetNetworkEdge,
  BudgetNetworkPosition,
  BudgetNetworkRenderedEdge,
  BudgetNetworkTopic,
} from "../types/budget-page";

export const BUDGET_NETWORK_TOPICS = [
  {
    id: "education",
    label: "教育",
    tone: "cyan",
    mobile: { x: 19.4, y: 39 },
    desktop: { x: 15, y: 37 },
  },
  {
    id: "child-rearing",
    label: "子育て",
    tone: "mint",
    mobile: { x: 50.5, y: 37.5 },
    desktop: { x: 35, y: 31 },
  },
  {
    id: "welfare",
    label: "福祉",
    tone: "gold",
    mobile: { x: 81.1, y: 40 },
    desktop: { x: 60, y: 30 },
  },
  {
    id: "urban-development",
    label: "まちづくり",
    tone: "cyan",
    mobile: { x: 17, y: 54 },
    desktop: { x: 82, y: 38 },
  },
  {
    id: "disaster-prevention",
    label: "防災",
    tone: "gold",
    mobile: { x: 83, y: 55 },
    desktop: { x: 90, y: 60 },
  },
  {
    id: "administration-finance",
    label: "行財政",
    tone: "mint",
    mobile: { x: 17, y: 73.2 },
    desktop: { x: 80, y: 81 },
  },
  {
    id: "culture-sports",
    label: "文化・スポーツ",
    tone: "gold",
    mobile: { x: 83, y: 72.3 },
    desktop: { x: 58, y: 89 },
  },
  {
    id: "industry",
    label: "産業",
    tone: "cyan",
    mobile: { x: 20, y: 87.9 },
    desktop: { x: 34, y: 87 },
  },
  {
    id: "environment",
    label: "環境問題",
    tone: "mint",
    mobile: { x: 50, y: 85.4 },
    desktop: { x: 13, y: 76 },
  },
  {
    id: "daily-life",
    label: "暮らし",
    tone: "cyan",
    mobile: { x: 83, y: 88 },
    desktop: { x: 9, y: 53 },
  },
] as const satisfies readonly BudgetNetworkTopic[];

const BUDGET_NETWORK_DECORATIONS = [
  {
    id: "d01",
    size: 14,
    mobile: { x: 8, y: 41 },
    desktop: { x: 8, y: 54 },
  },
  {
    id: "d02",
    size: 22,
    mobile: { x: 34, y: 29 },
    desktop: { x: 28, y: 46 },
  },
  {
    id: "d03",
    size: 10,
    mobile: { x: 67, y: 27 },
    desktop: { x: 49, y: 27 },
  },
  {
    id: "d04",
    size: 18,
    mobile: { x: 92, y: 42 },
    desktop: { x: 72, y: 31 },
  },
  {
    id: "d05",
    size: 12,
    mobile: { x: 34, y: 49 },
    desktop: { x: 92, y: 47 },
  },
  {
    id: "d06",
    size: 28,
    mobile: { x: 67, y: 48 },
    desktop: { x: 68, y: 56 },
  },
  {
    id: "d07",
    size: 16,
    mobile: { x: 8, y: 62 },
    desktop: { x: 40, y: 57 },
  },
  {
    id: "d08",
    size: 11,
    mobile: { x: 35, y: 66 },
    desktop: { x: 27, y: 60 },
  },
  {
    id: "d09",
    size: 24,
    mobile: { x: 67, y: 65 },
    desktop: { x: 59, y: 74 },
  },
  {
    id: "d10",
    size: 13,
    mobile: { x: 93, y: 60 },
    desktop: { x: 82, y: 68 },
  },
  {
    id: "d11",
    size: 19,
    mobile: { x: 9, y: 84 },
    desktop: { x: 11, y: 84 },
  },
  {
    id: "d12",
    size: 12,
    mobile: { x: 34, y: 85 },
    desktop: { x: 47, y: 90 },
  },
  {
    id: "d13",
    size: 26,
    mobile: { x: 67, y: 86 },
    desktop: { x: 77, y: 91 },
  },
  {
    id: "d14",
    size: 10,
    mobile: { x: 92, y: 84 },
    desktop: { x: 95, y: 67 },
  },
] as const satisfies readonly BudgetNetworkDecoration[];

const BUDGET_NETWORK_EDGES = [
  { source: "education", target: "child-rearing", strength: "primary" },
  { source: "education", target: "culture-sports", strength: "primary" },
  { source: "child-rearing", target: "welfare", strength: "primary" },
  {
    source: "child-rearing",
    target: "administration-finance",
    strength: "secondary",
  },
  { source: "welfare", target: "daily-life", strength: "primary" },
  {
    source: "welfare",
    target: "administration-finance",
    strength: "primary",
  },
  {
    source: "urban-development",
    target: "disaster-prevention",
    strength: "primary",
  },
  { source: "urban-development", target: "industry", strength: "primary" },
  {
    source: "urban-development",
    target: "environment",
    strength: "primary",
  },
  {
    source: "disaster-prevention",
    target: "administration-finance",
    strength: "secondary",
  },
  {
    source: "administration-finance",
    target: "industry",
    strength: "primary",
  },
  { source: "industry", target: "environment", strength: "secondary" },
  { source: "environment", target: "daily-life", strength: "primary" },
  { source: "culture-sports", target: "daily-life", strength: "secondary" },
  { source: "education", target: "d02", strength: "secondary" },
  { source: "d02", target: "child-rearing", strength: "secondary" },
  { source: "child-rearing", target: "d03", strength: "secondary" },
  { source: "welfare", target: "d04", strength: "secondary" },
  {
    source: "urban-development",
    target: "d10",
    strength: "secondary",
  },
  {
    source: "d06",
    target: "administration-finance",
    strength: "secondary",
  },
  { source: "culture-sports", target: "d11", strength: "secondary" },
  { source: "environment", target: "d12", strength: "secondary" },
  { source: "industry", target: "d13", strength: "secondary" },
  { source: "daily-life", target: "d14", strength: "secondary" },
] as const satisfies readonly BudgetNetworkEdge[];

export function getBudgetNetworkLayout(mode: "mobile" | "desktop") {
  const center = {
    id: "budget-core",
    ...(mode === "mobile" ? { x: 50, y: 60.7 } : { x: 50, y: 57.3 }),
  };
  const topics = BUDGET_NETWORK_TOPICS.map((topic) => ({
    ...topic,
    ...topic[mode],
  }));
  const decorations = BUDGET_NETWORK_DECORATIONS.map((decoration) => ({
    ...decoration,
    ...decoration[mode],
  }));
  const points = new Map<string, BudgetNetworkPosition>(
    [center, ...topics, ...decorations].map((point) => [
      point.id,
      { x: point.x, y: point.y },
    ])
  );
  const radialEdges: BudgetNetworkRenderedEdge[] = topics.map((topic) => ({
    id: `budget-core-${topic.id}`,
    source: { id: center.id, x: center.x, y: center.y },
    target: { id: topic.id, x: topic.x, y: topic.y },
    strength: "secondary",
  }));
  const constellationEdges: BudgetNetworkRenderedEdge[] =
    BUDGET_NETWORK_EDGES.map((edge) => {
      const source = points.get(edge.source);
      const target = points.get(edge.target);
      if (!source || !target) {
        throw new Error(`Unknown budget network edge: ${edge.source}`);
      }
      return {
        id: `${edge.source}-${edge.target}`,
        source: { id: edge.source, ...source },
        target: { id: edge.target, ...target },
        strength: edge.strength,
      };
    });

  return {
    center,
    topics,
    decorations,
    edges: [...radialEdges, ...constellationEdges],
  };
}
