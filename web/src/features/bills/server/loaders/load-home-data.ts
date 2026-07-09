import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import {
  findDietSessionsStartingBefore,
  findDietSessionsStartingBetween,
} from "@/features/diet-sessions/server/repositories/diet-session-repository";
import {
  getFiscalYearFromDate,
  getFiscalYearRange,
  parseFiscalYear,
} from "@/features/diet-sessions/shared/utils/fiscal-year";
import {
  getSetagayaMockBills,
  getSetagayaMockBillsByMajorCategory,
  isSetagayaMockMode,
} from "@/lib/setagaya-mock";
import {
  type Bill,
  type BillContent,
  type BillsByMajorCategory,
  type BillWithContent,
  MAJOR_CATEGORY_OPTIONS,
} from "../../shared/types";
import { sortBillsForHomeList } from "../../shared/utils/sort-bills";
import {
  findBillIdsWithPublicInterview,
  findFeaturedBillsByDietSessionIds,
  findPublishedBillsByDietSessionIds,
  findTagsByBillIds,
} from "../repositories/bill-repository";

type HomeDataOptions = {
  currentDate: Date;
  archiveYear?: string | string[];
};

export type FiscalArchiveData = {
  years: number[];
  selectedYear: number | null;
  billsByMajorCategory: BillsByMajorCategory[];
};

type BillRowWithContent = Bill & {
  bill_contents: BillContent[] | BillContent | null;
  tags?: unknown;
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

  const currentFiscalYear = getFiscalYearFromDate(options.currentDate);
  const currentFiscalRange = getFiscalYearRange(currentFiscalYear);
  const [difficultyLevel, currentFiscalSessions, pastSessions] =
    await Promise.all([
      getDifficultyLevel(),
      findDietSessionsStartingBetween(
        currentFiscalRange.startDate,
        currentFiscalRange.endDate
      ),
      findDietSessionsStartingBefore(currentFiscalRange.startDate),
    ]);

  const currentFiscalSessionIds = currentFiscalSessions.map(
    (session) => session.id
  );
  const archiveYears = uniqueFiscalYearsFromSessions(pastSessions);
  const requestedArchiveYear = parseFiscalYear(options.archiveYear);
  const selectedArchiveYear =
    requestedArchiveYear != null && archiveYears.includes(requestedArchiveYear)
      ? requestedArchiveYear
      : (archiveYears[0] ?? null);
  const archiveRange =
    selectedArchiveYear != null
      ? getFiscalYearRange(selectedArchiveYear)
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
      findFeaturedBillsByDietSessionIds(
        currentFiscalSessionIds,
        difficultyLevel
      ),
      findPublishedBillsByDietSessionIds(
        currentFiscalSessionIds,
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

function groupBillsByMajorCategory(
  bills: BillWithContent[]
): BillsByMajorCategory[] {
  const uniqueBills = Array.from(
    new Map(bills.map((bill) => [bill.id, bill])).values()
  );
  const sortedBills = sortBillsForHomeList(uniqueBills);

  return MAJOR_CATEGORY_OPTIONS.map((category) => ({
    category,
    bills: sortedBills.filter((bill) => bill.major_category === category.label),
  })).filter(({ bills }) => bills.length > 0);
}

async function buildBillsWithContent(
  rows: BillRowWithContent[]
): Promise<BillWithContent[]> {
  if (rows.length === 0) {
    return [];
  }

  const billIds = rows.map((item) => item.id);
  const [tagsByBillId, interviewBillIds] = await Promise.all([
    findTagsByBillIds(billIds),
    findBillIdsWithPublicInterview(billIds),
  ]);

  return rows.map((item) => {
    const { bill_contents, tags: _joinedTags, ...bill } = item;
    return {
      ...bill,
      bill_content: Array.isArray(bill_contents)
        ? bill_contents[0]
        : (bill_contents ?? undefined),
      tags: tagsByBillId.get(item.id) ?? [],
      hasPublicInterview: interviewBillIds.has(item.id),
    };
  }) as BillWithContent[];
}

function uniqueFiscalYearsFromSessions(
  sessions: Array<{ start_date: string }>
): number[] {
  return Array.from(
    new Set(
      sessions.map((session) => getFiscalYearFromDate(session.start_date))
    )
  ).sort((yearA, yearB) => yearB - yearA);
}
