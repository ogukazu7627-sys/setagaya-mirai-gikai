import "server-only";

import type { BillWithContent } from "@/features/bills/shared/types";
import {
  getSetagayaMockBillById,
  getSetagayaMockBills,
  getSetagayaMockSession,
} from "@/lib/setagaya-mock";
import type {
  AdminBillFormData,
  AdminBillListItem,
  BillRow,
  DietSessionRow,
  TagRow,
} from "./bill-admin-shared";

function mockTags(): TagRow[] {
  const now = new Date().toISOString();
  const tagsById = new Map<string, TagRow>();

  for (const bill of getSetagayaMockBills()) {
    for (const tag of bill.tags) {
      tagsById.set(tag.id, {
        id: tag.id,
        label: tag.label,
        major_category: bill.major_category ?? "教育🏫",
        description: null,
        featured_priority: null,
        created_at: now,
        updated_at: now,
      });
    }
  }

  return Array.from(tagsById.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "ja")
  );
}

function mockSession(): DietSessionRow {
  return getSetagayaMockSession() as DietSessionRow;
}

function mockBillToRow(bill: BillWithContent): BillRow {
  return {
    ...bill,
    interview_enabled: bill.interview_enabled ?? false,
    is_review_completed: bill.is_review_completed ?? true,
    major_category: bill.major_category ?? null,
    published_at: bill.published_at ?? null,
    publish_status_order: bill.publish_status_order ?? null,
    slug: bill.slug ?? null,
    sources: (bill.sources ?? []) as BillRow["sources"],
    status_order: bill.status_order ?? null,
  } as BillRow;
}

export function mockBillToAdminListItem(
  bill: BillWithContent
): AdminBillListItem {
  return {
    ...mockBillToRow(bill),
    bill_contents: bill.bill_content
      ? [
          {
            title: bill.bill_content.title,
            summary: bill.bill_content.summary,
            difficulty_level: bill.bill_content.difficulty_level,
          },
        ]
      : [],
    bills_tags: bill.tags.map((tag) => ({ tags: tag })),
  };
}

export function mockFormData(billId?: string): AdminBillFormData {
  const bill = billId ? getSetagayaMockBillById(billId, "normal") : null;
  const hardBill = billId ? getSetagayaMockBillById(billId, "hard") : null;

  if (billId && !bill) {
    throw new Error("指定された案件が見つかりません。");
  }

  return {
    bill: bill ? mockBillToRow(bill) : null,
    contents: {
      normal: bill?.bill_content ?? null,
      hard: hardBill?.bill_content ?? null,
    },
    selectedTagIds: bill?.tags.map((tag) => tag.id) ?? [],
    previewToken: bill ? "mock-preview-token" : null,
    tags: mockTags(),
    sessions: [mockSession()],
    unknownCouncilorNames: [],
  };
}
