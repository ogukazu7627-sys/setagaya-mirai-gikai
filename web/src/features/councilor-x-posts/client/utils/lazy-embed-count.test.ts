import { describe, expect, it } from "vitest";
import { getNextXEmbedCount, INITIAL_X_EMBED_COUNT } from "./lazy-embed-count";

describe("getNextXEmbedCount", () => {
  it("最初は7件だけを対象にする", () => {
    expect(INITIAL_X_EMBED_COUNT).toBe(7);
    expect(
      getNextXEmbedCount({
        currentCount: 0,
        furthestVisibleIndex: 0,
        totalCount: 50,
      })
    ).toBe(7);
  });

  it("移動先から7件先まで増やし、減らしたり総件数を超えたりしない", () => {
    expect(
      getNextXEmbedCount({
        currentCount: 7,
        furthestVisibleIndex: 6,
        totalCount: 50,
      })
    ).toBe(13);
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
