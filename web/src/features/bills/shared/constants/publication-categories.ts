import type { BillPublicationCategory } from "../types";

export const NORMAL_PUBLICATION_CATEGORIES = [
  "report",
  "general_question",
] as const satisfies readonly BillPublicationCategory[];

export function isNormalPublicationCategory(
  value: BillPublicationCategory
): value is (typeof NORMAL_PUBLICATION_CATEGORIES)[number] {
  return NORMAL_PUBLICATION_CATEGORIES.includes(
    value as (typeof NORMAL_PUBLICATION_CATEGORIES)[number]
  );
}
