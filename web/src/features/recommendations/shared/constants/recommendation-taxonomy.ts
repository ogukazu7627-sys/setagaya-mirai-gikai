export const RECOMMENDATION_CATEGORIES = [
  {
    id: "education",
    name: "教育",
    emoji: "🏫",
    description: "学校、教育環境、学びの支援",
    smallTags: [
      "不登校支援",
      "いじめ対策",
      "学校改築",
      "教育DX",
      "特別支援教育",
      "小学校",
      "中学校",
      "高校",
    ],
  },
  {
    id: "child-rearing",
    name: "子育て",
    emoji: "👶",
    description: "保育、子どもの権利、妊娠・出産",
    smallTags: [
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
  },
  {
    id: "welfare",
    name: "福祉",
    emoji: "🤝",
    description: "医療、高齢者、介護、生活支援",
    smallTags: [
      "医療福祉",
      "高齢者福祉",
      "介護福祉",
      "障がい者福祉",
      "生活保護",
      "自殺対策",
      "ひきこもり支援",
    ],
  },
  {
    id: "urban-development",
    name: "まちづくり",
    emoji: "🏗️",
    description: "都市計画、道路、公園、住宅、交通",
    smallTags: [
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
  },
  {
    id: "disaster-prevention",
    name: "防災",
    emoji: "☔",
    description: "災害対策、避難、防災情報、消防・救急",
    smallTags: [
      "風水害",
      "地震",
      "土砂災害",
      "避難計画",
      "防災情報",
      "消防・救急",
      "地域防災",
    ],
  },
  {
    id: "administration-finance",
    name: "行財政",
    emoji: "🏛️",
    description: "行政計画、財政、契約、行政DX",
    smallTags: [
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
  },
  {
    id: "culture-sports",
    name: "文化・スポーツ",
    emoji: "📚",
    description: "文化施設、スポーツ、生涯学習、交流",
    smallTags: [
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
  },
  {
    id: "industry",
    name: "産業",
    emoji: "💡",
    description: "商店街、創業、雇用、観光、都市農業",
    smallTags: [
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
  },
  {
    id: "environment",
    name: "環境問題",
    emoji: "🌿",
    description: "気候変動、脱炭素、ごみ、農地",
    smallTags: [
      "気候変動",
      "脱炭素",
      "再生可能エネルギー",
      "ごみ減量",
      "食品ロス",
      "農地保全",
    ],
  },
  {
    id: "daily-life",
    name: "暮らし",
    emoji: "🙋",
    description: "区民施設、地域参加、多文化共生、防犯",
    smallTags: [
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
  },
] as const;

type RecommendationCategoryDefinition =
  (typeof RECOMMENDATION_CATEGORIES)[number];

type CategoryDisplayLabel<T extends RecommendationCategoryDefinition> =
  T extends RecommendationCategoryDefinition
    ? `${T["name"]}${T["emoji"]}`
    : never;

export type RecommendationCategoryId = RecommendationCategoryDefinition["id"];
export type RecommendationSmallTag =
  RecommendationCategoryDefinition["smallTags"][number];
export type MajorCategoryLabel =
  CategoryDisplayLabel<RecommendationCategoryDefinition>;

export type RecommendationCategoryOption = RecommendationCategoryDefinition & {
  label: MajorCategoryLabel;
};

export const RECOMMENDATION_CATEGORY_OPTIONS = RECOMMENDATION_CATEGORIES.map(
  (category) => ({
    ...category,
    label: `${category.name}${category.emoji}` as MajorCategoryLabel,
  })
) as readonly RecommendationCategoryOption[];

export const RECOMMENDATION_SMALL_TAGS = RECOMMENDATION_CATEGORIES.flatMap(
  (category) => category.smallTags
) as readonly RecommendationSmallTag[];

/** 興味分野として選んでもらう最小件数。これ未満では推薦の幅が出ない。 */
export const MIN_SELECTED_SMALL_TAGS = 3;
/** 上限は小分類の総数。これを超える指定は不正入力として弾く。 */
export const MAX_SELECTED_SMALL_TAGS = RECOMMENDATION_SMALL_TAGS.length;

const SMALL_TAG_SET = new Set<string>(RECOMMENDATION_SMALL_TAGS);
const CATEGORY_ID_SET = new Set<string>(
  RECOMMENDATION_CATEGORIES.map((category) => category.id)
);

export const RECOMMENDATION_TAG_ALIASES = {
  いじめ: "いじめ対策",
} as const satisfies Record<string, RecommendationSmallTag>;

export function isRecommendationSmallTag(
  value: string
): value is RecommendationSmallTag {
  return SMALL_TAG_SET.has(value);
}

export function isRecommendationCategoryId(
  value: string
): value is RecommendationCategoryId {
  return CATEGORY_ID_SET.has(value);
}

export function normalizeRecommendationTag(
  value: string
): RecommendationSmallTag | null {
  const trimmed = value.trim();
  const normalized =
    RECOMMENDATION_TAG_ALIASES[
      trimmed as keyof typeof RECOMMENDATION_TAG_ALIASES
    ] ?? trimmed;
  return isRecommendationSmallTag(normalized) ? normalized : null;
}

export function getRecommendationCategoryById(id: RecommendationCategoryId) {
  return RECOMMENDATION_CATEGORY_OPTIONS.find((category) => category.id === id);
}

export function getRecommendationCategoryByTag(
  tag: RecommendationSmallTag
): RecommendationCategoryOption {
  const category = RECOMMENDATION_CATEGORY_OPTIONS.find((item) =>
    (item.smallTags as readonly string[]).includes(tag)
  );

  if (!category) {
    throw new Error(`Recommendation category not found for tag: ${tag}`);
  }

  return category;
}

export function getParentCategoryIdsForTags(
  tags: readonly RecommendationSmallTag[]
): RecommendationCategoryId[] {
  return Array.from(
    new Set(tags.map((tag) => getRecommendationCategoryByTag(tag).id))
  );
}
