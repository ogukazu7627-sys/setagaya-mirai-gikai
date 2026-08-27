import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import { getCalendarYearRange } from "@/features/diet-sessions/shared/utils/calendar-year";
import type { RecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { PublishedGeneralQuestion } from "../../shared/types/general-question";
import { getGeneralQuestionCategoryById } from "../../shared/utils/general-question-categories";
import { findPublishedGeneralQuestions } from "../repositories/general-question-repository";

type LoadGeneralQuestionCategoryPageDependencies = {
  findSessions?: typeof findDietSessionsStartingBetween;
  findQuestions?: typeof findPublishedGeneralQuestions;
};

export async function loadGeneralQuestionCategoryPage(
  input: {
    categoryId: RecommendationCategoryId;
    year: number;
    difficultyLevel: DifficultyLevelEnum;
  },
  dependencies: LoadGeneralQuestionCategoryPageDependencies = {}
): Promise<{
  category: NonNullable<ReturnType<typeof getGeneralQuestionCategoryById>>;
  year: number;
  questions: Array<
    PublishedGeneralQuestion & {
      selectedContent: NonNullable<
        PublishedGeneralQuestion["contents"][DifficultyLevelEnum]
      >;
    }
  >;
} | null> {
  const category = getGeneralQuestionCategoryById(input.categoryId);
  if (!category) {
    return null;
  }

  const range = getCalendarYearRange(input.year);
  const sessions = await (
    dependencies.findSessions ?? findDietSessionsStartingBetween
  )(range.startDate, range.endDate);
  const questions = await (
    dependencies.findQuestions ?? findPublishedGeneralQuestions
  )({
    dietSessionIds: sessions.map((session) => session.id),
    majorCategory: category.label,
  });

  return {
    category,
    year: input.year,
    questions: questions
      .map((question) => ({
        ...question,
        selectedContent:
          question.contents[input.difficultyLevel] ?? question.contents.normal,
      }))
      .filter(
        (
          question
        ): question is PublishedGeneralQuestion & {
          selectedContent: NonNullable<
            PublishedGeneralQuestion["contents"][DifficultyLevelEnum]
          >;
        } => Boolean(question.selectedContent)
      )
      .sort(
        (left, right) =>
          (right.submittedDate ?? right.updatedAt).localeCompare(
            left.submittedDate ?? left.updatedAt
          ) || left.name.localeCompare(right.name, "ja")
      ),
  };
}
