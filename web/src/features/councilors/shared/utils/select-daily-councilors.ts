type CouncilorCandidate = {
  id: string;
};

export function selectDailyCouncilors<T extends CouncilorCandidate>(
  councilors: readonly T[],
  currentDate: Date,
  limit = 3
): T[] {
  const selectionLimit = Math.max(0, Math.floor(limit));
  if (selectionLimit === 0 || councilors.length === 0) {
    return [];
  }

  const candidates = [...councilors].sort((councilorA, councilorB) =>
    councilorA.id.localeCompare(councilorB.id)
  );
  let seed = hashDate(currentDate);

  for (let index = candidates.length - 1; index > 0; index--) {
    seed = nextSeed(seed);
    const swapIndex = seed % (index + 1);
    [candidates[index], candidates[swapIndex]] = [
      candidates[swapIndex],
      candidates[index],
    ];
  }

  return candidates.slice(0, Math.min(selectionLimit, candidates.length));
}

function hashDate(date: Date): number {
  const dateKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  let hash = 2166136261;

  for (const character of dateKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}
