import type { Database } from "@mirai-gikai/supabase";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { findPublicInterviewConfigByBillId } from "../repositories/interview-config-repository";

export type InterviewConfig =
  Database["public"]["Tables"]["interview_configs"]["Row"];

export async function getInterviewConfig(
  billId: string
): Promise<InterviewConfig | null> {
  if (isSetagayaMockMode) {
    return {
      id: `mock-interview-${billId}`,
      bill_id: billId,
      name: "世田谷区議会 議案AIインタビュー",
      status: "public",
      themes: ["議案の理解", "生活への影響", "確認したい論点"],
      mode: "loop",
      chat_model: null,
      estimated_duration: 5,
      deleted_at: null,
      created_at: "2026-07-05 00:00:00+09",
      updated_at: "2026-07-05 00:00:00+09",
    };
  }

  return _getCachedInterviewConfig(billId);
}

const _getCachedInterviewConfig = unstable_cache(
  async (billId: string): Promise<InterviewConfig | null> => {
    const { data, error } = await findPublicInterviewConfigByBillId(billId);

    if (error) {
      // レコードが存在しない場合はnullを返す（エラーではない）
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Failed to fetch interview config:", error);
      return null;
    }

    return data;
  },
  ["interview-config"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);
