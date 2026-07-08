import type { UIMessage } from "ai";

export const OFF_TOPIC_RESPONSE_TEXT =
  "すみませんが、その内容にはお答えできません。世田谷区議会の案件や区政・政策について気になることがあれば、お手伝いできます。";

export type ChatTopicScopeDecision =
  | {
      status: "allowed";
      normalizedText: string;
      matchedTerm?: string;
      reason?: undefined;
    }
  | {
      status: "blocked";
      normalizedText: string;
      matchedTerm: string;
      reason:
        | "off_topic_standalone_request"
        | "off_topic_without_civic_context";
    };

const OFF_TOPIC_TERMS = [
  "晩御飯",
  "晩ご飯",
  "晩飯",
  "夜ご飯",
  "夜ごはん",
  "夕ご飯",
  "夕ごはん",
  "夕飯",
  "夕食",
  "ご飯",
  "ごはん",
  "朝ごはん",
  "朝ご飯",
  "朝食",
  "昼食",
  "ランチ",
  "メニュー",
  "献立",
  "レシピ",
  "料理",
  "おかず",
  "食材",
  "冷蔵庫",
  "外食",
  "レストラン",
  "飲食店",
  "食べたい",
  "カレー",
  "パスタ",
  "オムライス",
  "旅行",
  "観光",
  "ホテル",
  "デート",
  "恋愛",
  "占い",
  "運勢",
  "ゲーム",
  "アニメ",
  "映画",
  "音楽",
  "歌詞",
  "小説",
  "物語",
  "ダイエット",
  "筋トレ",
  "プログラム",
  "コード",
  "英訳",
  "翻訳",
  "数学",
  "宿題",
  "履歴書",
  "dinner",
  "recipe",
  "menu",
  "restaurant",
] as const;

const CIVIC_TERMS = [
  "世田谷区議会",
  "区議会",
  "区政",
  "議案",
  "案件",
  "条例",
  "政策",
  "政治",
  "行政",
  "区民",
  "予算",
  "決算",
  "請願",
  "陳情",
  "委員会",
  "会議録",
  "議員",
  "区長",
  "法案",
  "法律",
  "制度",
  "自治体",
  "学校給食",
  "給食費",
  "給食",
  "食育",
  "補助金",
  "保育",
  "福祉",
  "防災",
  "都市計画",
  "教育",
  "子ども",
  "こども",
  "子育て",
  "高齢者",
  "介護",
  "医療",
  "環境",
  "公共施設",
  "公園",
  "道路",
  "この案件",
  "この議案",
  "この法案",
  "本件",
  "ポイント",
  "要約",
  "影響",
  "メリット",
  "デメリット",
] as const;

const FOOD_POLICY_TERMS = [
  "学校給食",
  "給食費",
  "給食",
  "食育",
  "子ども食堂",
  "こども食堂",
  "食品ロス",
  "食料支援",
  "生活支援",
] as const;

const STANDALONE_REQUEST_TERMS = [
  "考えて",
  "決めて",
  "提案",
  "おすすめ",
  "作って",
  "教えて",
  "選んで",
  "出して",
  "プラン",
  "アイデア",
] as const;

export function extractLatestUserText<TMetadata>(
  messages: UIMessage<TMetadata>[]
): string {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  return (
    latestUserMessage?.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n") ?? ""
  );
}

function normalizeText(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

function findIncludedTerm(text: string, terms: readonly string[]) {
  return terms.find((term) => text.includes(normalizeText(term)));
}

function hasFoodPolicyContext(text: string): boolean {
  return Boolean(findIncludedTerm(text, FOOD_POLICY_TERMS));
}

function hasCivicContext(text: string): boolean {
  return Boolean(findIncludedTerm(text, CIVIC_TERMS));
}

function isStandaloneOffTopicRequest(text: string): boolean {
  const hasRequestTerm = STANDALONE_REQUEST_TERMS.some((term) =>
    text.includes(normalizeText(term))
  );
  const hasOffTopicTerm = OFF_TOPIC_TERMS.some((term) =>
    text.includes(normalizeText(term))
  );

  return hasRequestTerm && hasOffTopicTerm;
}

export function assessChatTopicScope<TMetadata>(
  messages: UIMessage<TMetadata>[]
): ChatTopicScopeDecision {
  const text = normalizeText(extractLatestUserText(messages));

  if (!text) {
    return { status: "allowed", normalizedText: text };
  }

  const matchedTerm = findIncludedTerm(text, OFF_TOPIC_TERMS);
  if (!matchedTerm) {
    return { status: "allowed", normalizedText: text };
  }

  if (hasFoodPolicyContext(text)) {
    return { status: "allowed", normalizedText: text, matchedTerm };
  }

  if (isStandaloneOffTopicRequest(text)) {
    return {
      status: "blocked",
      normalizedText: text,
      matchedTerm,
      reason: "off_topic_standalone_request",
    };
  }

  if (!hasCivicContext(text)) {
    return {
      status: "blocked",
      normalizedText: text,
      matchedTerm,
      reason: "off_topic_without_civic_context",
    };
  }

  return { status: "allowed", normalizedText: text, matchedTerm };
}

export function isClearlyOffTopicChatRequest<TMetadata>(
  messages: UIMessage<TMetadata>[]
): boolean {
  return assessChatTopicScope(messages).status === "blocked";
}
