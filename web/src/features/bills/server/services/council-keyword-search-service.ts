import "server-only";

import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import { findPublishedGeneralQuestionCategoryCards } from "@/features/general-questions/server/repositories/general-question-repository";
import { groupGeneralQuestionSearchResults } from "@/features/general-questions/shared/utils/group-general-question-search-results";
import { getRecommendationCategoryById } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { getJapanTime } from "@/lib/utils/date";
import type {
  CouncilKeywordSearchRequest,
  CouncilKeywordSearchResponse,
} from "../../shared/types/council-keyword-search";
import { loadCouncilBillCardsByIds } from "../loaders/load-council-bill-cards";
import { findCouncilBillIdsByKeyword } from "../repositories/council-search-repository";

type CouncilKeywordSearchDependencies = {
  now?: () => Date;
  findSessions?: typeof findDietSessionsStartingBetween;
  search?: typeof findCouncilBillIdsByKeyword;
  getDifficulty?: typeof getDifficultyLevel;
  loadCards?: typeof loadCouncilBillCardsByIds;
  findGeneralQuestionCategories?: typeof findPublishedGeneralQuestionCategoryCards;
};

export async function searchCouncilBillsByKeyword(
  input: CouncilKeywordSearchRequest,
  dependencies: CouncilKeywordSearchDependencies = {}
): Promise<CouncilKeywordSearchResponse> {
  const now = dependencies.now?.() ?? getJapanTime();
  const currentYear = getCalendarYearFromDate(now);
  const range = getCalendarYearRange(currentYear);
  const [sessions, difficultyLevel] = await Promise.all([
    (dependencies.findSessions ?? findDietSessionsStartingBetween)(
      range.startDate,
      range.endDate
    ),
    (dependencies.getDifficulty ?? getDifficultyLevel)(),
  ]);
  if (sessions.length === 0) {
    return { items: [], total: 0 };
  }

  const dietSessionIds = sessions.map(({ id }) => id);
  const theme = input.themeId
    ? getRecommendationCategoryById(input.themeId)
    : null;
  const billIds = await (dependencies.search ?? findCouncilBillIdsByKeyword)({
    keyword: input.query.trim(),
    dietSessionIds,
    contentType: input.contentType === "all" ? null : input.contentType,
    majorCategory: theme?.label ?? null,
    committeeName: input.committeeName || null,
  });
  const matchedBills = await (
    dependencies.loadCards ?? loadCouncilBillCardsByIds
  )(billIds, dietSessionIds, difficultyLevel);
  const generalQuestionCategories = matchedBills.some(
    (bill) => bill.publication_category === "general_question"
  )
    ? await (
        dependencies.findGeneralQuestionCategories ??
        findPublishedGeneralQuestionCategoryCards
      )(dietSessionIds, currentYear)
    : [];
  const items = groupGeneralQuestionSearchResults(
    matchedBills,
    generalQuestionCategories,
    currentYear
  );

  return {
    items,
    total: items.length,
  };
}
