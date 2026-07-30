export const BUDGET_ACCOUNT_CODES = [
  "general",
  "national_health_insurance",
  "latter_stage_elderly_healthcare",
  "long_term_care_insurance",
  "school_lunch_fee",
] as const;

export const BUDGET_SEARCH_MAX_QUERY_LENGTH = 100;
export const BUDGET_SEARCH_MAX_PAGE = 1000;
export const BUDGET_SEARCH_MAX_PAGE_SIZE = 50;
export const BUDGET_SEARCH_DEFAULT_PAGE_SIZE = 20;

export const BUDGET_SEARCH_ANONYMOUS_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  installationLimit: 30,
  ipLimit: 150,
} as const;

export const BUDGET_PUBLIC_FISCAL_YEAR = 2026;
export const BUDGET_PUBLIC_BUDGET_TYPE = "initial_budget";

export const BUDGET_SEARCH_EVENT_NAMES = {
  focus: "mirai-budget-search-focus",
  submit: "mirai-budget-search-submit",
  topicSelect: "mirai-budget-topic-select",
} as const;
