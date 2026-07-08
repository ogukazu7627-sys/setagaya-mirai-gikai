import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { getJapanTime } from "@/lib/utils/date";
import type { DietSession } from "../../shared/types";
import { findPreviousDietSession } from "../repositories/diet-session-repository";
import { getCurrentDietSession } from "./get-current-diet-session";

/**
 * 前回の世田谷区議会会期を取得
 * 今日開催中のセッションより古いセッションを返す
 * 今日開催中のセッションがない場合、または古いセッションがない場合はnullを返す
 */
export async function getPreviousDietSession(): Promise<DietSession | null> {
  if (isSetagayaMockMode) {
    return null;
  }

  const currentSession = await getCurrentDietSession(getJapanTime());

  // 今日開催中のセッションがない場合はnullを返す
  if (!currentSession) {
    return null;
  }

  return _getCachedPreviousDietSession(currentSession.start_date);
}

const _getCachedPreviousDietSession = unstable_cache(
  async (activeStartDate: string): Promise<DietSession | null> => {
    return findPreviousDietSession(activeStartDate);
  },
  ["previous-diet-session"],
  {
    revalidate: 3600, // 1時間
    tags: [CACHE_TAGS.DIET_SESSIONS],
  }
);
