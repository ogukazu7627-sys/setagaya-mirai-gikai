import { extractCommitteeName } from "@/features/committees/shared/committee-matching";
import type { BillWithContent } from "../types";

export type BillSeoKeywordsByBillId = ReadonlyMap<string, readonly string[]>;

type RankedBill = {
  bill: BillWithContent;
  score: number;
};

export function rankRelatedPublishedBills(
  bills: BillWithContent[],
  currentBillId: string,
  count: number,
  seoKeywordsByBillId: BillSeoKeywordsByBillId = new Map()
): BillWithContent[] {
  const currentBill = bills.find((bill) => bill.id === currentBillId);
  if (!currentBill || count <= 0) {
    return [];
  }

  const seenBillIds = new Set<string>();
  const ranked = bills.flatMap<RankedBill>((bill) => {
    if (
      bill.id === currentBillId ||
      bill.publish_status !== "published" ||
      bill.publication_category !== "report" ||
      seenBillIds.has(bill.id)
    ) {
      return [];
    }

    seenBillIds.add(bill.id);
    return [
      {
        bill,
        score: calculateRelatedBillScore(
          currentBill,
          bill,
          seoKeywordsByBillId
        ),
      },
    ];
  });

  return ranked
    .sort(
      (left, right) =>
        right.score - left.score ||
        compareDatesDescending(
          left.bill.submitted_date,
          right.bill.submitted_date
        ) ||
        left.bill.id.localeCompare(right.bill.id)
    )
    .slice(0, Math.floor(count))
    .map(({ bill }) => bill);
}

export function calculateRelatedBillScore(
  currentBill: BillWithContent,
  candidate: BillWithContent,
  seoKeywordsByBillId: BillSeoKeywordsByBillId = new Map()
): number {
  const currentTags = normalizeTerms(currentBill.tags.map((tag) => tag.label));
  const candidateTags = normalizeTerms(candidate.tags.map((tag) => tag.label));
  const currentKeywords = normalizeTerms(
    seoKeywordsByBillId.get(currentBill.id) ?? []
  );
  const candidateKeywords = normalizeTerms(
    seoKeywordsByBillId.get(candidate.id) ?? []
  );
  const currentCommittee = extractCommitteeName(currentBill.status_note);
  const candidateCommittee = extractCommitteeName(candidate.status_note);

  let score = intersectionSize(currentTags, candidateTags) * 8;
  score += intersectionSize(currentKeywords, candidateKeywords) * 4;

  if (
    currentBill.major_category &&
    currentBill.major_category === candidate.major_category
  ) {
    score += 6;
  }
  if (currentCommittee && currentCommittee === candidateCommittee) {
    score += 5;
  }
  if (
    currentBill.diet_session_id &&
    currentBill.diet_session_id === candidate.diet_session_id
  ) {
    score += 3;
  }

  return score;
}

function normalizeTerms(values: readonly string[]): Set<string> {
  return new Set(
    values
      .map((value) => value.normalize("NFKC").toLowerCase().trim())
      .filter(Boolean)
  );
}

function intersectionSize(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function compareDatesDescending(
  left: string | null,
  right: string | null
): number {
  return (right ?? "").localeCompare(left ?? "");
}
