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
  "committee",
]);

export function createCouncilSearchFilters(
  initialFilters: CouncilSearchInitialFilters,
  documents: CouncilSearchDocument[],
  validThemeIds: string[]
): CouncilSearchFilters {
  const requestedType = initialFilters.type as CouncilSearchContentType;
  const committeeNames = new Set(
    documents
      .filter((document) => document.kind === "committee")
      .map((document) => document.name)
  );

  return {
    query: initialFilters.q?.trim() ?? "",
    contentType: CONTENT_TYPES.has(requestedType) ? requestedType : "all",
    themeId:
      initialFilters.theme && validThemeIds.includes(initialFilters.theme)
        ? initialFilters.theme
        : "",
    committeeName:
      initialFilters.committee && committeeNames.has(initialFilters.committee)
        ? initialFilters.committee
        : "",
  };
}

export function searchCouncilDocuments(
  documents: CouncilSearchDocument[],
  filters: CouncilSearchFilters
): CouncilSearchDocument[] {
  const tokenGroups = tokenize(filters.query);
  const hasExplicitSearch =
    tokenGroups.length > 0 ||
    filters.contentType !== "all" ||
    Boolean(filters.themeId) ||
    Boolean(filters.committeeName);

  return documents
    .flatMap((document) => {
      if (!matchesFilters(document, filters)) {
        return [];
      }

      const score = scoreDocument(document, tokenGroups);
      return score == null ? [] : [{ document, score }];
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (!hasExplicitSearch) {
        return compareSubmittedDate(right.document, left.document);
      }

      if (left.document.kind !== right.document.kind) {
        return left.document.kind === "committee" ? -1 : 1;
      }

      return compareSubmittedDate(right.document, left.document);
    })
    .map(({ document }) => document);
}

export function hasActiveCouncilSearch(filters: CouncilSearchFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
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
    (document.kind === "committee"
      ? filters.contentType !== "committee"
      : filters.contentType !== document.itemType)
  ) {
    return false;
  }

  if (
    filters.themeId &&
    (document.kind === "committee" ||
      document.majorCategoryId !== filters.themeId)
  ) {
    return false;
  }

  if (
    filters.committeeName &&
    (document.kind === "committee" ||
      document.committeeName !== filters.committeeName)
  ) {
    return false;
  }

  return true;
}

function scoreDocument(
  document: CouncilSearchDocument,
  tokenGroups: string[][]
): number | null {
  if (tokenGroups.length === 0) {
    return 0;
  }

  const fields =
    document.kind === "committee"
      ? [
          [document.name, 16],
          [document.committeeKindLabel, 5],
          [document.summary, 4],
          [document.responsibilities.join(" "), 8],
        ]
      : [
          [document.title, 16],
          [document.officialName, 10],
          [document.summary, 4],
          [document.tags.join(" "), 9],
          [document.majorCategoryLabel ?? "", 7],
          [document.committeeName ?? "", 8],
        ];

  let score = 0;
  for (const tokenGroup of tokenGroups) {
    let groupScore = 0;
    for (const token of tokenGroup) {
      for (const [value, weight] of fields) {
        const normalizedValue = normalizeSearchText(String(value));
        if (normalizedValue === token) {
          groupScore = Math.max(groupScore, Number(weight) + 8);
        } else if (normalizedValue.includes(token)) {
          groupScore = Math.max(groupScore, Number(weight));
        }
      }
    }

    if (groupScore === 0) {
      return null;
    }
    score += groupScore;
  }

  return score;
}

function tokenize(query: string): string[][] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter(Boolean)
    .map((group) => group.split(/[・/／]+/).filter(Boolean));
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim();
}

function compareSubmittedDate(
  left: CouncilSearchDocument,
  right: CouncilSearchDocument
): number {
  const leftDate = left.kind === "bill" ? left.submittedDate : null;
  const rightDate = right.kind === "bill" ? right.submittedDate : null;
  return (leftDate ?? "").localeCompare(rightDate ?? "");
}
