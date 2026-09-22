export const PUBLIC_COMMENT_FUNNEL_STORAGE_PREFIX =
  "mirai-public-comment-funnel";

export const YOUTH_DIALOGUE_AD_CAMPAIGN = "event-2026-10-03-wave2";
export const YOUTH_DIALOGUE_INTERVIEW_RSVP_URL =
  "https://forms.gle/sx7BdN5ZgWEk1cSKA";
export const YOUTH_DIALOGUE_DIRECT_RSVP_URL =
  "https://forms.gle/yJb9ivpgyBAi2iwS6";

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
