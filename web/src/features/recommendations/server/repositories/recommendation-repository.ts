import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import {
  findBillIdsWithPublicInterview,
  findTagsByBillIds,
} from "@/features/bills/server/repositories/bill-repository";
import { NORMAL_PUBLICATION_CATEGORIES } from "@/features/bills/shared/constants/publication-categories";
import type {
  Bill,
  BillCardData,
  BillContent,
} from "@/features/bills/shared/types";
import {
  normalizeRecommendationTag,
  type RecommendationCategoryId,
  type RecommendationSmallTag,
} from "../../shared/constants/recommendation-taxonomy";
import type {
  RecommendationCandidate,
  RecommendationPick,
} from "../../shared/types/recommendation";

export type RecommendationProfileRow =
  Database["public"]["Tables"]["recommendation_profiles"]["Row"];
type DailyRecommendationRow =
  Database["public"]["Tables"]["daily_recommendations"]["Row"];
type PushNotificationStatus =
  Database["public"]["Enums"]["push_notification_status_enum"];

type CandidateRow = {
  id: string;
  bills_tags: Array<{
    tags: { label: string } | Array<{ label: string }> | null;
  }> | null;
};

type RecommendationBillRow = Pick<
  Bill,
  | "id"
  | "name"
  | "item_type"
  | "major_category"
  | "status"
  | "status_label"
  | "status_note"
  | "submitted_date"
  | "thumbnail_url"
  | "is_featured"
  | "is_review_completed"
  | "interview_enabled"
> & {
  bill_contents:
    | Array<Pick<BillContent, "title" | "summary" | "difficulty_level">>
    | Pick<BillContent, "title" | "summary" | "difficulty_level">
    | null;
};

export async function findRecommendationProfileByInstallationId(
  installationId: string
): Promise<RecommendationProfileRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("recommendation_profiles")
    .select("*")
    .eq("installation_id", installationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch recommendation profile: ${error.message}`);
  }
  return data;
}

export async function findRecommendationProfileById(
  profileId: string
): Promise<RecommendationProfileRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("recommendation_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch recommendation profile: ${error.message}`);
  }
  return data;
}

export async function saveRecommendationPreferences(input: {
  installationId: string;
  selectedSmallTags: RecommendationSmallTag[];
  selectedParentCategoryIds: RecommendationCategoryId[];
  timezone: string;
}): Promise<RecommendationProfileRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "save_recommendation_preferences",
    {
      p_installation_id: input.installationId,
      p_selected_small_tags: input.selectedSmallTags,
      p_selected_parent_category_ids: input.selectedParentCategoryIds,
      p_timezone: input.timezone,
    }
  );

  if (error || !data) {
    throw new Error(
      `Failed to save recommendation preferences: ${error?.message ?? "empty result"}`
    );
  }
  return data;
}

export async function resetRecommendationHistory(
  installationId: string
): Promise<RecommendationProfileRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("reset_recommendation_history", {
    p_installation_id: installationId,
  });

  if (error) {
    throw new Error(`Failed to reset recommendation history: ${error.message}`);
  }
  return data;
}

export async function deleteRecommendationProfile(
  installationId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("recommendation_profiles")
    .delete()
    .eq("installation_id", installationId)
    .select("id");

  if (error) {
    throw new Error(
      `Failed to delete recommendation profile: ${error.message}`
    );
  }
  return (data?.length ?? 0) > 0;
}

export async function findDailyRecommendation(
  profileId: string,
  date: string,
  preferenceVersion: number
): Promise<DailyRecommendationRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("daily_recommendations")
    .select("*")
    .eq("profile_id", profileId)
    .eq("recommendation_date", date)
    .eq("preference_version", preferenceVersion)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch daily recommendations: ${error.message}`);
  }
  return data;
}

export async function insertDailyRecommendation(input: {
  profileId: string;
  date: string;
  preferenceVersion: number;
  picks: RecommendationPick[];
}): Promise<DailyRecommendationRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("daily_recommendations")
    .insert({
      profile_id: input.profileId,
      recommendation_date: input.date,
      preference_version: input.preferenceVersion,
      bill_ids: input.picks.map((pick) => pick.billId),
      sources: input.picks.map((pick) => pick.source),
    })
    .select("*")
    .single();

  if (error?.code === "23505") {
    return null;
  }
  if (error) {
    throw new Error(`Failed to insert daily recommendations: ${error.message}`);
  }
  return data;
}

export async function findRecommendationCandidates(): Promise<
  RecommendationCandidate[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      id,
      bill_contents!inner(difficulty_level),
      bills_tags(tags(label))
    `
    )
    .eq("publish_status", "published")
    .in("publication_category", NORMAL_PUBLICATION_CATEGORIES)
    .eq("bill_contents.difficulty_level", "normal");

  if (error) {
    throw new Error(
      `Failed to fetch recommendation candidates: ${error.message}`
    );
  }

  return ((data ?? []) as unknown as CandidateRow[])
    .map((row) => ({
      id: row.id,
      tags: extractCanonicalTags(row),
    }))
    .filter((candidate) => candidate.tags.length > 0);
}

/**
 * 興味分野を設定していない利用者へランダム表示するための母集団。
 * タグの有無で絞り込まず、公開中の通常案件をすべて対象にする。
 */
export async function findAllPublishedBillIds(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, bill_contents!inner(difficulty_level)")
    .eq("publish_status", "published")
    .in("publication_category", NORMAL_PUBLICATION_CATEGORIES)
    .eq("bill_contents.difficulty_level", "normal");

  if (error) {
    throw new Error(`Failed to fetch published bills: ${error.message}`);
  }
  return (data ?? []).map((row) => row.id);
}

export async function findImpressedBillIds(
  profileId: string
): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("recommendation_impressions")
    .select("bill_id")
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(`Failed to fetch recommendation history: ${error.message}`);
  }
  return new Set((data ?? []).map((row) => row.bill_id));
}

export async function insertRecommendationImpressions(input: {
  profileId: string;
  billIds: string[];
  source: "homepage" | "push";
}): Promise<void> {
  if (input.billIds.length === 0) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("recommendation_impressions").upsert(
    input.billIds.map((billId) => ({
      profile_id: input.profileId,
      bill_id: billId,
      display_source: input.source,
    })),
    {
      onConflict: "profile_id,bill_id",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw new Error(
      `Failed to record recommendation impressions: ${error.message}`
    );
  }
}

export async function findPublishedBillIds(
  billIds: string[]
): Promise<Set<string>> {
  if (billIds.length === 0) {
    return new Set();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id")
    .in("id", billIds)
    .eq("publish_status", "published")
    .in("publication_category", NORMAL_PUBLICATION_CATEGORIES);

  if (error) {
    throw new Error(`Failed to validate published bills: ${error.message}`);
  }
  return new Set((data ?? []).map((row) => row.id));
}

export async function findRecommendationBillsByIds(
  billIds: string[],
  difficultyLevel: DifficultyLevelEnum
): Promise<BillCardData[]> {
  if (billIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const difficulties: DifficultyLevelEnum[] =
    difficultyLevel === "normal" ? ["normal"] : ["hard", "normal"];
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      id,
      name,
      item_type,
      major_category,
      status,
      status_label,
      status_note,
      submitted_date,
      thumbnail_url,
      is_featured,
      is_review_completed,
      interview_enabled,
      bill_contents!inner(
        title,
        summary,
        difficulty_level
      )
    `
    )
    .in("id", billIds)
    .eq("publish_status", "published")
    .in("publication_category", NORMAL_PUBLICATION_CATEGORIES)
    .in("bill_contents.difficulty_level", difficulties);

  if (error) {
    throw new Error(`Failed to hydrate recommendation bills: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as RecommendationBillRow[];
  const [tagsByBillId, interviewBillIds] = await Promise.all([
    findTagsByBillIds(billIds),
    findBillIdsWithPublicInterview(billIds),
  ]);

  const bills: BillCardData[] = rows.map((row): BillCardData => {
    const { bill_contents: contents, ...bill } = row;
    const contentList = Array.isArray(contents)
      ? contents
      : contents
        ? [contents]
        : [];
    const billContent =
      contentList.find(
        (content) => content.difficulty_level === difficultyLevel
      ) ?? contentList.find((content) => content.difficulty_level === "normal");

    return {
      ...bill,
      bill_content: billContent
        ? {
            title: billContent.title,
            summary: billContent.summary,
          }
        : undefined,
      tags: tagsByBillId.get(row.id) ?? [],
      hasPublicInterview: interviewBillIds.has(row.id),
    };
  });
  const byId = new Map(bills.map((bill) => [bill.id, bill]));
  return billIds
    .map((billId) => byId.get(billId))
    .filter((bill): bill is BillCardData => bill != null);
}

export async function isPushEnabled(profileId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("profile_id", profileId)
    .eq("enabled", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch push subscription: ${error.message}`);
  }
  return data != null;
}

export async function savePushSubscription(input: {
  profileId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("save_push_subscription", {
    p_profile_id: input.profileId,
    p_endpoint: input.endpoint,
    p_p256dh: input.p256dh,
    p_auth: input.auth,
  });

  if (error || !data) {
    throw new Error(
      `Failed to save push subscription: ${error?.message ?? "empty result"}`
    );
  }
}

export async function disablePushSubscription(input: {
  profileId: string;
  endpoint?: string;
}): Promise<boolean> {
  const supabase = createAdminClient();
  let query = supabase
    .from("push_subscriptions")
    .update({ enabled: false })
    .eq("profile_id", input.profileId);
  if (input.endpoint) {
    query = query.eq("endpoint", input.endpoint);
  }
  const { data, error } = await query.select("id");

  if (error) {
    throw new Error(`Failed to disable push subscription: ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
}

export async function claimDailyPushSubscriptions(date: string, limit = 100) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("claim_daily_push_subscriptions", {
    p_recommendation_date: date,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to claim push subscriptions: ${error.message}`);
  }
  return data ?? [];
}

export async function updatePushNotificationStatus(input: {
  subscriptionId: string;
  status: PushNotificationStatus;
  disable?: boolean;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .update({
      last_notification_status: input.status,
      ...(input.disable ? { enabled: false } : {}),
    })
    .eq("id", input.subscriptionId);

  if (error) {
    throw new Error(`Failed to update push notification: ${error.message}`);
  }
}

function extractCanonicalTags(row: CandidateRow): RecommendationSmallTag[] {
  const tags = (row.bills_tags ?? []).flatMap((join) => {
    if (Array.isArray(join.tags)) {
      return join.tags;
    }
    return join.tags ? [join.tags] : [];
  });

  return Array.from(
    new Set(
      tags
        .map((tag) => normalizeRecommendationTag(tag.label))
        .filter((tag): tag is RecommendationSmallTag => tag != null)
    )
  );
}
