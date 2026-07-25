import "server-only";

import type { BillWithContent } from "../../shared/types";
import { pickRandomPublishedBills } from "../../shared/utils/pick-random-bills";
import { getBills } from "./get-bills";

const RECOMMENDATION_COUNT = 4;

export async function getRandomBillRecommendations(
  currentBillId: string
): Promise<BillWithContent[]> {
  try {
    const publishedBills = await getBills();

    return pickRandomPublishedBills(
      publishedBills,
      currentBillId,
      RECOMMENDATION_COUNT
    );
  } catch (error) {
    console.error("Failed to fetch random bill recommendations:", error);
    return [];
  }
}
