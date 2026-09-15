import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import { getCalendarYearRange } from "@/features/diet-sessions/shared/utils/calendar-year";
import type { RecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type {
  GeneralQuestionDietSession,
  PublishedGeneralQuestion,
} from "../../shared/types/general-question";
import {
  getGeneralQuestionCategoryById,
  getGeneralQuestionSessionKey,
} from "../../shared/utils/general-question-categories";
import {
  findPublishedGeneralQuestionCategoryCards,
  findPublishedGeneralQuestionReferenceByBillId,
  findPublishedGeneralQuestions,
} from "../repositories/general-question-repository";

type LoadGeneralQuestionCategoryPageDependencies = {
  findSessions?: typeof findDietSessionsStartingBetween;
  findQuestions?: typeof findPublishedGeneralQuestions;
};

export async function loadGeneralQuestionCategoryPage(
  input: {
    categoryId: RecommendationCategoryId;
    year: number;
    sessionKey: string;
    difficultyLevel: DifficultyLevelEnum;
  },
  dependencies: LoadGeneralQuestionCategoryPageDependencies = {}
): Promise<{
  category: NonNullable<ReturnType<typeof getGeneralQuestionCategoryById>>;
  dietSession: GeneralQuestionDietSession;
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
  const selectedSession = sessions.find(
    (session) => getGeneralQuestionSessionKey(session) === input.sessionKey
  );
  if (!selectedSession) {
    return null;
  }
  const questions = await (
    dependencies.findQuestions ?? findPublishedGeneralQuestions
  )({
    dietSessionIds: [selectedSession.id],
    majorCategory: category.label,
  });

  return {
    category,
    dietSession: {
      id: selectedSession.id,
      name: selectedSession.name,
      slug: selectedSession.slug,
      startDate: selectedSession.start_date,
    },
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

type ResolveLegacyGeneralQuestionRouteDependencies = {
  findSessions?: typeof findDietSessionsStartingBetween;
  findCategoryCards?: typeof findPublishedGeneralQuestionCategoryCards;
  findReference?: typeof findPublishedGeneralQuestionReferenceByBillId;
};

export async function resolveLegacyGeneralQuestionCategoryRoute(
  input: {
    categoryId: RecommendationCategoryId;
    year: number;
    focusBillId: string | null;
  },
  dependencies: ResolveLegacyGeneralQuestionRouteDependencies = {}
): Promise<{
  categoryId: RecommendationCategoryId;
  year: number;
  sessionKey: string;
  focusBillId: string | null;
} | null> {
  if (input.focusBillId) {
    const reference = await (
      dependencies.findReference ??
      findPublishedGeneralQuestionReferenceByBillId
    )(input.focusBillId);
    if (reference) {
      return {
        categoryId: reference.categoryId,
        year: reference.year,
        sessionKey: reference.sessionKey,
        focusBillId: input.focusBillId,
      };
    }
  }

  const range = getCalendarYearRange(input.year);
  const sessions = await (
    dependencies.findSessions ?? findDietSessionsStartingBetween
  )(range.startDate, range.endDate);
  const cards = await (
    dependencies.findCategoryCards ?? findPublishedGeneralQuestionCategoryCards
  )(
    sessions.map((session) => session.id),
    input.year
  );
  const target = cards
    .filter((card) => card.categoryId === input.categoryId)
    .sort((left, right) =>
      (right.dietSession.startDate ?? "").localeCompare(
        left.dietSession.startDate ?? ""
      )
    )[0];
  return target
    ? {
        categoryId: target.categoryId,
        year: target.year,
        sessionKey: getGeneralQuestionSessionKey(target.dietSession),
        focusBillId: null,
      }
    : null;
}
