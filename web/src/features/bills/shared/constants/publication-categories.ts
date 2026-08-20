import type { BillPublicationCategory } from "../types";

export const NORMAL_PUBLICATION_CATEGORIES = [
  "report",
  "general_question",
] as const satisfies readonly BillPublicationCategory[];

/**
 * 議員の発言のように、通常案件と予算案件をまとめて扱う場面で使う。
 * 通常の一覧・検索は NORMAL_PUBLICATION_CATEGORIES のままにする。
 */
export const COUNCILOR_STATEMENT_PUBLICATION_CATEGORIES = [
  ...NORMAL_PUBLICATION_CATEGORIES,
  "budget",
] as const satisfies readonly BillPublicationCategory[];

export function isNormalPublicationCategory(
  value: BillPublicationCategory
): value is (typeof NORMAL_PUBLICATION_CATEGORIES)[number] {
  return NORMAL_PUBLICATION_CATEGORIES.includes(
    value as (typeof NORMAL_PUBLICATION_CATEGORIES)[number]
  );
}
