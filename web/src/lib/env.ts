/**
 * 環境変数の設定
 * アプリケーション全体で使用する環境変数を一元管理
 */

const isSetagayaMockMode =
  process.env.NEXT_PUBLIC_SETAGAYA_MOCK_MODE === "true" ||
  process.env.SETAGAYA_MOCK_MODE === "true";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !isSetagayaMockMode) {
  throw new Error("環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !isSetagayaMockMode) {
  throw new Error(
    "環境変数 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が設定されていません"
  );
}

const chatDailyUserCostLimitUsdRaw =
  process.env.CHAT_DAILY_USER_COST_LIMIT_USD ||
  process.env.CHAT_DAILY_COST_LIMIT_USD ||
  "0.5";

const chatDailyUserCostLimitUsd = Number(chatDailyUserCostLimitUsdRaw);

if (Number.isNaN(chatDailyUserCostLimitUsd) || chatDailyUserCostLimitUsd <= 0) {
  throw new Error(
    "環境変数 CHAT_DAILY_USER_COST_LIMIT_USD は正の数値で指定してください"
  );
}

const chatDailyTotalCostLimitUsdRaw =
  process.env.CHAT_DAILY_TOTAL_COST_LIMIT_USD || "50";

const chatDailyTotalCostLimitUsd = Number(chatDailyTotalCostLimitUsdRaw);

if (
  Number.isNaN(chatDailyTotalCostLimitUsd) ||
  chatDailyTotalCostLimitUsd <= 0
) {
  throw new Error(
    "環境変数 CHAT_DAILY_TOTAL_COST_LIMIT_USD は正の数値で指定してください"
  );
}

const chatMonthlyTotalCostLimitUsdRaw =
  process.env.CHAT_MONTHLY_TOTAL_COST_LIMIT_USD || "20";

const chatMonthlyTotalCostLimitUsd = Number(chatMonthlyTotalCostLimitUsdRaw);

if (
  Number.isNaN(chatMonthlyTotalCostLimitUsd) ||
  chatMonthlyTotalCostLimitUsd <= 0
) {
  throw new Error(
    "環境変数 CHAT_MONTHLY_TOTAL_COST_LIMIT_USD は正の数値で指定してください"
  );
}

const interviewCompleteDailyUserLimitRaw =
  process.env.INTERVIEW_COMPLETE_DAILY_USER_LIMIT || "10";

const interviewCompleteDailyUserLimit = Number(
  interviewCompleteDailyUserLimitRaw
);

if (
  !Number.isInteger(interviewCompleteDailyUserLimit) ||
  interviewCompleteDailyUserLimit <= 0
) {
  throw new Error(
    "環境変数 INTERVIEW_COMPLETE_DAILY_USER_LIMIT は正の整数で指定してください"
  );
}

export const env = {
  webUrl: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  adminUrl: process.env.ADMIN_URL || "http://localhost:3001",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "setagaya-mock-key",
  revalidateSecret: process.env.REVALIDATE_SECRET,
  adminApiToken: process.env.ADMIN_API_TOKEN,
  analytics: {
    gaTrackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
  },
  langfuse: {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
    promptLabel: process.env.LANGFUSE_PROMPT_LABEL || "production",
  },
  chat: {
    dailyUserCostLimitUsd: chatDailyUserCostLimitUsd,
    dailyTotalCostLimitUsd: chatDailyTotalCostLimitUsd,
    monthlyTotalCostLimitUsd: chatMonthlyTotalCostLimitUsd,
  },
  interviewComplete: {
    dailyUserLimit: interviewCompleteDailyUserLimit,
  },
} as const;

// 型定義
export type Env = typeof env;
