export const BUDGET_MAP_DESKTOP_STAR_COUNT = 200;
export const BUDGET_MAP_MOBILE_STAR_COUNT = 70;

export type BudgetMapStar = {
  id: string;
  xPercent: number;
  yPercent: number;
  sizePx: number;
  opacity: number;
  twinkles: boolean;
  animationDelaySeconds: number;
  animationDurationSeconds: number;
};

export function createBudgetMapStars(
  count = BUDGET_MAP_DESKTOP_STAR_COUNT,
  seed = 20_260_731
): BudgetMapStar[] {
  const random = createSeededRandom(seed);

  return Array.from({ length: count }, (_, index) => ({
    id: `star-${index + 1}`,
    xPercent: round(random() * 100),
    yPercent: round(random() * 100),
    sizePx: round(0.8 + random() * 1.8),
    opacity: round(0.24 + random() * 0.58),
    twinkles: index % 11 === 0,
    animationDelaySeconds: round(-random() * 7),
    animationDurationSeconds: round(5.2 + random() * 3.8),
  }));
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
