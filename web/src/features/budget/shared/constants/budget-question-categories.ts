import { BUDGET_OVERALL_MAJOR_CATEGORY } from "./budget-major-category";

export const BUDGET_QUESTION_CATEGORIES = [
  {
    slug: "all",
    name: BUDGET_OVERALL_MAJOR_CATEGORY,
    majorCategory: BUDGET_OVERALL_MAJOR_CATEGORY,
  },
  { slug: "education", name: "教育", majorCategory: "教育🏫" },
  {
    slug: "child-rearing",
    name: "子育て",
    majorCategory: "子育て👶",
  },
  { slug: "welfare", name: "福祉", majorCategory: "福祉🤝" },
  {
    slug: "urban-development",
    name: "まちづくり",
    majorCategory: "まちづくり🏗️",
  },
  {
    slug: "disaster-prevention",
    name: "防災",
    majorCategory: "防災☔",
  },
  {
    slug: "administration-finance",
    name: "行財政",
    majorCategory: "行財政🏛️",
  },
  {
    slug: "culture-sports",
    name: "文化・スポーツ",
    majorCategory: "文化・スポーツ📚",
  },
  { slug: "industry", name: "産業", majorCategory: "産業💡" },
  {
    slug: "environment",
    name: "環境問題",
    majorCategory: "環境問題🌿",
  },
  {
    slug: "daily-life",
    name: "暮らし",
    majorCategory: "暮らし🙋",
  },
] as const;

export type BudgetQuestionCategory =
  (typeof BUDGET_QUESTION_CATEGORIES)[number];
export type BudgetQuestionCategorySlug = BudgetQuestionCategory["slug"];

export function isBudgetQuestionCategorySlug(
  slug: string
): slug is BudgetQuestionCategorySlug {
  return BUDGET_QUESTION_CATEGORIES.some((category) => category.slug === slug);
}

export function getBudgetQuestionCategoryBySlug(
  slug: string
): BudgetQuestionCategory | null {
  return (
    BUDGET_QUESTION_CATEGORIES.find((category) => category.slug === slug) ??
    null
  );
}

export function getBudgetQuestionCategoryByMajorCategory(
  majorCategory: string | null | undefined
): BudgetQuestionCategory | null {
  return (
    BUDGET_QUESTION_CATEGORIES.find(
      (category) => category.majorCategory === majorCategory
    ) ?? null
  );
}
