import { extractCommitteeName } from "@/features/committees/shared/committee-matching";
import { RECOMMENDATION_CATEGORY_OPTIONS } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { BillCardData, BillWithContent } from "../types";
import type { CouncilSearchBillDocument } from "../types/council-search";

export function buildCouncilSearchBillDocuments(
  bills: BillWithContent[]
): CouncilSearchBillDocument[] {
  return bills.map((bill) => {
    const category = RECOMMENDATION_CATEGORY_OPTIONS.find(
      (option) =>
        option.label === bill.major_category ||
        bill.tags.some((tag) => tag.major_category === option.label)
    );

    return {
      kind: "bill",
      id: bill.id,
      title: bill.bill_content?.title || bill.name,
      officialName: bill.name,
      summary: bill.bill_content?.summary || "",
      itemType: bill.item_type,
      majorCategoryId: category?.id ?? null,
      majorCategoryLabel: category?.label ?? bill.major_category ?? null,
      committeeName: extractCommitteeName(bill.status_note),
      tags: bill.tags.map((tag) => tag.label),
      submittedDate: bill.submitted_date,
      thumbnailUrl: bill.thumbnail_url,
      card: toBillCardData(bill),
    };
  });
}

function toBillCardData(bill: BillWithContent): BillCardData {
  return {
    id: bill.id,
    name: bill.name,
    item_type: bill.item_type,
    major_category: bill.major_category,
    status: bill.status,
    status_label: bill.status_label,
    status_note: bill.status_note,
    submitted_date: bill.submitted_date,
    thumbnail_url: bill.thumbnail_url,
    is_featured: bill.is_featured,
    is_review_completed: bill.is_review_completed,
    interview_enabled: bill.interview_enabled,
    hasPublicInterview: bill.hasPublicInterview,
    bill_content: bill.bill_content
      ? {
          title: bill.bill_content.title,
          summary: bill.bill_content.summary,
        }
      : undefined,
    tags: bill.tags,
  };
}
