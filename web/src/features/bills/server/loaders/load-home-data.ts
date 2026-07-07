import {
  getSetagayaMockBills,
  getSetagayaMockBillsByMajorCategory,
  isSetagayaMockMode,
} from "@/lib/setagaya-mock";
import {
  type BillsByMajorCategory,
  type BillWithContent,
  MAJOR_CATEGORY_OPTIONS,
} from "../../shared/types";
import { getBills } from "./get-bills";
import { getFeaturedBills } from "./get-featured-bills";
import { getPreviousSessionBills } from "./get-previous-session-bills";

/**
 * トップページ用のデータを並列取得する
 * BFF (Backend For Frontend) パターン
 */
export async function loadHomeData() {
  if (isSetagayaMockMode) {
    const featuredBills = getSetagayaMockBills("normal").filter(
      (bill) => bill.is_featured
    );
    return {
      billsByMajorCategory: getSetagayaMockBillsByMajorCategory("normal"),
      featuredBills,
      previousSessionData: null,
    };
  }

  const [featuredBills, bills, previousSessionData] = await Promise.all([
    getFeaturedBills(),
    getBills(),
    getPreviousSessionBills(),
  ]);

  return {
    billsByMajorCategory: groupBillsByMajorCategory(bills),
    featuredBills,
    previousSessionData,
  };
}

function groupBillsByMajorCategory(
  bills: BillWithContent[]
): BillsByMajorCategory[] {
  const uniqueBills = Array.from(
    new Map(bills.map((bill) => [bill.id, bill])).values()
  );

  return MAJOR_CATEGORY_OPTIONS.map((category) => ({
    category,
    bills: uniqueBills.filter((bill) => bill.major_category === category.label),
  })).filter(({ bills }) => bills.length > 0);
}
