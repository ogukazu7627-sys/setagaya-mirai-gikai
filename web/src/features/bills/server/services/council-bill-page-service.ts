import "server-only";

import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import { findPublishedGeneralQuestionCategoryCards } from "@/features/general-questions/server/repositories/general-question-repository";
import { getRecommendationCategoryById } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { getJapanTime } from "@/lib/utils/date";
import type {
  CouncilBillCardPage,
  CouncilBillPageRequest,
} from "../../shared/types/council-bill-directory";
import {
  buildCouncilDirectoryItems,
  paginateCouncilBillDirectoryEntries,
  toGeneralQuestionDirectoryEntries,
} from "../../shared/utils/council-bill-directory";
import { COUNCIL_SEARCH_PAGE_SIZE } from "../../shared/utils/council-search";
import { THEME_BILLS_PAGE_SIZE } from "../../shared/utils/theme-bills";
import { loadCouncilBillCardsByIds } from "../loaders/load-council-bill-cards";
import { findPublishedCouncilBillDirectoryEntries } from "../repositories/council-bill-directory-repository";

type CouncilBillPageDependencies = {
  now?: () => Date;
  getDifficulty?: typeof getDifficultyLevel;
  findSessions?: typeof findDietSessionsStartingBetween;
  findEntries?: typeof findPublishedCouncilBillDirectoryEntries;
  findGeneralQuestionCategories?: typeof findPublishedGeneralQuestionCategoryCards;
  loadCards?: typeof loadCouncilBillCardsByIds;
};

export async function loadCouncilBillPage(
  input: CouncilBillPageRequest,
  dependencies: CouncilBillPageDependencies = {}
): Promise<CouncilBillCardPage> {
  const now = dependencies.now?.() ?? getJapanTime();
  const currentYear = getCalendarYearFromDate(now);
  const year = input.mode === "filters" ? currentYear : input.year;
  if (year > currentYear) {
    return emptyCouncilBillPage();
  }

  const range = getCalendarYearRange(year);
  const [difficultyLevel, sessions] = await Promise.all([
    (dependencies.getDifficulty ?? getDifficultyLevel)(),
    (dependencies.findSessions ?? findDietSessionsStartingBetween)(
      range.startDate,
      range.endDate
    ),
  ]);
  const dietSessionIds = sessions.map(({ id }) => id);
  const [billEntries, generalQuestionCategories] = await Promise.all([
    (dependencies.findEntries ?? findPublishedCouncilBillDirectoryEntries)(
      dietSessionIds,
      difficultyLevel
    ),
    (
      dependencies.findGeneralQuestionCategories ??
      findPublishedGeneralQuestionCategoryCards
    )(dietSessionIds, year),
  ]);
  const entries = [
    ...billEntries,
    ...toGeneralQuestionDirectoryEntries(generalQuestionCategories),
  ];
  const theme = input.themeId
    ? getRecommendationCategoryById(input.themeId)
    : null;
  const page = paginateCouncilBillDirectoryEntries(
    entries,
    {
      contentType: input.mode === "filters" ? input.contentType : "all",
      majorCategory: theme?.label ?? null,
      committeeName:
        input.mode === "filters" && input.committeeName
          ? input.committeeName
          : null,
    },
    input.page,
    input.mode === "filters" ? COUNCIL_SEARCH_PAGE_SIZE : THEME_BILLS_PAGE_SIZE
  );
  const bills = await (dependencies.loadCards ?? loadCouncilBillCardsByIds)(
    page.billIds,
    dietSessionIds,
    difficultyLevel
  );

  return {
    bills,
    items: buildCouncilDirectoryItems(page.entries, bills),
    total: page.total,
    currentPage: page.currentPage,
    totalPages: page.totalPages,
  };
}

function emptyCouncilBillPage(): CouncilBillCardPage {
  return {
    bills: [],
    items: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
  };
}
