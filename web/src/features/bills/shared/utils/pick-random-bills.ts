import type { BillWithContent } from "../types";

type RandomSource = () => number;

export function pickRandomPublishedBills(
  bills: BillWithContent[],
  currentBillId: string,
  count: number,
  random: RandomSource = Math.random
): BillWithContent[] {
  const seenBillIds = new Set<string>();
  const candidates = bills.filter((bill) => {
    if (
      bill.id === currentBillId ||
      bill.publish_status !== "published" ||
      seenBillIds.has(bill.id)
    ) {
      return false;
    }

    seenBillIds.add(bill.id);
    return true;
  });

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [
      candidates[swapIndex],
      candidates[index],
    ];
  }

  return candidates.slice(0, Math.max(0, Math.floor(count)));
}
