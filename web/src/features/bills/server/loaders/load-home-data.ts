import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import {
  findDietSessionsStartingBefore,
  findDietSessionsStartingBetween,
} from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
  parseCalendarYear,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import {
  getSetagayaMockBills,
  getSetagayaMockBillsByMajorCategory,
  isSetagayaMockMode,
} from "@/lib/setagaya-mock";
import type { BillsByMajorCategory } from "../../shared/types";
import { groupBillsByMajorCategory } from "../../shared/utils/group-bills-by-major-category";
import {
  findFeaturedBillsByDietSessionIds,
  findPublishedBillsByDietSessionIds,
} from "../repositories/bill-repository";
import { buildBillsWithContent } from "../utils/build-bills-with-content";

type HomeDataOptions = {
  currentDate: Date;
  archiveYear?: string | string[];
};

export type YearArchiveData = {
  years: number[];
  selectedYear: number | null;
  billsByMajorCategory: BillsByMajorCategory[];
};

/**
 * トップページ用のデータを並列取得する
 * BFF (Backend For Frontend) パターン
 */
export async function loadHomeData(options: HomeDataOptions) {
  if (isSetagayaMockMode) {
    const featuredBills = getSetagayaMockBills("normal").filter(
      (bill) => bill.is_featured
    );
    return {
      billsByMajorCategory: getSetagayaMockBillsByMajorCategory("normal"),
      featuredBills,
      archiveData: {
        years: [],
        selectedYear: null,
        billsByMajorCategory: [],
      },
    };
  }

  const currentYear = getCalendarYearFromDate(options.currentDate);
  const currentYearRange = getCalendarYearRange(currentYear);
  const [difficultyLevel, currentYearSessions, pastSessions] =
    await Promise.all([
      getDifficultyLevel(),
      findDietSessionsStartingBetween(
        currentYearRange.startDate,
        currentYearRange.endDate
      ),
      findDietSessionsStartingBefore(currentYearRange.startDate),
    ]);

  const currentYearSessionIds = currentYearSessions.map(
    (session) => session.id
  );
  const archiveYears = uniqueYearsFromSessions(pastSessions);
  const requestedArchiveYear = parseCalendarYear(options.archiveYear);
  const selectedArchiveYear =
    requestedArchiveYear != null && archiveYears.includes(requestedArchiveYear)
      ? requestedArchiveYear
      : (archiveYears[0] ?? null);
  const archiveRange =
    selectedArchiveYear != null
      ? getCalendarYearRange(selectedArchiveYear)
      : null;
  const archiveSessions = archiveRange
    ? await findDietSessionsStartingBetween(
        archiveRange.startDate,
        archiveRange.endDate
      )
    : [];
  const archiveSessionIds = archiveSessions.map((session) => session.id);

  const [featuredBillRows, currentBillRows, archiveBillRows] =
    await Promise.all([
      findFeaturedBillsByDietSessionIds(currentYearSessionIds, difficultyLevel),
      findPublishedBillsByDietSessionIds(
        currentYearSessionIds,
        difficultyLevel
      ),
      findPublishedBillsByDietSessionIds(archiveSessionIds, difficultyLevel),
    ]);

  const [featuredBills, currentBills, archiveBills] = await Promise.all([
    buildBillsWithContent(featuredBillRows),
    buildBillsWithContent(currentBillRows),
    buildBillsWithContent(archiveBillRows),
  ]);

  return {
    billsByMajorCategory: groupBillsByMajorCategory(currentBills),
    featuredBills,
    archiveData: {
      years: archiveYears,
      selectedYear: selectedArchiveYear,
      billsByMajorCategory: groupBillsByMajorCategory(archiveBills),
    },
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
