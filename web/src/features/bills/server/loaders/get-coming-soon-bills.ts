import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { getCurrentDietSession } from "@/features/diet-sessions/server/loaders/get-current-diet-session";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getJapanTime } from "@/lib/utils/date";
import type { ComingSoonBill } from "../../shared/types";
import { findComingSoonBills } from "../repositories/bill-repository";

/**
 * Coming Soon議案を取得する
 * publish_status = 'coming_soon' で今日開催中の世田谷区議会会期の議案を取得
 * 今日開催中の世田谷区議会会期がない場合は全件取得
 */
export async function getComingSoonBills(): Promise<ComingSoonBill[]> {
  // キャッシュ外でcookiesにアクセス
  const difficultyLevel = await getDifficultyLevel();
  const currentSession = await getCurrentDietSession(getJapanTime());

  return _getCachedComingSoonBills(difficultyLevel, currentSession?.id ?? null);
}

const _getCachedComingSoonBills = unstable_cache(
  async (
    difficultyLevel: DifficultyLevelEnum,
    dietSessionId: string | null
  ): Promise<ComingSoonBill[]> => {
    const data = await findComingSoonBills(dietSessionId);

    if (data.length === 0) {
      return [];
    }

    // bill_contentsからtitleを抽出（ユーザーの難易度設定を使用）
    return data.map((bill) => {
      const contents = bill.bill_contents as Array<{
        title: string;
        difficulty_level: string;
      }> | null;

      // ユーザーが選択した難易度のコンテンツを優先
      const preferredContent = contents?.find(
        (c) => c.difficulty_level === difficultyLevel
      );
      // フォールバック: normalを優先、それもなければ任意のコンテンツ
      const fallbackContent =
        contents?.find((c) => c.difficulty_level === "normal") || contents?.[0];

      return {
        id: bill.id,
        name: bill.name,
        title: preferredContent?.title || fallbackContent?.title || null,
        originating_house: bill.originating_house,
        shugiin_url: bill.shugiin_url,
      };
    });
  },
  ["coming-soon-bills-list"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS],
  }
);
