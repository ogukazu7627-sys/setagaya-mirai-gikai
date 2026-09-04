import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getSetagayaMockBillById,
  isSetagayaMockMode,
} from "@/lib/setagaya-mock";
import { isUuid } from "@/lib/utils/uuid";
import type { BillWithContent } from "../../shared/types";
import {
  findMiraiStanceByBillId,
  findPublishedBillById,
  findTagsByBillId,
} from "../repositories/bill-repository";
import { getBillContentWithDifficulty } from "./helpers/get-bill-content";

export async function getBillById(id: string): Promise<BillWithContent | null> {
  if (!isSetagayaMockMode && !isUuid(id)) {
    return null;
  }

  // キャッシュ外でcookiesにアクセス
  const difficultyLevel = await getDifficultyLevel();
  if (isSetagayaMockMode) {
    return getSetagayaMockBillById(id, difficultyLevel);
  }
  return _getCachedBillById(id, difficultyLevel);
}

const _getCachedBillById = unstable_cache(
  async (
    id: string,
    difficultyLevel: DifficultyLevelEnum
  ): Promise<BillWithContent | null> => {
    // 先に親案件の存在を確認し、404対象では関連テーブルを照会しない。
    const bill = await findPublishedBillById(id);
    if (!bill) {
      return null;
    }

    const [miraiStance, billContent, billTags] = await Promise.all([
      findMiraiStanceByBillId(id),
      getBillContentWithDifficulty(id, difficultyLevel),
      findTagsByBillId(id),
    ]);

    // タグデータを整形
    const tags =
      billTags
        ?.map((bt) => bt.tags)
        .filter(
          (tag): tag is { id: string; label: string; major_category: string } =>
            tag !== null
        ) || [];

    return {
      ...bill,
      mirai_stance: miraiStance || undefined,
      bill_content: billContent || undefined,
      tags,
    };
  },
  ["bill-by-id"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS],
  }
);
