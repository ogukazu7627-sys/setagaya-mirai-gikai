import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { BudgetQuestionCategorySlug } from "../constants/budget-question-categories";
import type { BudgetMapQuestion } from "../utils/budget-map-question-orbit";

export type BudgetQuestionCouncilor = {
  id: string;
  displayName: string;
  iconUrl: string;
};

export type BudgetQuestionContent = {
  difficultyLevel: DifficultyLevelEnum;
  title: string;
  summary: string;
  content: string;
};

export type PublishedBudgetQuestion = {
  id: string;
  name: string;
  categorySlug: BudgetQuestionCategorySlug;
  majorCategory: string;
  submittedDate: string | null;
  publishedAt: string | null;
  updatedAt: string;
  dietSession: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  partyOrGroup: string | null;
  councilor: BudgetQuestionCouncilor;
  contents: Partial<Record<DifficultyLevelEnum, BudgetQuestionContent>>;
};

export type BudgetQuestionMapGroups = Record<
  BudgetQuestionCategorySlug,
  BudgetMapQuestion[]
>;
