import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBudgetExplorationData: vi.fn(),
}));

vi.mock("../services/budget-exploration-service", () => mocks);

import { loadBudgetExploration } from "./load-budget-exploration";

describe("loadBudgetExploration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.getBudgetExplorationData.mockReset();
  });

  it("取得成功時は公開探索データをそのまま返す", async () => {
    const exploration = {
      activeDatasetId: "11111111-1111-4111-8111-111111111111",
      availability: "available" as const,
      categories: [],
    };
    mocks.getBudgetExplorationData.mockResolvedValue(exploration);

    await expect(loadBudgetExploration()).resolves.toBe(exploration);
  });

  it("取得障害を未整理データと区別し、10分類の安全な導線を残す", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getBudgetExplorationData.mockRejectedValue(
      new Error("database unavailable")
    );

    const result = await loadBudgetExploration();

    expect(result.activeDatasetId).toBeNull();
    expect(result.availability).toBe("temporarily_unavailable");
    expect(result.categories).toHaveLength(10);
    expect(
      result.categories.every((category) => category.topics.length === 0)
    ).toBe(true);
    expect(console.error).toHaveBeenCalledWith(
      "[budget] Failed to load the public exploration",
      expect.any(Error)
    );
  });
});
