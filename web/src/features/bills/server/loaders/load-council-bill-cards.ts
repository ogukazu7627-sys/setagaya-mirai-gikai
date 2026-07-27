import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { BillCardData } from "../../shared/types";
import {
  findBillIdsWithPublicInterview,
  findTagsByBillIds,
} from "../repositories/bill-repository";
import {
  type CouncilBillCardRow,
  findPublishedCouncilBillCardRowsByIds,
} from "../repositories/council-bill-directory-repository";

type LoadCouncilBillCardsDependencies = {
  findRows?: typeof findPublishedCouncilBillCardRowsByIds;
  findTags?: typeof findTagsByBillIds;
  findInterviewBillIds?: typeof findBillIdsWithPublicInterview;
};

export async function loadCouncilBillCardsByIds(
  billIds: string[],
  dietSessionIds: string[],
  difficultyLevel: DifficultyLevelEnum,
  dependencies: LoadCouncilBillCardsDependencies = {}
): Promise<BillCardData[]> {
  if (billIds.length === 0) {
    return [];
  }

  const rows = await (
    dependencies.findRows ?? findPublishedCouncilBillCardRowsByIds
  )(billIds, dietSessionIds, difficultyLevel);
  const rowIds = rows.map(({ id }) => id);
  const [tagsByBillId, interviewBillIds] = await Promise.all([
    (dependencies.findTags ?? findTagsByBillIds)(rowIds),
    (dependencies.findInterviewBillIds ?? findBillIdsWithPublicInterview)(
      rowIds
    ),
  ]);
  const cardsById = new Map(
    rows.map((row) => [
      row.id,
      toCouncilBillCard(row, {
        tags: tagsByBillId.get(row.id) ?? [],
        hasPublicInterview: interviewBillIds.has(row.id),
      }),
    ])
  );

  return billIds.flatMap((billId) => {
    const card = cardsById.get(billId);
    return card ? [card] : [];
  });
}

function toCouncilBillCard(
  row: CouncilBillCardRow,
  metadata: Pick<BillCardData, "tags" | "hasPublicInterview">
): BillCardData {
  const billContent = Array.isArray(row.bill_contents)
    ? row.bill_contents[0]
    : row.bill_contents;

  return {
    id: row.id,
    name: row.name,
    item_type: row.item_type,
    major_category: row.major_category,
    status: row.status,
    status_label: row.status_label,
    status_note: row.status_note,
    submitted_date: row.submitted_date,
    thumbnail_url: row.thumbnail_url,
    is_featured: row.is_featured,
    is_review_completed: row.is_review_completed,
    interview_enabled: row.interview_enabled,
    hasPublicInterview: metadata.hasPublicInterview,
    bill_content: billContent
      ? {
          title: billContent.title,
          summary: billContent.summary,
        }
      : null,
    tags: metadata.tags,
  };
}
