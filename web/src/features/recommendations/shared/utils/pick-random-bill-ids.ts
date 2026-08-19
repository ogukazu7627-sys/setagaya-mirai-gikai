/**
 * 興味分野を設定していない利用者向けに、案件IDから重複なく指定件数を無作為抽出する。
 * 日付や利用者に依存させず、呼び出しごとに異なる並びを返す。
 */
export function pickRandomBillIds(
  billIds: readonly string[],
  count: number,
  random: () => number = Math.random
): string[] {
  if (count <= 0) {
    return [];
  }

  const unique = Array.from(new Set(billIds));
  const picked = Math.min(count, unique.length);
  // Fisher-Yates を必要な件数だけ回す。
  for (let index = 0; index < picked; index += 1) {
    const offset = Math.floor(random() * (unique.length - index));
    const target =
      index + Math.min(Math.max(offset, 0), unique.length - index - 1);
    [unique[index], unique[target]] = [unique[target], unique[index]];
  }
  return unique.slice(0, picked);
}
