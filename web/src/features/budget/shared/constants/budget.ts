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

export const BUDGET_DIRECTORY_MAX_PAGE = 1000;
export const BUDGET_DIRECTORY_MAX_PAGE_SIZE = 50;
export const BUDGET_PROGRAM_DIRECTORY_PAGE_SIZE = 24;
export const BUDGET_REVENUE_DIRECTORY_PAGE_SIZE = 10;

export const BUDGET_SEARCH_ANONYMOUS_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  installationLimit: 30,
  ipLimit: 150,
} as const;

export const BUDGET_PUBLIC_FISCAL_YEAR = 2026;
export const BUDGET_PUBLIC_BUDGET_TYPE = "initial_budget";

export const BUDGET_EXPLORATION_CATEGORIES = [
  {
    slug: "education",
    name: "教育",
    shortDescription: "学校、教育環境、学びの支援",
    tone: "cyan",
  },
  {
    slug: "child-rearing",
    name: "子育て",
    shortDescription: "保育、子どもの権利、妊娠・出産",
    tone: "mint",
  },
  {
    slug: "welfare",
    name: "福祉",
    shortDescription: "医療、高齢者、介護、生活支援",
    tone: "gold",
  },
  {
    slug: "urban-development",
    name: "まちづくり",
    shortDescription: "都市計画、道路、公園、住宅、交通",
    tone: "cyan",
  },
  {
    slug: "disaster-prevention",
    name: "防災",
    shortDescription: "災害対策、避難、防災情報、消防・救急",
    tone: "gold",
  },
  {
    slug: "administration-finance",
    name: "行財政",
    shortDescription: "行政計画、財政、契約、行政DX",
    tone: "mint",
  },
  {
    slug: "culture-sports",
    name: "文化・スポーツ",
    shortDescription: "文化施設、スポーツ、生涯学習、交流",
    tone: "gold",
  },
  {
    slug: "industry",
    name: "産業",
    shortDescription: "商店街、創業、雇用、観光、都市農業",
    tone: "cyan",
  },
  {
    slug: "environment",
    name: "環境問題",
    shortDescription: "気候変動、脱炭素、ごみ、農地",
    tone: "mint",
  },
  {
    slug: "daily-life",
    name: "暮らし",
    shortDescription: "区民施設、地域参加、多文化共生、防犯",
    tone: "cyan",
  },
] as const;

export type BudgetExplorationCategorySlug =
  (typeof BUDGET_EXPLORATION_CATEGORIES)[number]["slug"];

export const BUDGET_SEARCH_EVENT_NAMES = {
  focus: "mirai-budget-search-focus",
  submit: "mirai-budget-search-submit",
} as const;
