import type {
  CouncilSearchContentType,
  CouncilSearchFilters,
  CouncilSearchInitialFilters,
} from "../types/council-search";

export const COUNCIL_SEARCH_PAGE_SIZE = 5;

const CONTENT_TYPES = new Set<CouncilSearchContentType>([
  "all",
  "bill",
  "report",
  "petition",
  "question",
]);

export function createCouncilSearchFilters(
  initialFilters: CouncilSearchInitialFilters,
  committeeNames: string[],
  validThemeIds: string[]
): CouncilSearchFilters {
  const requestedType = initialFilters.type as CouncilSearchContentType;
  const validCommitteeNames = new Set(committeeNames);

  return {
    contentType: CONTENT_TYPES.has(requestedType) ? requestedType : "all",
    themeId:
      initialFilters.theme && validThemeIds.includes(initialFilters.theme)
        ? initialFilters.theme
        : "",
    committeeName:
      initialFilters.committee &&
      validCommitteeNames.has(initialFilters.committee)
        ? initialFilters.committee
        : "",
  };
}

export function hasActiveCouncilSearch(filters: CouncilSearchFilters): boolean {
  return (
    filters.contentType !== "all" ||
    filters.themeId.length > 0 ||
    filters.committeeName.length > 0
  );
}
