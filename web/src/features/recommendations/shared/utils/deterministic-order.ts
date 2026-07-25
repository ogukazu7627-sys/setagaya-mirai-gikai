function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function orderDeterministically<T>(
  values: readonly T[],
  seed: string,
  getKey: (value: T) => string
): T[] {
  return values
    .map((value, index) => ({
      value,
      index,
      rank: hashString(`${seed}:${getKey(value)}`),
    }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ value }) => value);
}
