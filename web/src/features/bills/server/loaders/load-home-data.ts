import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import { getSetagayaMockBills, isSetagayaMockMode } from "@/lib/setagaya-mock";
import { findFeaturedBillsByDietSessionIds } from "../repositories/bill-repository";
import { buildBillsWithContent } from "../utils/build-bills-with-content";

type HomeDataOptions = {
  currentDate: Date;
};

/** トップページに表示する注目案件を取得する。 */
export async function loadHomeData(options: HomeDataOptions) {
  if (isSetagayaMockMode) {
    const featuredBills = getSetagayaMockBills("normal").filter(
      (bill) => bill.is_featured
    );
    return { featuredBills };
  }

  const currentYear = getCalendarYearFromDate(options.currentDate);
  const currentYearRange = getCalendarYearRange(currentYear);
  const [difficultyLevel, currentYearSessions] = await Promise.all([
    getDifficultyLevel(),
    findDietSessionsStartingBetween(
      currentYearRange.startDate,
      currentYearRange.endDate
    ),
  ]);

  const currentYearSessionIds = currentYearSessions.map(
    (session) => session.id
  );

  const featuredBillRows = await findFeaturedBillsByDietSessionIds(
    currentYearSessionIds,
    difficultyLevel
  );
  const featuredBills = await buildBillsWithContent(featuredBillRows);

  return { featuredBills };
}
