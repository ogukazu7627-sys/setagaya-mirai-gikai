import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { BillCardData } from "@/features/bills/shared/types";
import { getSetagayaMockBills, isSetagayaMockMode } from "@/lib/setagaya-mock";
import {
  findAllPublishedBillIds,
  findRecommendationBillsByIds,
} from "../repositories/recommendation-repository";
import { pickRandomBillIds } from "../../shared/utils/pick-random-bill-ids";

export const RANDOM_RECOMMENDATION_COUNT = 5;

export type RandomRecommendationsResult = {
  bills: BillCardData[];
};

/**
 * 興味分野を設定せずにオンボーディングを閉じた利用者へ返す無作為のおすすめ。
 * 匿名IDも興味分野も使わないため、サーバー側に何も保存しない。
 */
export async function getRandomRecommendations(input: {
  difficultyLevel: DifficultyLevelEnum;
  count?: number;
}): Promise<RandomRecommendationsResult> {
  const count = input.count ?? RANDOM_RECOMMENDATION_COUNT;

  if (isSetagayaMockMode) {
    const mockBills = getSetagayaMockBills(input.difficultyLevel);
    const pickedIds = new Set(
      pickRandomBillIds(
        mockBills.map((bill) => bill.id),
        count
      )
    );
    return {
      bills: mockBills.filter((bill) =>
        pickedIds.has(bill.id)
      ) as unknown as BillCardData[],
    };
  }

  const picked = pickRandomBillIds(await findAllPublishedBillIds(), count);
  return {
    bills: await findRecommendationBillsByIds(picked, input.difficultyLevel),
  };
}
