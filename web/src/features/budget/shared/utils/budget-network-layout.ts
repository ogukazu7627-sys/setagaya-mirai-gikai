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
    mobile: { x: 18, y: 40 },
    desktop: { x: 18, y: 38 },
  },
  {
    id: "childcare",
    label: "子育て",
    tone: "mint",
    mobile: { x: 50, y: 43 },
    desktop: { x: 38, y: 32 },
  },
  {
    id: "welfare",
    label: "福祉",
    tone: "gold",
    mobile: { x: 82, y: 40 },
    desktop: { x: 60, y: 40 },
  },
  {
    id: "urban-development",
    label: "まちづくり",
    tone: "cyan",
    mobile: { x: 18, y: 58 },
    desktop: { x: 79, y: 55 },
  },
  {
    id: "disaster-prevention",
    label: "防災",
    tone: "gold",
    mobile: { x: 50, y: 61 },
    desktop: { x: 86, y: 31 },
  },
  {
    id: "administration",
    label: "行財政",
    tone: "mint",
    mobile: { x: 82, y: 58 },
    desktop: { x: 52, y: 64 },
  },
  {
    id: "culture-sports",
    label: "文化・スポーツ",
    tone: "gold",
    mobile: { x: 18, y: 76 },
    desktop: { x: 17, y: 70 },
  },
  {
    id: "industry",
    label: "産業",
    tone: "cyan",
    mobile: { x: 50, y: 79 },
    desktop: { x: 69, y: 79 },
  },
  {
    id: "environment",
    label: "環境問題",
    tone: "mint",
    mobile: { x: 82, y: 76 },
    desktop: { x: 36, y: 84 },
  },
  {
    id: "daily-life",
    label: "暮らし",
    tone: "cyan",
    mobile: { x: 18, y: 91 },
    desktop: { x: 89, y: 79 },
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
  { source: "education", target: "childcare", strength: "primary" },
  { source: "education", target: "culture-sports", strength: "primary" },
  { source: "childcare", target: "welfare", strength: "primary" },
  { source: "childcare", target: "administration", strength: "secondary" },
  { source: "welfare", target: "daily-life", strength: "primary" },
  { source: "welfare", target: "administration", strength: "primary" },
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
    target: "administration",
    strength: "secondary",
  },
  { source: "administration", target: "industry", strength: "primary" },
  { source: "industry", target: "environment", strength: "secondary" },
  { source: "environment", target: "daily-life", strength: "primary" },
  { source: "culture-sports", target: "daily-life", strength: "secondary" },
  { source: "education", target: "d02", strength: "secondary" },
  { source: "d02", target: "childcare", strength: "secondary" },
  { source: "childcare", target: "d03", strength: "secondary" },
  { source: "welfare", target: "d04", strength: "secondary" },
  {
    source: "urban-development",
    target: "d10",
    strength: "secondary",
  },
  { source: "d06", target: "administration", strength: "secondary" },
  { source: "culture-sports", target: "d11", strength: "secondary" },
  { source: "environment", target: "d12", strength: "secondary" },
  { source: "industry", target: "d13", strength: "secondary" },
  { source: "daily-life", target: "d14", strength: "secondary" },
] as const satisfies readonly BudgetNetworkEdge[];

export function getBudgetNetworkLayout(mode: "mobile" | "desktop") {
  const topics = BUDGET_NETWORK_TOPICS.map((topic) => ({
    ...topic,
    ...topic[mode],
  }));
  const decorations = BUDGET_NETWORK_DECORATIONS.map((decoration) => ({
    ...decoration,
    ...decoration[mode],
  }));
  const points = new Map<string, BudgetNetworkPosition>(
    [...topics, ...decorations].map((point) => [
      point.id,
      { x: point.x, y: point.y },
    ])
  );
  const edges: BudgetNetworkRenderedEdge[] = BUDGET_NETWORK_EDGES.map(
    (edge) => {
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
    }
  );

  return { topics, decorations, edges };
}
