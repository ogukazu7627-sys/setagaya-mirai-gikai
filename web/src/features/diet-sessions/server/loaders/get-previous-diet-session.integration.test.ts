import {
  cleanupTestDietSession,
  createTestDietSession,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// unstable_cache はモジュール初期化時に評価されるため、
// setup の共通モック（vitest.integration.setup.ts）だけでは不十分。
// テストファイル内で vi.mock → 動的インポートの順序を保証する必要がある。
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: never[]) => unknown) => fn,
}));

const { getPreviousDietSession } = await import("./get-previous-diet-session");

describe("getPreviousDietSession 統合テスト", () => {
  const sessionIds: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    for (const id of sessionIds) {
      await cleanupTestDietSession(id);
    }
    sessionIds.length = 0;
  });

  it("今日開催中の会期の前の会期を返す", async () => {
    vi.setSystemTime(new Date("2028-03-01T10:00:00+09:00"));

    // 古い会期を作成
    const older = await createTestDietSession({
      start_date: "2027-01-01",
      end_date: "2027-06-30",
      slug: `test-previous-session-${Date.now()}`,
      is_active: false,
    });
    sessionIds.push(older.id);

    // 今日開催中の会期を作成
    const current = await createTestDietSession({
      start_date: "2028-01-01",
      end_date: "2028-06-30",
      slug: `test-current-session-${Date.now()}`,
      is_active: false,
    });
    sessionIds.push(current.id);

    const result = await getPreviousDietSession();

    expect(result).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: toBeNull 後に安全
    expect(new Date(result!.start_date) < new Date(current.start_date)).toBe(
      true
    );
  });
});
