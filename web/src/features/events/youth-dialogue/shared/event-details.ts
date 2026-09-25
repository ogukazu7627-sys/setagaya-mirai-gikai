export const YOUTH_DIALOGUE_EVENT = {
  name: "世田谷のみらいを語る会",
  dateLabel: "2026年10月3日（土）",
  timeLabel: "14:00〜16:00",
  startsAt: new Date("2026-10-03T14:00:00+09:00"),
  endsAt: new Date("2026-10-03T16:00:00+09:00"),
  venueName: "太子堂区民センター",
  roomName: "第二会議室",
  address: "東京都世田谷区太子堂1丁目14番20号",
  access: [
    "東急田園都市線「三軒茶屋」駅から徒歩4分",
    "東急世田谷線「三軒茶屋」駅から徒歩5分",
  ],
  facilityUrl: "https://www.city.setagaya.lg.jp/02072/8537.html",
  fee: "無料",
  contactEmail: "info@civictech-setagaya.org",
} as const;

/** 申込フォームで選べる関心分野。当日すべてを扱うとは限らない「話題の例」として表示する。 */
export const YOUTH_DIALOGUE_TOPICS = [
  "民泊",
  "いじめ",
  "高齢者福祉・介護",
  "障がい理解",
  "交通問題",
  "防災",
] as const;

/** 申込フォームで同意をお願いしている参加時の約束。 */
export const YOUTH_DIALOGUE_PROMISES = [
  "異なる意見を尊重する",
  "個人が特定される情報や発言を、許可なく外部に公開しない",
  "運営スタッフの案内に従う",
] as const;

/**
 * 申込締切・満席を運営が手動で反映する設定。
 * - 締切日時が決まったら registrationClosesAt に設定する（過ぎると自動で受付終了）
 * - 満席になったら manualStatus を "full" にする
 * - 開催時刻を過ぎると、設定にかかわらず申込ボタンは消える
 */
export const YOUTH_DIALOGUE_REGISTRATION: {
  registrationClosesAt: Date | null;
  manualStatus: "full" | "closed" | null;
} = {
  registrationClosesAt: null,
  manualStatus: null,
};
