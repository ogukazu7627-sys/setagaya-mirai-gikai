export const COUNCILOR_PROFILE_THEMES = [
  "教育",
  "子育て",
  "福祉",
  "まちづくり",
  "防災",
  "行財政",
  "文化・スポーツ",
  "産業",
  "環境問題",
  "暮らし",
] as const;

export type CouncilorProfileTheme = (typeof COUNCILOR_PROFILE_THEMES)[number];

export type CouncilorProfileCatalogEntry = {
  normalizedName: string;
  factionName: string;
  summary: string | null;
  themes: readonly CouncilorProfileTheme[];
  questionCount: number | null;
  summaryAsOf: string | null;
};
