import type {
  BillStatusEnum,
  BillWithContent,
} from "@/features/bills/shared/types";

export const allBillStatuses: BillStatusEnum[] = [
  "preparing",
  "introduced",
  "in_originating_house",
  "in_receiving_house",
  "enacted",
  "rejected",
];

const baseBill: BillWithContent = {
  id: "mock-bill-001",
  name: "サンプル案件（第XXX回世田谷区議会提出）",
  item_type: "bill",
  status: "in_originating_house",
  originating_house: "HR",
  is_featured: false,
  is_review_completed: true,
  status_label: null,
  thumbnail_url: null,
  share_thumbnail_url: null,
  sources: [],
  published_at: "2026-02-15",
  submitted_date: "2026-02-15",
  publish_status: "published",
  shugiin_url: null,
  slug: null,
  status_note: null,
  status_order: 3,
  publish_status_order: 2,
  diet_session_id: "mock-session",
  knowledge_source: null,
  use_knowledge_source_in_chat: true,
  created_at: "2026-02-15T00:00:00Z",
  updated_at: "2026-02-15T00:00:00Z",
  bill_content: {
    id: "mock-content-001",
    bill_id: "mock-bill-001",
    title: "サンプル案件のタイトル",
    summary:
      "この案件は開発プレビュー用のサンプルデータです。案件の要約文がここに表示されます。実際のデータではありません。",
    content: "# サンプルコンテンツ\n\n本文がここに入ります。",
    difficulty_level: "normal",
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
  tags: [
    { id: "tag-1", label: "経済" },
    { id: "tag-2", label: "環境" },
  ],
};

export function createMockBill(
  overrides: Partial<BillWithContent> = {}
): BillWithContent {
  return {
    ...baseBill,
    ...overrides,
  };
}
