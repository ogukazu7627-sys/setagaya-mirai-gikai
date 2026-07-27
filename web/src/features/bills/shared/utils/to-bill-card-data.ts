import type { BillCardData, BillWithContent } from "../types";

export function toBillCardData(bill: BillWithContent): BillCardData {
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
      : null,
    tags: bill.tags,
  };
}
