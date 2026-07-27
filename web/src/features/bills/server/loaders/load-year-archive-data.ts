import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
  parseCalendarYear,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import type { CouncilThemeSectionData } from "../../shared/types/council-bill-directory";
import { findPublishedCouncilBillDirectoryEntries } from "../repositories/council-bill-directory-repository";
import { loadCouncilThemeSectionData } from "./load-council-theme-section-data";

export type YearArchiveData = {
  years: number[];
  selectedYear: number | null;
  themeData: CouncilThemeSectionData | null;
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
      : null;

  if (selectedYear == null) {
    return {
      years,
      selectedYear: null,
      themeData: null,
    };
  }

  const selectedYearRange = getCalendarYearRange(selectedYear);
  const sessions = await findDietSessionsStartingBetween(
    selectedYearRange.startDate,
    selectedYearRange.endDate
  );
  const dietSessionIds = sessions.map((session) => session.id);
  const entries = await findPublishedCouncilBillDirectoryEntries(
    dietSessionIds,
    difficultyLevel
  );
  const themeData = await loadCouncilThemeSectionData({
    year: selectedYear,
    entries,
    dietSessionIds,
    difficultyLevel,
  });

  return {
    years,
    selectedYear,
    themeData,
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
