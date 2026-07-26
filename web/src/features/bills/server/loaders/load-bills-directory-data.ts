import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { groupBillsByMajorCategory } from "@/features/bills/shared/utils/group-bills-by-major-category";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import {
  getSetagayaMockBillsByMajorCategory,
  isSetagayaMockMode,
} from "@/lib/setagaya-mock";
import { findPublishedBillsByDietSessionIds } from "../repositories/bill-repository";
import { buildBillsWithContent } from "../utils/build-bills-with-content";

export async function loadBillsDirectoryData(currentDate: Date) {
  if (isSetagayaMockMode) {
    return {
      billsByMajorCategory: getSetagayaMockBillsByMajorCategory("normal"),
    };
  }

  const currentYear = getCalendarYearFromDate(currentDate);
  const currentYearRange = getCalendarYearRange(currentYear);
  const [difficultyLevel, currentYearSessions] = await Promise.all([
    getDifficultyLevel(),
    findDietSessionsStartingBetween(
      currentYearRange.startDate,
      currentYearRange.endDate
    ),
  ]);
  const billRows = await findPublishedBillsByDietSessionIds(
    currentYearSessions.map((session) => session.id),
    difficultyLevel
  );
  const bills = await buildBillsWithContent(billRows);

  return {
    billsByMajorCategory: groupBillsByMajorCategory(bills),
  };
}
