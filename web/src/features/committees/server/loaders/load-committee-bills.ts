import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { findPublishedBillsByCommitteeSearchTerm } from "@/features/bills/server/repositories/bill-repository";
import { buildBillsWithContent } from "@/features/bills/server/utils/build-bills-with-content";
import type { BillWithContent } from "@/features/bills/shared/types";
import {
  getCommitteeSearchTerm,
  statusNoteMatchesCommittee,
} from "@/features/committees/shared/committee-matching";
import { findDietSessionsStartingBetween } from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getCalendarYearFromDate,
  getCalendarYearRange,
} from "@/features/diet-sessions/shared/utils/calendar-year";
import { getSetagayaMockBills, isSetagayaMockMode } from "@/lib/setagaya-mock";

const COMMITTEE_BILL_LIMIT = 6;

export async function loadCommitteeBills(
  committeeName: string,
  difficultyLevel: DifficultyLevelEnum,
  currentDate: Date
): Promise<BillWithContent[]> {
  if (isSetagayaMockMode) {
    return getSetagayaMockBills(difficultyLevel)
      .filter((bill) =>
        statusNoteMatchesCommittee(bill.status_note, committeeName)
      )
      .slice(0, COMMITTEE_BILL_LIMIT);
  }

  const currentYearRange = getCalendarYearRange(
    getCalendarYearFromDate(currentDate)
  );
  const currentYearSessions = await findDietSessionsStartingBetween(
    currentYearRange.startDate,
    currentYearRange.endDate
  );
  const rows = await findPublishedBillsByCommitteeSearchTerm(
    getCommitteeSearchTerm(committeeName),
    difficultyLevel,
    currentYearSessions.map((session) => session.id),
    COMMITTEE_BILL_LIMIT
  );
  return buildBillsWithContent(rows);
}
