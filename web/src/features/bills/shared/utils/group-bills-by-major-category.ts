import {
  type BillsByMajorCategory,
  type BillWithContent,
  MAJOR_CATEGORY_OPTIONS,
} from "../types";
import { sortBillsForHomeList } from "./sort-bills";

export function groupBillsByMajorCategory(
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
