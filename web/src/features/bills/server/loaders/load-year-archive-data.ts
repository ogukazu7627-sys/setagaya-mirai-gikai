import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
  parseCalendarYear,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import type { BillsByMajorCategory } from "../../shared/types";
import { groupBillsByMajorCategory } from "../../shared/utils/group-bills-by-major-category";
import { findPublishedBillsByDietSessionIds } from "../repositories/bill-repository";
import { buildBillsWithContent } from "../utils/build-bills-with-content";

export type YearArchiveData = {
  years: number[];
  selectedYear: number | null;
  billsByMajorCategory: BillsByMajorCategory[];
};

type LoadYearArchiveDataOptions = {
  archiveYear?: string | string[];
  difficultyLevel: DifficultyLevelEnum;
  pastSessions: Array<{ start_date: string }>;
};

export async function loadYearArchiveData({
  archiveYear,
  difficultyLevel,
  pastSessions,
}: LoadYearArchiveDataOptions): Promise<YearArchiveData> {
  const years = uniqueYearsFromSessions(pastSessions);
  const requestedYear = parseCalendarYear(archiveYear);
  const selectedYear =
    requestedYear != null && years.includes(requestedYear)
      ? requestedYear
      : (years[0] ?? null);

  if (selectedYear == null) {
    return {
      years,
      selectedYear: null,
      billsByMajorCategory: [],
    };
  }

  const selectedYearRange = getCalendarYearRange(selectedYear);
  const sessions = await findDietSessionsStartingBetween(
    selectedYearRange.startDate,
    selectedYearRange.endDate
  );
  const rows = await findPublishedBillsByDietSessionIds(
    sessions.map((session) => session.id),
    difficultyLevel
  );
  const bills = await buildBillsWithContent(rows);

  return {
    years,
    selectedYear,
    billsByMajorCategory: groupBillsByMajorCategory(bills),
  };
}

function uniqueYearsFromSessions(
  sessions: Array<{ start_date: string }>
): number[] {
  return Array.from(
    new Set(
      sessions.map((session) => getCalendarYearFromDate(session.start_date))
    )
  ).sort((yearA, yearB) => yearB - yearA);
}
