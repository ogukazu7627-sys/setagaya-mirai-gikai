export const PUBLIC_COMMENT_FUNNEL_STORAGE_PREFIX =
  "mirai-public-comment-funnel";

export const YOUTH_DIALOGUE_EVENT_SLUG = "youth-dialogue-2026-10-03";
export const YOUTH_DIALOGUE_EVENT_PATH = "/events/youth-dialogue-2026-10-03";
export const YOUTH_DIALOGUE_AGREEMENT_VERSION = "2026-09-22-v1";
export const YOUTH_DIALOGUE_AD_CAMPAIGN = "event-2026-10-03-wave2";

export const YOUTH_DIALOGUE_INTERESTS = [
  "民泊",
  "いじめ",
  "高齢者福祉・介護",
  "障がい理解",
  "交通問題",
  "防災",
] as const;

export type FunnelJourneyType = "interview" | "event_direct";

export type FunnelAttributionInput = {
  publicToken?: string | null;
  journeyType: FunnelJourneyType;
  adTheme: string;
  landingPath: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
};
