import type {
  CouncilSearchContentType,
  CouncilSearchDocument,
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

export function searchCouncilDocuments(
  documents: CouncilSearchDocument[],
  filters: CouncilSearchFilters
): CouncilSearchDocument[] {
  return documents
    .filter((document) => matchesFilters(document, filters))
    .sort((left, right) => compareSubmittedDate(right, left));
}

export function hasActiveCouncilSearch(filters: CouncilSearchFilters): boolean {
  return (
    filters.contentType !== "all" ||
    filters.themeId.length > 0 ||
    filters.committeeName.length > 0
  );
}

function matchesFilters(
  document: CouncilSearchDocument,
  filters: CouncilSearchFilters
): boolean {
  if (
    filters.contentType !== "all" &&
    filters.contentType !== document.itemType
  ) {
    return false;
  }

  if (filters.themeId && document.majorCategoryId !== filters.themeId) {
    return false;
  }

  if (
    filters.committeeName &&
    document.committeeName !== filters.committeeName
  ) {
    return false;
  }

  return true;
}

function compareSubmittedDate(
  left: CouncilSearchDocument,
  right: CouncilSearchDocument
): number {
  return (left.submittedDate ?? "").localeCompare(right.submittedDate ?? "");
}
