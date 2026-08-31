import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { z } from "zod";
import { statusNoteMatchesCommittee } from "@/features/committees/shared/committee-matching";
import { COUNCIL_SEARCH_PUBLICATION_CATEGORIES } from "../../shared/constants/publication-categories";
import type { BillItemType } from "../../shared/types";
import { compareBillsForHomeList } from "../../shared/utils/sort-bills";

type CouncilSearchCandidateRow = {
  id: string;
  item_type: BillItemType;
  major_category: string | null;
  status_note: string | null;
  submitted_date: string | null;
};

const SEARCH_RESULT_LIMIT = 1000;
const BILL_SEARCH_COLUMNS = [
  "name",
  "major_category",
  "status_label",
  "status_note",
] as const;
const CONTENT_SEARCH_COLUMNS = ["title", "summary", "content"] as const;

/**
 * 管理画面と同じ部分一致方式で公開情報を検索し、今年の案件だけを返す。
 * 本文はDB内で照合し、レスポンスへは含めない。
 */
export async function findCouncilBillIdsByKeyword(input: {
  keyword: string;
  dietSessionIds: string[];
  contentType: BillItemType | null;
  majorCategory: string | null;
  committeeName: string | null;
}): Promise<string[]> {
  const keyword = input.keyword.trim();
  if (!keyword || input.dietSessionIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  let candidatesQuery = supabase
    .from("bills")
    .select("id, item_type, major_category, status_note, submitted_date")
    .in("diet_session_id", input.dietSessionIds)
    .eq("publish_status", "published")
    .in("publication_category", COUNCIL_SEARCH_PUBLICATION_CATEGORIES);
  if (input.contentType) {
    candidatesQuery = candidatesQuery.eq("item_type", input.contentType);
  }
  if (input.majorCategory) {
    candidatesQuery = candidatesQuery.eq("major_category", input.majorCategory);
  }

  const { data: candidateData, error: candidatesError } =
    await candidatesQuery.limit(SEARCH_RESULT_LIMIT);
  if (candidatesError) {
    throw new Error("Failed to fetch council search candidates");
  }

  const candidates = (
    (candidateData ?? []) as CouncilSearchCandidateRow[]
  ).filter((candidate) =>
    input.committeeName
      ? statusNoteMatchesCommittee(candidate.status_note, input.committeeName)
      : true
  );
  if (candidates.length === 0) {
    return [];
  }

  const candidateIds = candidates.map(({ id }) => id);
  const matchedIds = new Set<string>();
  if (
    z.string().uuid().safeParse(keyword).success &&
    candidateIds.includes(keyword)
  ) {
    matchedIds.add(keyword);
  }

  const pattern = `%${keyword}%`;
  const [billColumnResults, contentColumnResults, tagResult] =
    await Promise.all([
      Promise.all(
        BILL_SEARCH_COLUMNS.map((column) =>
          supabase
            .from("bills")
            .select("id")
            .in("id", candidateIds)
            .ilike(column, pattern)
            .limit(SEARCH_RESULT_LIMIT)
        )
      ),
      Promise.all(
        CONTENT_SEARCH_COLUMNS.map((column) =>
          supabase
            .from("bill_contents")
            .select("bill_id")
            .in("bill_id", candidateIds)
            .ilike(column, pattern)
            .limit(SEARCH_RESULT_LIMIT)
        )
      ),
      supabase
        .from("tags")
        .select("id")
        .ilike("label", pattern)
        .limit(SEARCH_RESULT_LIMIT),
    ]);

  for (const result of billColumnResults) {
    if (result.error) {
      throw new Error("Failed to search council bills");
    }
    for (const row of result.data ?? []) {
      matchedIds.add(row.id);
    }
  }
  for (const result of contentColumnResults) {
    if (result.error) {
      throw new Error("Failed to search council bill contents");
    }
    for (const row of result.data ?? []) {
      matchedIds.add(row.bill_id);
    }
  }
  if (tagResult.error) {
    throw new Error("Failed to search council tags");
  }

  const tagIds = (tagResult.data ?? []).map(({ id }) => id);
  if (tagIds.length > 0) {
    const { data: billTagData, error: billTagError } = await supabase
      .from("bills_tags")
      .select("bill_id")
      .in("bill_id", candidateIds)
      .in("tag_id", tagIds)
      .limit(SEARCH_RESULT_LIMIT);
    if (billTagError) {
      throw new Error("Failed to search council bill tags");
    }
    for (const row of billTagData ?? []) {
      matchedIds.add(row.bill_id);
    }
  }

  return candidates
    .filter(({ id }) => matchedIds.has(id))
    .sort((left, right) =>
      compareBillsForHomeList(
        {
          item_type: left.item_type,
          submitted_date: left.submitted_date,
        },
        {
          item_type: right.item_type,
          submitted_date: right.submitted_date,
        }
      )
    )
    .map(({ id }) => id);
}
