import type { MajorCategoryLabel } from "@/features/bills/shared/types";
import { RECOMMENDATION_CATEGORY_OPTIONS } from "@/features/recommendations/shared/constants/recommendation-taxonomy";

export const MAX_ADMIN_TAG_COUNT = 3;

export const ADMIN_FIXED_TAGS_BY_MAJOR_CATEGORY = Object.fromEntries(
  RECOMMENDATION_CATEGORY_OPTIONS.map((category) => [
    category.label,
    category.smallTags,
  ])
) as unknown as Record<MajorCategoryLabel, readonly string[]>;

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
