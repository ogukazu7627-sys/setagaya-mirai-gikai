import { normalizeCouncilorText } from "./councilor-icon-config";

export const COUNCILOR_OPINION_SECTION_TITLE = "議員、会派の意見";
export const LEGACY_COUNCILOR_OPINION_SECTION_TITLE = "議員の意見";

const COUNCILOR_OPINION_SECTION_TITLES = new Set([
  COUNCILOR_OPINION_SECTION_TITLE,
  LEGACY_COUNCILOR_OPINION_SECTION_TITLE,
]);

export function isCouncilorOpinionSectionTitle(value: string): boolean {
  return COUNCILOR_OPINION_SECTION_TITLES.has(normalizeCouncilorText(value));
}
