// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { TopicFilter } from "../../shared/utils/filter-topics";
import { useFilteredPagination } from "./use-filtered-pagination";

type Item = {
  id: number;
  filter: "affected" | "citizen";
};

const items: Item[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  filter: index % 2 === 0 ? "affected" : "citizen",
}));

function filterItems(source: Item[], filter: TopicFilter): Item[] {
  if (filter === "affected" || filter === "citizen") {
    return source.filter((item) => item.filter === filter);
  }
  return source;
}

describe("useFilteredPagination", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("フィルタと表示件数を同じ閲覧セッションで復元する", () => {
    const first = renderHook(() =>
      useFilteredPagination(items, filterItems, 2, 2, "opinions:test")
    );

    act(() => {
      first.result.current.selectFilter("affected");
    });
    act(() => {
      first.result.current.loadMore();
    });
    expect(first.result.current.filter).toBe("affected");
    expect(first.result.current.visible).toHaveLength(4);
    first.unmount();

    const restored = renderHook(() =>
      useFilteredPagination(items, filterItems, 2, 2, "opinions:test")
    );

    expect(restored.result.current.filter).toBe("affected");
    expect(restored.result.current.visible).toHaveLength(4);
  });
});
