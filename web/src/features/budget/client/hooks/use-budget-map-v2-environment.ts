"use client";

import { useEffect, useState } from "react";
import type { BudgetMapMode } from "../../shared/utils/budget-map-layout";

const DESKTOP_QUERY = "(min-width: 1000px)";
const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * breakpoint は 1000px の1点だけ。ここ以外で分岐を増やさない。
 * 初期値は mobile 側に寄せ、SSR と最初の描画を一致させる。
 */
export function useBudgetMapV2Mode(): BudgetMapMode {
  const matches = useMediaQuery(DESKTOP_QUERY);
  return matches ? "desktop" : "mobile";
}

/** OS 設定で動きを減らす指定があれば、演出だけを止める。 */
export function useBudgetMapV2ReduceMotion(): boolean {
  return useMediaQuery(REDUCE_MOTION_QUERY);
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}
