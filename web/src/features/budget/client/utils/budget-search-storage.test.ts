import { describe, expect, it, vi } from "vitest";
import {
  BUDGET_SEARCH_INSTALLATION_ID_KEY,
  getBudgetSearchInstallationId,
} from "./budget-search-storage";

const installationId = "11111111-1111-4111-8111-111111111111";

describe("budget search storage", () => {
  it("保存済みUUIDを再利用する", () => {
    const storage = new Map([
      [BUDGET_SEARCH_INSTALLATION_ID_KEY, installationId],
    ]);

    expect(
      getBudgetSearchInstallationId(
        {
          getItem: (key) => storage.get(key) ?? null,
          setItem: (key, value) => storage.set(key, value),
        },
        {
          randomUUID: () => "22222222-2222-4222-8222-222222222222",
          getRandomValues: vi.fn(),
        }
      )
    ).toBe(installationId);
  });

  it("保存できない場合も一時UUIDを返す", () => {
    expect(
      getBudgetSearchInstallationId(null, {
        randomUUID: () => installationId,
        getRandomValues: vi.fn(),
      })
    ).toBe(installationId);
  });
});
