import { RECOMMENDATION_CATEGORIES } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { CouncilorProfileTheme } from "../councilor-profile-types";

export type CouncilorProfileThemeCount = {
  theme: CouncilorProfileTheme;
  count: number;
};

const PROFILE_THEME_BY_MAJOR_CATEGORY = new Map(
  RECOMMENDATION_CATEGORIES.map((category) => [
    `${category.name}${category.emoji}`,
    category.name as CouncilorProfileTheme,
  ])
);

const PROFILE_THEME_ORDER = new Map(
  RECOMMENDATION_CATEGORIES.map((category, index) => [category.name, index])
);

export function selectCouncilorProfileThemes(
  majorCategories: ReadonlyArray<string | null | undefined>,
  {
    limit = 3,
    minimumCount = 2,
  }: {
    limit?: number;
    minimumCount?: number;
  } = {}
): CouncilorProfileThemeCount[] {
  const countByTheme = new Map<CouncilorProfileTheme, number>();

  for (const majorCategory of majorCategories) {
    if (!majorCategory) {
      continue;
    }
    const theme = PROFILE_THEME_BY_MAJOR_CATEGORY.get(majorCategory);
    if (!theme) {
      continue;
    }
    countByTheme.set(theme, (countByTheme.get(theme) ?? 0) + 1);
  }

  return Array.from(countByTheme, ([theme, count]) => ({ theme, count }))
    .filter(({ count }) => count >= minimumCount)
    .sort(
      (themeA, themeB) =>
        themeB.count - themeA.count ||
        (PROFILE_THEME_ORDER.get(themeA.theme) ?? Number.MAX_SAFE_INTEGER) -
          (PROFILE_THEME_ORDER.get(themeB.theme) ?? Number.MAX_SAFE_INTEGER)
    )
    .slice(0, Math.max(0, limit));
}
