import "server-only";

import type { createAdminClient, Database } from "@mirai-gikai/supabase";
import { z } from "zod";
import type {
  BillItemType,
  BillPublishStatus,
  BillSource,
  BillStatusEnum,
  MajorCategoryLabel,
} from "@/features/bills/shared/types";
import { MAJOR_CATEGORY_OPTIONS } from "@/features/bills/shared/types";

export type BillRow = Database["public"]["Tables"]["bills"]["Row"];
export type BillContentRow =
  Database["public"]["Tables"]["bill_contents"]["Row"];
export type DietSessionRow =
  Database["public"]["Tables"]["diet_sessions"]["Row"];
export type TagRow = Database["public"]["Tables"]["tags"]["Row"];
export type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

export const ADMIN_BILLS_PER_PAGE = 20;

export const BILL_ITEM_TYPE_OPTIONS: Array<{
  value: BillItemType;
  label: string;
}> = [
  { value: "bill", label: "議案" },
  { value: "report", label: "報告事項" },
  { value: "petition", label: "請願・陳情" },
  { value: "question", label: "質問" },
];

export const BILL_STATUS_OPTIONS: Array<{
  value: BillStatusEnum;
  label: string;
}> = [
  { value: "preparing", label: "準備中" },
  { value: "introduced", label: "提出" },
  { value: "in_originating_house", label: "委員会" },
  { value: "in_receiving_house", label: "議会" },
  { value: "enacted", label: "完了: 可決・採択・報告済み" },
  { value: "rejected", label: "完了: 否決・不採択" },
];

export const BILL_STATUS_LABEL_OPTIONS = [
  "提出",
  "委員会で審査中",
  "委員会で報告",
  "付託",
  "本会議で質問・答弁済み",
  "質問・答弁済み",
  "可決",
  "否決",
  "採択",
  "趣旨採択",
  "不採択",
  "継続審議",
  "報告済み",
  "完了",
] as const;

export const PUBLISH_STATUS_OPTIONS: Array<{
  value: BillPublishStatus;
  label: string;
}> = [
  { value: "draft", label: "下書き" },
  { value: "published", label: "公開" },
];

export const SOURCE_TYPE_OPTIONS = [
  "bill_pdf",
  "committee_agenda",
  "session_result",
  "vote_result",
  "petition_result",
  "question_summary",
  "official_page",
] as const;

export type AdminBillListItem = BillRow & {
  bill_contents?: Pick<
    BillContentRow,
    "title" | "summary" | "difficulty_level"
  >[];
  bills_tags?: {
    tags: { id: string; label: string; major_category?: string | null } | null;
  }[];
};

export type AdminBillSearchFilters = {
  query: string;
  publishStatus: "" | BillPublishStatus;
  itemType: "" | BillItemType;
  majorCategory: "" | MajorCategoryLabel;
  statusLabel: string;
  submittedDateFrom: string;
  submittedDateTo: string;
};

export type AdminBillFormData = {
  bill: BillRow | null;
  contents: {
    normal: Partial<BillContentRow> | null;
    hard: Partial<BillContentRow> | null;
  };
  selectedTagIds: string[];
  previewToken: string | null;
  tags: TagRow[];
  sessions: DietSessionRow[];
  unknownCouncilorNames: string[];
};

export const majorCategoryLabels = MAJOR_CATEGORY_OPTIONS.map(
  (category) => category.label
) as [MajorCategoryLabel, ...MajorCategoryLabel[]];

export const billItemTypeSchema = z.enum([
  "bill",
  "report",
  "petition",
  "question",
]);

export type NewTagInput = {
  label: string;
  major_category: MajorCategoryLabel;
};

export class AdminBillSaveError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly billId?: string
  ) {
    super(message);
    this.name = "AdminBillSaveError";
  }
}

export type SaveAdminBillInputOptions = {
  thumbnailFile?: File | null;
  requireExistingDraft?: boolean;
  previewCreatedBy?: string;
  now?: string;
};

export type SaveAdminBillInputResult = {
  billId: string;
  mode: "created" | "updated";
  previewToken: string;
  unknownCouncilorNames: string[];
};

export type SaveAdminDraftBillApiResponse = {
  success: true;
  mode: "created" | "updated";
  billId: string;
  adminEditUrl: string;
  previewUrl: string;
  unknownCouncilorNames: string[];
  forcedFields: {
    publish_status: "draft";
    is_review_completed: false;
  };
};

export type AdminDraftBillApiTag = {
  id: string;
  label: string;
  major_category: string | null;
};

export type AdminDraftBillApiPayload = {
  id: string;
  name: string;
  item_type: BillItemType;
  major_category: MajorCategoryLabel;
  diet_session_id: string | null;
  submitted_date: string | null;
  status: BillStatusEnum;
  status_label: string | null;
  status_note: string | null;
  publish_status: "draft";
  is_review_completed: false;
  is_featured: boolean;
  interview_enabled: boolean;
  use_knowledge_source_in_chat: boolean;
  thumbnail_url: string | null;
  share_thumbnail_url: string | null;
  normal_title: string;
  normal_summary: string;
  normal_content: string;
  hard_title: string | null;
  hard_summary: string | null;
  hard_content: string | null;
  tag_ids: string[];
  tag_labels: string[];
  tags: AdminDraftBillApiTag[];
  sources: BillSource[];
  knowledge_source: string | null;
};

export type GetAdminDraftBillApiResponse = {
  success: true;
  billId: string;
  adminEditUrl: string;
  previewUrl: string;
  draft: AdminDraftBillApiPayload;
  unknownCouncilorNames: string[];
  forcedFields: {
    publish_status: "draft";
    is_review_completed: false;
  };
};

export type AdminBillKnowledgeSourceExportItem = {
  id: string;
  name: string;
  item_type: BillItemType;
  publish_status: string;
  submitted_date: string | null;
  major_category: string | null;
  status: string;
  status_label: string | null;
  status_note: string | null;
  knowledge_source: string | null;
  use_knowledge_source_in_chat: boolean;
  sources: BillSource[];
  updated_at: string | null;
  diet_session_id: string | null;
  diet_session: {
    id: string;
    name: string;
    slug: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;
};

export type ListAdminBillKnowledgeSourcesApiResponse = {
  success: true;
  item_type: BillItemType;
  count: number;
  records: AdminBillKnowledgeSourceExportItem[];
};

export type BillTagJoinRow = {
  tag_id: string;
  tags: AdminDraftBillApiTag | AdminDraftBillApiTag[] | null;
};
