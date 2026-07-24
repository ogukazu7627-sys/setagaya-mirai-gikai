import type { MajorCategoryLabel } from "@/features/bills/shared/types";

export const MAX_ADMIN_TAG_COUNT = 3;

export const ADMIN_FIXED_TAGS_BY_MAJOR_CATEGORY = {
  "教育🏫": [
    "不登校支援",
    "いじめ対策",
    "学校改築",
    "教育DX",
    "特別支援教育",
    "小学校",
    "中学校",
    "高校",
  ],
  "子育て👶": [
    "保育所",
    "一時預かり",
    "放課後児童クラブ",
    "子どもの権利",
    "児童虐待防止",
    "居場所",
    "妊産婦支援",
    "ヤングケアラー",
    "待機児童",
  ],
  "福祉🤝": [
    "医療福祉",
    "高齢者福祉",
    "介護福祉",
    "障がい者福祉",
    "生活保護",
    "自殺対策",
    "ひきこもり支援",
  ],
  "まちづくり🏗️": [
    "都市計画",
    "市街地",
    "道路整備",
    "公園整備",
    "公共交通",
    "住宅政策",
    "耐震化",
    "駐輪場",
    "景観",
    "駅周辺",
  ],
  "防災☔": [
    "風水害",
    "地震",
    "土砂災害",
    "避難計画",
    "防災情報",
    "消防・救急",
    "地域防災",
  ],
  "行財政🏛️": [
    "行政計画",
    "財政運営",
    "ふるさと納税",
    "契約・入札",
    "指定管理",
    "外郭団体",
    "行政DX",
    "窓口改革",
    "官民連携",
    "個人情報保護",
  ],
  "文化・スポーツ📚": [
    "図書館",
    "美術館",
    "文化財保全",
    "スポーツ振興",
    "生涯学習",
    "平和学習",
    "地域イベント",
    "大学連携",
    "多文化交流",
  ],
  "産業💡": [
    "せたがやPay",
    "商店街振興",
    "中小企業支援",
    "創業支援",
    "産業拠点",
    "雇用・就労支援",
    "観光振興",
    "民泊・旅館業",
    "都市農業",
  ],
  "環境問題🌿": [
    "気候変動",
    "脱炭素",
    "再生可能エネルギー",
    "ごみ減量",
    "食品ロス",
    "農地保全",
  ],
  "暮らし🙋": [
    "区民施設",
    "自治会",
    "区民参加",
    "マイナンバーカード",
    "ペット",
    "多文化共生",
    "男女共同参画",
    "LGBTQ+",
    "防犯",
  ],
} as const satisfies Record<MajorCategoryLabel, readonly string[]>;

export const ADMIN_REGION_TAG_LABELS = [
  "北沢エリア",
  "世田谷エリア",
  "玉川エリア",
  "砧エリア",
  "烏山エリア",
] as const;

const REGION_TAG_MAJOR_CATEGORY: MajorCategoryLabel = "暮らし🙋";

export type AdminFixedTagGroup = {
  label: string;
  tagLabels: readonly string[];
};

export function getAdminFixedTagGroups(
  majorCategory: MajorCategoryLabel
): AdminFixedTagGroup[] {
  return [
    {
      label: majorCategory,
      tagLabels: ADMIN_FIXED_TAGS_BY_MAJOR_CATEGORY[majorCategory],
    },
    {
      label: "地域",
      tagLabels: ADMIN_REGION_TAG_LABELS,
    },
  ];
}

export function getAllowedAdminTagLabels(
  majorCategory: MajorCategoryLabel
): string[] {
  return getAdminFixedTagGroups(majorCategory).flatMap((group) =>
    Array.from(group.tagLabels)
  );
}

export function isAllowedAdminTagLabel(
  label: string,
  majorCategory: MajorCategoryLabel
) {
  return getAllowedAdminTagLabels(majorCategory).includes(label);
}

export function getAdminTagMajorCategory(
  label: string,
  fallbackMajorCategory: MajorCategoryLabel
): MajorCategoryLabel {
  if ((ADMIN_REGION_TAG_LABELS as readonly string[]).includes(label)) {
    return REGION_TAG_MAJOR_CATEGORY;
  }

  for (const [majorCategory, tagLabels] of Object.entries(
    ADMIN_FIXED_TAGS_BY_MAJOR_CATEGORY
  )) {
    if ((tagLabels as readonly string[]).includes(label)) {
      return majorCategory as MajorCategoryLabel;
    }
  }

  return fallbackMajorCategory;
}

export function normalizeAdminTagLabels(
  labels: string[],
  majorCategory: MajorCategoryLabel
) {
  const normalizedLabels = Array.from(
    new Set(labels.map((label) => label.trim()).filter(Boolean))
  );
  const allowedLabels = getAllowedAdminTagLabels(majorCategory);
  const allowedLabelSet = new Set(allowedLabels);

  return {
    labels: normalizedLabels.filter((label) => allowedLabelSet.has(label)),
    invalidLabels: normalizedLabels.filter(
      (label) => !allowedLabelSet.has(label)
    ),
  };
}
