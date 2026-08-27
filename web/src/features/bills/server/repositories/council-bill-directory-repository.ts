import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { extractCommitteeName } from "@/features/committees/shared/committee-matching";
import {
  COUNCIL_SEARCH_PUBLICATION_CATEGORIES,
  NORMAL_PUBLICATION_CATEGORIES,
} from "../../shared/constants/publication-categories";
import type { Bill, BillContent, BillItemType } from "../../shared/types";
import type { CouncilBillDirectoryEntry } from "../../shared/types/council-bill-directory";

export type CouncilBillCardRow = Pick<
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
  | "publication_category"
> & {
  bill_contents:
    | Array<Pick<BillContent, "title" | "summary">>
    | Pick<BillContent, "title" | "summary">
    | null;
};

type CouncilBillDirectoryRow = {
  id: string;
  item_type: BillItemType;
  major_category: string | null;
  status_note: string | null;
  submitted_date: string | null;
};

export async function findPublishedCouncilBillDirectoryEntries(
  dietSessionIds: string[],
  difficultyLevel: DifficultyLevelEnum
): Promise<CouncilBillDirectoryEntry[]> {
  if (dietSessionIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      id,
      item_type,
      major_category,
      status_note,
      submitted_date,
      bill_contents!inner (
        difficulty_level
      )
    `
    )
    .in("diet_session_id", dietSessionIds)
    .eq("publish_status", "published")
    .in("publication_category", NORMAL_PUBLICATION_CATEGORIES)
    .eq("bill_contents.difficulty_level", difficultyLevel);

  if (error) {
    throw new Error("Failed to fetch council bill directory");
  }

  return ((data ?? []) as unknown as CouncilBillDirectoryRow[]).map((row) => ({
    id: row.id,
    itemType: row.item_type,
    majorCategory: row.major_category,
    committeeName: extractCommitteeName(row.status_note),
    submittedDate: row.submitted_date,
  }));
}

export async function findPublishedCouncilBillCardRowsByIds(
  billIds: string[],
  dietSessionIds: string[],
  difficultyLevel: DifficultyLevelEnum
): Promise<CouncilBillCardRow[]> {
  if (billIds.length === 0 || dietSessionIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
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
      publication_category,
      bill_contents!inner (
        title,
        summary,
        difficulty_level
      )
    `
    )
    .in("id", billIds)
    .in("diet_session_id", dietSessionIds)
    .eq("publish_status", "published")
    .in("publication_category", COUNCIL_SEARCH_PUBLICATION_CATEGORIES)
    .eq("bill_contents.difficulty_level", difficultyLevel);

  if (error) {
    throw new Error("Failed to fetch council bill cards");
  }

  return (data ?? []) as unknown as CouncilBillCardRow[];
}
