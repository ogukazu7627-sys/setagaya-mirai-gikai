import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import {
  findDietSessionsStartingBefore,
  findDietSessionsStartingBetween,
} from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import {
  getSetagayaMockBills,
  getSetagayaMockBillsByMajorCategory,
  isSetagayaMockMode,
} from "@/lib/setagaya-mock";
import { groupBillsByMajorCategory } from "../../shared/utils/group-bills-by-major-category";
import {
  findFeaturedBillsByDietSessionIds,
  findPublishedBillsByDietSessionIds,
} from "../repositories/bill-repository";
import { buildBillsWithContent } from "../utils/build-bills-with-content";
import { loadYearArchiveData } from "./load-year-archive-data";

type HomeDataOptions = {
  currentDate: Date;
  archiveYear?: string | string[];
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

  const [featuredBillRows, currentBillRows, archiveData] = await Promise.all([
    findFeaturedBillsByDietSessionIds(currentYearSessionIds, difficultyLevel),
    findPublishedBillsByDietSessionIds(currentYearSessionIds, difficultyLevel),
    loadYearArchiveData({
      archiveYear: options.archiveYear,
      difficultyLevel,
      pastSessions,
    }),
  ]);

  const [featuredBills, currentBills] = await Promise.all([
    buildBillsWithContent(featuredBillRows),
    buildBillsWithContent(currentBillRows),
  ]);

  return {
    billsByMajorCategory: groupBillsByMajorCategory(currentBills),
    featuredBills,
    archiveData,
  };
}
