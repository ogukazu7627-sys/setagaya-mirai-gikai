"use client";

import { useEffect, useMemo, useState } from "react";
import {
  readComponentState,
  writeComponentState,
} from "@/features/public-view-state/client/utils/public-view-state-storage";
import {
  parseTopicFilter,
  type TopicFilter,
} from "../../shared/utils/filter-topics";

type StoredFilteredPaginationState = {
  filter: TopicFilter;
  visibleCount: number;
};

function isStoredFilteredPaginationState(
  value: unknown
): value is StoredFilteredPaginationState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<StoredFilteredPaginationState>;
  return (
    typeof candidate.filter === "string" &&
    parseTopicFilter(candidate.filter) === candidate.filter &&
    typeof candidate.visibleCount === "number" &&
    Number.isInteger(candidate.visibleCount) &&
    candidate.visibleCount > 0
  );
}

/**
 * トピック一覧・意見一覧で共通の「フィルタ + 段階表示」状態を管理するフック。
 *
 * - フィルタchipを再選択したら all に戻す（トグル解除）。
 * - フィルタ変更時は表示件数を初期値にリセットする。
 * - filterFn は安定参照のモジュール関数を渡すこと（毎レンダー生成しない）。
 * - persistKey を渡すと表示件数とフィルタを sessionStorage に保存し、別ページから
 *   戻った際に復元する（トピック詳細→一覧の「戻る」でフィルタ・ページネーション位置を
 *   維持する用途）。
 */
export function useFilteredPagination<T>(
  items: T[],
  filterFn: (items: T[], filter: TopicFilter) => T[],
  initialVisible: number,
  loadStep: number,
  persistKey?: string
) {
  const [filter, setFilter] = useState<TopicFilter>("all");
  const [visibleCount, setVisibleCount] = useState(initialVisible);

  // 戻り遷移時にフィルタとページネーション位置を復元する。
  // ハイドレーション不整合を避けるため初期値はそのままにし、
  // マウント後の effect で sessionStorage の値を反映する。
  useEffect(() => {
    if (!persistKey) {
      return;
    }

    const stored = readComponentState(
      persistKey,
      isStoredFilteredPaginationState
    );
    setFilter(stored?.filter ?? "all");
    setVisibleCount(stored?.visibleCount ?? initialVisible);
  }, [persistKey, initialVisible]);

  const persist = (nextFilter: TopicFilter, nextVisibleCount: number) => {
    if (persistKey) {
      writeComponentState(persistKey, {
        filter: nextFilter,
        visibleCount: nextVisibleCount,
      } satisfies StoredFilteredPaginationState);
    }
  };

  const filtered = useMemo(
    () => filterFn(items, filter),
    [items, filter, filterFn]
  );

  const selectFilter = (next: TopicFilter) => {
    // トグル解除（同じchip再選択）も考慮して、確定後のフィルタ値を保存する。
    const resolved = filter === next ? "all" : next;
    setFilter(resolved);
    setVisibleCount(initialVisible);
    persist(resolved, initialVisible);
  };

  const loadMore = () => {
    setVisibleCount((count) => {
      const next = count + loadStep;
      persist(filter, next);
      return next;
    });
  };

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  return { filter, filtered, visible, remaining, selectFilter, loadMore };
}
