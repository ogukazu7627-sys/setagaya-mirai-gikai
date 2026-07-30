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
