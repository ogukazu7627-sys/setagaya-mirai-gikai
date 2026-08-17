import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import {
  type BudgetQuestionCategory,
  getBudgetQuestionCategoryBySlug,
} from "../../shared/constants/budget-question-categories";
import type {
  BudgetQuestionMapGroups,
  PublishedBudgetQuestion,
} from "../../shared/types/budget-question";
import { buildDailyBudgetQuestionGroups } from "../../shared/utils/budget-question-selection";
import { findPublishedBudgetQuestions } from "../repositories/budget-question-repository";

export async function loadBudgetQuestionMapGroups(
  now = new Date()
): Promise<BudgetQuestionMapGroups> {
  try {
    return buildDailyBudgetQuestionGroups(
      await findPublishedBudgetQuestions(),
      now
    );
  } catch (error) {
    console.error("[budget] Failed to load budget question satellites", error);
    return buildDailyBudgetQuestionGroups([], now);
  }
}

export async function loadBudgetQuestionCategoryPage(input: {
  categorySlug: string;
  difficultyLevel: DifficultyLevelEnum;
  focusBillId?: string | null;
}): Promise<{
  category: BudgetQuestionCategory;
  questions: Array<
    PublishedBudgetQuestion & {
      selectedContent: NonNullable<
        PublishedBudgetQuestion["contents"][DifficultyLevelEnum]
      >;
    }
  >;
} | null> {
  const category = getBudgetQuestionCategoryBySlug(input.categorySlug);
  if (!category) {
    return null;
  }
  const questions = (await findPublishedBudgetQuestions())
    .filter((question) => question.categorySlug === category.slug)
    .map((question) => ({
      ...question,
      selectedContent:
        question.contents[input.difficultyLevel] ?? question.contents.normal,
    }))
    .filter(
      (
        question
      ): question is PublishedBudgetQuestion & {
        selectedContent: NonNullable<
          PublishedBudgetQuestion["contents"][DifficultyLevelEnum]
        >;
      } => Boolean(question.selectedContent)
    )
    .sort((left, right) => {
      const leftFocused = left.id === input.focusBillId ? 1 : 0;
      const rightFocused = right.id === input.focusBillId ? 1 : 0;
      if (leftFocused !== rightFocused) {
        return rightFocused - leftFocused;
      }
      return (
        (right.submittedDate ?? right.updatedAt).localeCompare(
          left.submittedDate ?? left.updatedAt
        ) || left.name.localeCompare(right.name, "ja")
      );
    });

  return { category, questions };
}
