export const INITIAL_X_EMBED_COUNT = 7;

export function getNextXEmbedCount(input: {
  currentCount: number;
  furthestVisibleIndex: number;
  totalCount: number;
  lookAhead?: number;
}): number {
  const lookAhead = input.lookAhead ?? INITIAL_X_EMBED_COUNT;
  return Math.min(
    input.totalCount,
    Math.max(input.currentCount, input.furthestVisibleIndex + lookAhead)
  );
}
