import type { Database } from "@mirai-gikai/supabase";

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

export const MAJOR_CATEGORY_OPTIONS = [
  {
    id: "education",
    label: "教育🏫",
    description: "学校、教育委員会、不登校、給食、教育環境、学びの支援",
  },
  {
    id: "childcare",
    label: "子育て👶",
    description: "保育、学童、子育て支援、若者支援、児童、妊娠・出産",
  },
  {
    id: "welfare",
    label: "福祉🤝",
    description: "高齢者、障害者、介護、健康、生活支援、医療、福祉施策",
  },
  {
    id: "urban_planning",
    label: "まちづくり🏗️",
    description: "再開発、道路、公園、住宅、交通、都市計画、自転車、歩行環境",
  },
  {
    id: "disaster_prevention",
    label: "防災☔",
    description: "災害対策、防犯、交通安全、危機管理",
  },
  {
    id: "administration_finance",
    label: "行財政🏛️",
    description:
      "予算、決算、基金、区債、税、契約、条例、行政改革、DX、庁舎、窓口改革",
  },
  {
    id: "culture",
    label: "文化📚",
    description: "文化施設、スポーツ施設、生涯学習、図書館、地域イベント",
  },
  {
    id: "industry",
    label: "産業💡",
    description: "商店街、産業振興、創業支援、観光、地域経済、雇用",
  },
  {
    id: "environment",
    label: "環境🌿",
    description: "ごみ、清掃、リサイクル、気候変動、緑、環境政策",
  },
  {
    id: "daily_life",
    label: "暮らし🙋",
    description: "戸籍、区民施設、地域行政、消費生活、町会、地域活動",
  },
] as const;

export type MajorCategoryLabel =
  (typeof MAJOR_CATEGORY_OPTIONS)[number]["label"];

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

export type FeaturedTag = {
  id: string;
  label: string;
  priority: number;
};

export type BillWithContent = Omit<
  Bill,
  "sources" | "major_category" | "interview_enabled"
> & {
  bill_content?: BillContent;
  mirai_stance?: MiraiStance;
  tags: BillTag[];
  sources?: unknown;
  major_category?: MajorCategoryLabel | string | null;
  interview_enabled?: boolean;
  featured_tag?: FeaturedTag;
  hasPublicInterview?: boolean;
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
