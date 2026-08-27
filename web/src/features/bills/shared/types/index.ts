import type { Database } from "@mirai-gikai/supabase";
import {
  type MajorCategoryLabel,
  RECOMMENDATION_CATEGORY_OPTIONS,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";

// Database types
export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
export type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];

export type BillContent = Database["public"]["Tables"]["bill_contents"]["Row"];
export type BillContentInsert =
  Database["public"]["Tables"]["bill_contents"]["Insert"];
export type BillContentUpdate =
  Database["public"]["Tables"]["bill_contents"]["Update"];

export type MiraiStance = Database["public"]["Tables"]["mirai_stances"]["Row"];

// Enums
export type HouseEnum = Database["public"]["Enums"]["house_enum"];
export type BillItemType = Database["public"]["Enums"]["bill_item_type"];
export type BillStatusEnum = Database["public"]["Enums"]["bill_status_enum"];
export type BillPublicationCategory =
  Database["public"]["Enums"]["bill_publication_category"];
export type StanceTypeEnum = Database["public"]["Enums"]["stance_type_enum"];

// 公開ステータス型（議案の公開/非公開を管理）
export type BillPublishStatus = "draft" | "published" | "coming_soon";

export type BillSource = {
  title: string;
  url?: string | null;
  source_type: string;
  published_at?: string | null;
  accessed_at?: string | null;
};

export const MAJOR_CATEGORY_OPTIONS = RECOMMENDATION_CATEGORY_OPTIONS;
export type { MajorCategoryLabel };

// Coming Soon議案の型（最小限の情報のみ）
export type ComingSoonBill = {
  id: string;
  name: string; // 正式名称
  title: string | null; // わかりやすいタイトル（bill_contentsから）
  item_type?: BillItemType;
  originating_house: HouseEnum;
  shugiin_url: string | null;
};

// Combined types for UI
export type BillWithStance = Bill & {
  mirai_stance?: MiraiStance;
};

export type BillTag = {
  id: string;
  label: string;
  major_category?: string | null;
};

export type BillDietSession = Pick<
  Database["public"]["Tables"]["diet_sessions"]["Row"],
  "id" | "name" | "slug"
>;

export type FeaturedTag = {
  id: string;
  label: string;
  priority: number;
};

export type BillWithContent = Omit<
  Bill,
  "sources" | "major_category" | "interview_enabled" | "publication_category"
> & {
  bill_content?: BillContent;
  mirai_stance?: MiraiStance;
  tags: BillTag[];
  sources?: unknown;
  major_category?: MajorCategoryLabel | string | null;
  interview_enabled?: boolean;
  publication_category?: BillPublicationCategory;
  featured_tag?: FeaturedTag;
  diet_session?: BillDietSession | null;
  hasPublicInterview?: boolean;
};

export type BillCardData = Pick<
  BillWithContent,
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
  | "hasPublicInterview"
> & {
  bill_content?: Pick<BillContent, "title" | "summary"> | null;
  tags: BillTag[];
};

// タグごとにグループ化された議案
export type BillsByTag = {
  tag: BillTag & { description?: string; priority: number };
  bills: BillWithContent[];
};

export type BillsByMajorCategory = {
  category: (typeof MAJOR_CATEGORY_OPTIONS)[number];
  bills: BillWithContent[];
};

// ステータスのソート順（DBのstatus_order generated columnと一致させる）
export const BILL_STATUS_ORDER: Record<BillStatusEnum, number> = {
  enacted: 0,
  rejected: 1,
  in_receiving_house: 2,
  in_originating_house: 3,
  introduced: 4,
  preparing: 5,
};

// House display mapping
export const HOUSE_LABELS: Record<HouseEnum, string> = {
  HR: "委員会",
  HC: "本会議",
};

export const BILL_ITEM_TYPE_LABELS: Record<BillItemType, string> = {
  bill: "議案",
  report: "報告事項",
  petition: "請願・陳情",
  question: "質問",
};

export function getBillItemTypeLabel(
  itemType: BillItemType | null | undefined
): string {
  return BILL_ITEM_TYPE_LABELS[itemType ?? "bill"];
}

// ステータスを日本語ラベルに変換する関数
export function getBillStatusLabel(
  status: BillStatusEnum,
  originatingHouse?: HouseEnum | null
): string {
  switch (status) {
    case "preparing":
      return "準備中";
    case "introduced":
      return "提出済み";
    case "in_originating_house":
      if (originatingHouse) {
        return `${HOUSE_LABELS[originatingHouse]}審議中`;
      }
      return "審議中"; // フォールバック
    case "in_receiving_house":
      if (originatingHouse) {
        const receivingHouse = originatingHouse === "HR" ? "HC" : "HR";
        return `${HOUSE_LABELS[receivingHouse]}審議中`;
      }
      return "審議中"; // フォールバック
    case "enacted":
      return "可決";
    case "rejected":
      return "否決";
    default:
      return status; // 未知のステータスはそのまま返す
  }
}

export const STANCE_LABELS: Record<StanceTypeEnum, string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
  conditional_for: "条件付き賛成",
  conditional_against: "条件付き反対",
  considering: "検討中",
  continued_deliberation: "継続審査中",
  free_vote: "自由投票",
};
