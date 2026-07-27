import { describe, expect, it } from "vitest";
import { getNextXEmbedCount, INITIAL_X_EMBED_COUNT } from "./lazy-embed-count";

describe("getNextXEmbedCount", () => {
  it("最初は4件だけを対象にする", () => {
    expect(INITIAL_X_EMBED_COUNT).toBe(4);
    expect(
      getNextXEmbedCount({
        currentCount: 0,
        furthestVisibleIndex: 0,
        totalCount: 50,
      })
    ).toBe(4);
  });

  it("移動先から4件先まで増やし、減らしたり総件数を超えたりしない", () => {
    expect(
      getNextXEmbedCount({
        currentCount: 4,
        furthestVisibleIndex: 3,
        totalCount: 50,
      })
    ).toBe(7);
    expect(
      getNextXEmbedCount({
        currentCount: 20,
        furthestVisibleIndex: 2,
        totalCount: 50,
      })
    ).toBe(20);
    expect(
      getNextXEmbedCount({
        currentCount: 48,
        furthestVisibleIndex: 49,
        totalCount: 50,
      })
    ).toBe(50);
  });
});
