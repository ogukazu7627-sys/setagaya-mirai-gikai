import type { BillItemType } from "../types";

type SortableBill = {
  item_type?: BillItemType | null;
  submitted_date?: string | null;
};

const BILL_ITEM_TYPE_ORDER: Record<BillItemType, number> = {
  question: 0,
  bill: 1,
  petition: 2,
  report: 3,
};

function getSubmittedDateTime(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

export function compareBillsForHomeList(
  billA: SortableBill,
  billB: SortableBill
): number {
  const itemTypeOrderA =
    BILL_ITEM_TYPE_ORDER[billA.item_type ?? "bill"] ?? Number.MAX_SAFE_INTEGER;
  const itemTypeOrderB =
    BILL_ITEM_TYPE_ORDER[billB.item_type ?? "bill"] ?? Number.MAX_SAFE_INTEGER;

  if (itemTypeOrderA !== itemTypeOrderB) {
    return itemTypeOrderA - itemTypeOrderB;
  }

  return (
    getSubmittedDateTime(billB.submitted_date) -
    getSubmittedDateTime(billA.submitted_date)
  );
}

export function sortBillsForHomeList<T extends SortableBill>(bills: T[]): T[] {
  return [...bills].sort(compareBillsForHomeList);
}
