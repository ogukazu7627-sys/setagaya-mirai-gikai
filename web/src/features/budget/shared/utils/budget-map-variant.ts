/**
 * 宇宙マップの描画層をv1とv2で切り替える。
 *
 * v2 が既定。v1 は比較用に残してあり、`?variant=v1` で開ける。
 * 親ページ `/budget?mapVariant=v1` からも iframe へ引き継ぐ。
 */

export type BudgetMapVariant = "v1" | "v2";

export const BUDGET_MAP_DEFAULT_VARIANT: BudgetMapVariant = "v2";
export const BUDGET_MAP_VARIANT_PARAM = "variant";
export const BUDGET_MAP_HOST_VARIANT_PARAM = "mapVariant";

/**
 * URL パラメータから描画層を決める。
 * 未指定や未知の値は既定へ倒し、想定外の入力で壊れないようにする。
 */
export function parseBudgetMapVariant(
  value: string | string[] | undefined | null
): BudgetMapVariant {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "v1" ? "v1" : BUDGET_MAP_DEFAULT_VARIANT;
}
