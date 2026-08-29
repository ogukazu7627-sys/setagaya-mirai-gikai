import "server-only";

import { findReadyBillSeoKeywordsByBillIds } from "@/features/bill-seo/server/repositories/bill-seo-repository";
import type { BillWithContent } from "../../shared/types";
import { rankRelatedPublishedBills } from "../../shared/utils/rank-related-bills";
import { getBills } from "./get-bills";

const RECOMMENDATION_COUNT = 4;

export async function getRelatedBillRecommendations(
  currentBillId: string
): Promise<BillWithContent[]> {
  try {
    const publishedBills = await getBills();
    const keywordsByBillId = await findReadyBillSeoKeywordsByBillIds(
      publishedBills.map((bill) => bill.id)
    );

    return rankRelatedPublishedBills(
      publishedBills,
      currentBillId,
      RECOMMENDATION_COUNT,
      keywordsByBillId
    );
  } catch (error) {
    console.error("Failed to fetch related bill recommendations:", error);
    return [];
  }
}
