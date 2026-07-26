import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import {
  buildCouncilSearchBillDocuments,
  buildCouncilSearchBillDocumentsFromRows,
} from "@/features/bills/shared/utils/build-council-search-documents";
import { groupBillsByMajorCategory } from "@/features/bills/shared/utils/group-bills-by-major-category";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import { getSetagayaMockBills, isSetagayaMockMode } from "@/lib/setagaya-mock";
import {
  findPublishedBillSearchRows,
  findPublishedBillsByDietSessionIds,
} from "../repositories/bill-repository";
import { buildBillsWithContent } from "../utils/build-bills-with-content";

export async function loadBillsDirectoryData(currentDate: Date) {
  const difficultyLevel = await getDifficultyLevel();

  if (isSetagayaMockMode) {
    const bills = getSetagayaMockBills(difficultyLevel);
    return {
      billsByMajorCategory: groupBillsByMajorCategory(bills),
      searchDocuments: buildCouncilSearchBillDocuments(bills),
      difficultyLevel,
    };
  }

  const currentYear = getCalendarYearFromDate(currentDate);
  const currentYearRange = getCalendarYearRange(currentYear);
  const currentYearSessions = await findDietSessionsStartingBetween(
    currentYearRange.startDate,
    currentYearRange.endDate
  );
  const [currentYearRows, searchRows] = await Promise.all([
    findPublishedBillsByDietSessionIds(
      currentYearSessions.map((session) => session.id),
      difficultyLevel
    ),
    findPublishedBillSearchRows(difficultyLevel),
  ]);
  const currentYearBills = await buildBillsWithContent(currentYearRows);

  return {
    billsByMajorCategory: groupBillsByMajorCategory(currentYearBills),
    searchDocuments: buildCouncilSearchBillDocumentsFromRows(searchRows),
    difficultyLevel,
  };
}
