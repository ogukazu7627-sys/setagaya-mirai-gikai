import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { buildCouncilSearchBillDocuments } from "@/features/bills/shared/utils/build-council-search-documents";
import { groupBillsByMajorCategory } from "@/features/bills/shared/utils/group-bills-by-major-category";
import {
  findDietSessionsStartingBefore,
  findDietSessionsStartingBetween,
} from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import { getSetagayaMockBills, isSetagayaMockMode } from "@/lib/setagaya-mock";
import { findPublishedBillsByDietSessionIds } from "../repositories/bill-repository";
import { buildBillsWithContent } from "../utils/build-bills-with-content";
import { loadYearArchiveData } from "./load-year-archive-data";

export async function loadBillsDirectoryData(
  currentDate: Date,
  archiveYear?: string | string[]
) {
  const difficultyLevel = await getDifficultyLevel();

  if (isSetagayaMockMode) {
    const bills = getSetagayaMockBills(difficultyLevel);
    return {
      currentBills: bills,
      billsByMajorCategory: groupBillsByMajorCategory(bills),
      searchDocuments: buildCouncilSearchBillDocuments(bills),
      difficultyLevel,
      archiveData: {
        years: [],
        selectedYear: null,
        billsByMajorCategory: [],
      },
    };
  }

  const currentYear = getCalendarYearFromDate(currentDate);
  const currentYearRange = getCalendarYearRange(currentYear);
  const [currentYearSessions, pastSessions] = await Promise.all([
    findDietSessionsStartingBetween(
      currentYearRange.startDate,
      currentYearRange.endDate
    ),
    findDietSessionsStartingBefore(currentYearRange.startDate),
  ]);
  const [currentYearRows, archiveData] = await Promise.all([
    findPublishedBillsByDietSessionIds(
      currentYearSessions.map((session) => session.id),
      difficultyLevel
    ),
    loadYearArchiveData({
      archiveYear,
      difficultyLevel,
      pastSessions,
    }),
  ]);
  const currentYearBills = await buildBillsWithContent(currentYearRows);

  return {
    currentBills: currentYearBills,
    billsByMajorCategory: groupBillsByMajorCategory(currentYearBills),
    searchDocuments: buildCouncilSearchBillDocuments(currentYearBills),
    difficultyLevel,
    archiveData,
  };
}
