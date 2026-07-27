import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { extractCommitteeName } from "@/features/committees/shared/committee-matching";
import {
  findDietSessionsStartingBefore,
  findDietSessionsStartingBetween,
} from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import { getSetagayaMockBills, isSetagayaMockMode } from "@/lib/setagaya-mock";
import type { CouncilBillDirectoryEntry } from "../../shared/types/council-bill-directory";
import { toBillCardData } from "../../shared/utils/to-bill-card-data";
import { findPublishedCouncilBillDirectoryEntries } from "../repositories/council-bill-directory-repository";
import { loadCouncilThemeSectionData } from "./load-council-theme-section-data";
import { loadYearArchiveData } from "./load-year-archive-data";

export async function loadBillsDirectoryData(
  currentDate: Date,
  archiveYear?: string | string[]
) {
  const difficultyLevel = await getDifficultyLevel();

  if (isSetagayaMockMode) {
    const bills = getSetagayaMockBills(difficultyLevel);
    const entries = bills.map(toCouncilBillDirectoryEntry);
    const cardsById = new Map(
      bills.map((bill) => [bill.id, toBillCardData(bill)])
    );
    const themeData = await loadCouncilThemeSectionData(
      {
        year: getCalendarYearFromDate(currentDate),
        entries,
        dietSessionIds: [],
        difficultyLevel,
      },
      {
        loadCards: async (billIds) =>
          billIds.flatMap((billId) => {
            const card = cardsById.get(billId);
            return card ? [card] : [];
          }),
      }
    );
    return {
      themeData,
      difficultyLevel,
      archiveData: {
        years: [],
        selectedYear: null,
        themeData: null,
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
  const currentDietSessionIds = currentYearSessions.map(
    (session) => session.id
  );
  const [currentEntries, archiveData] = await Promise.all([
    findPublishedCouncilBillDirectoryEntries(
      currentDietSessionIds,
      difficultyLevel
    ),
    loadYearArchiveData({
      archiveYear,
      difficultyLevel,
      pastSessions,
    }),
  ]);
  const themeData = await loadCouncilThemeSectionData({
    year: currentYear,
    entries: currentEntries,
    dietSessionIds: currentDietSessionIds,
    difficultyLevel,
  });

  return {
    themeData,
    difficultyLevel,
    archiveData,
  };
}

function toCouncilBillDirectoryEntry(
  bill: ReturnType<typeof getSetagayaMockBills>[number]
): CouncilBillDirectoryEntry {
  return {
    id: bill.id,
    itemType: bill.item_type,
    majorCategory: bill.major_category ?? null,
    committeeName: extractCommitteeName(bill.status_note),
    submittedDate: bill.submitted_date,
  };
}
