import type { UIMessage } from "ai";

export const OFF_TOPIC_RESPONSE_TEXT =
  "すみませんが、その内容にはお答えできません。世田谷区議会の案件や区政・政策について気になることがあれば、お手伝いできます。";

const OBVIOUS_OFF_TOPIC_TERMS = [
  "晩御飯",
  "晩ご飯",
  "夕飯",
  "夕食",
  "朝ごはん",
  "朝食",
  "昼食",
  "ランチ",
  "献立",
  "レシピ",
  "料理",
  "おかず",
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
  "補助金",
  "保育",
  "福祉",
  "防災",
  "都市計画",
  "教育",
  "子育て",
  "高齢者",
  "介護",
  "医療",
  "環境",
  "公共施設",
  "公園",
  "道路",
] as const;

function extractLatestUserText<TMetadata>(
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

export function isClearlyOffTopicChatRequest<TMetadata>(
  messages: UIMessage<TMetadata>[]
): boolean {
  const text = normalizeText(extractLatestUserText(messages));

  if (!text) {
    return false;
  }

  const hasCivicTerm = CIVIC_TERMS.some((term) =>
    text.includes(normalizeText(term))
  );
  if (hasCivicTerm) {
    return false;
  }

  return OBVIOUS_OFF_TOPIC_TERMS.some((term) =>
    text.includes(normalizeText(term))
  );
}
