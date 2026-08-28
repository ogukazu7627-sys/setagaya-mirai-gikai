import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const COST_LIMIT_ENV_NAMES = [
  "CHAT_DAILY_USER_COST_LIMIT_USD",
  "CHAT_DAILY_COST_LIMIT_USD",
  "CHAT_DAILY_TOTAL_COST_LIMIT_USD",
  "CHAT_MONTHLY_TOTAL_COST_LIMIT_USD",
  "INTERVIEW_COMPLETE_DAILY_USER_LIMIT",
] as const;

async function loadEnv() {
  vi.resetModules();
  return (await import("./env")).env;
}

describe("env cost limits", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SETAGAYA_MOCK_MODE", "true");
    for (const name of COST_LIMIT_ENV_NAMES) {
      delete process.env[name];
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses conservative trial defaults", async () => {
    const env = await loadEnv();

    expect(env.chat).toEqual({
      dailyUserCostLimitUsd: 1,
      dailyTotalCostLimitUsd: 5,
      monthlyTotalCostLimitUsd: 20,
    });
    expect(env.interviewComplete.dailyUserLimit).toBe(10);
  });

  it("respects positive configured values without applying minimum floors", async () => {
    vi.stubEnv("CHAT_DAILY_USER_COST_LIMIT_USD", "0.25");
    vi.stubEnv("CHAT_DAILY_TOTAL_COST_LIMIT_USD", "2");
    vi.stubEnv("CHAT_MONTHLY_TOTAL_COST_LIMIT_USD", "8");
    vi.stubEnv("INTERVIEW_COMPLETE_DAILY_USER_LIMIT", "3");

    const env = await loadEnv();

    expect(env.chat).toEqual({
      dailyUserCostLimitUsd: 0.25,
      dailyTotalCostLimitUsd: 2,
      monthlyTotalCostLimitUsd: 8,
    });
    expect(env.interviewComplete.dailyUserLimit).toBe(3);
  });

  it("rejects non-positive configured values", async () => {
    vi.stubEnv("CHAT_DAILY_TOTAL_COST_LIMIT_USD", "0");

    await expect(loadEnv()).rejects.toThrow(
      "環境変数 CHAT_DAILY_TOTAL_COST_LIMIT_USD は正の数値で指定してください"
    );
  });
});
