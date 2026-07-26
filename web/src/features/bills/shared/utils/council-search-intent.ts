import {
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_TAG_ALIASES,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type {
  CouncilSearchCouncilor,
  CouncilSearchIntent,
} from "../types/council-ai-search";

const MAX_SEARCH_TERMS = 16;
const MAX_EMBEDDING_CONTEXT_TAGS = 12;
const GENERIC_QUERY_TERMS = new Set([
  "教えて",
  "知りたい",
  "関連",
  "関連する",
  "もの",
  "こと",
  "案件",
  "議会",
  "世田谷",
  "世田谷区",
  "いま",
  "今",
]);

export function buildCouncilSearchIntent(
  query: string,
  councilors: CouncilSearchCouncilor[]
): CouncilSearchIntent {
  const normalizedQuery = normalizeCouncilSearchText(query);
  const matchedCategories = RECOMMENDATION_CATEGORIES.filter((category) => {
    const candidates = [
      category.name,
      category.description,
      ...category.smallTags,
    ].map(normalizeCouncilSearchText);
    return candidates.some(
      (candidate) => candidate && normalizedQuery.includes(candidate)
    );
  });
  const matchedCouncilors = resolveCouncilorMentions(
    normalizedQuery,
    councilors
  );
  const hasCouncilorMention =
    /[一-龠々ぁ-んァ-ヶー・]{2,20}(?:区議会)?議員/.test(normalizedQuery);
  const directTerms = splitQueryTerms(normalizedQuery);
  const taxonomyTerms = matchedCategories.flatMap((category) => [
    category.name,
    ...category.smallTags,
  ]);
  const aliasTerms = Object.entries(RECOMMENDATION_TAG_ALIASES).flatMap(
    ([alias, canonical]) =>
      normalizedQuery.includes(normalizeCouncilSearchText(alias))
        ? [alias, canonical]
        : []
  );
  const terms = uniqueSearchTerms([
    ...matchedCouncilors.map((councilor) => councilor.normalizedName),
    ...directTerms,
    ...taxonomyTerms,
    ...aliasTerms,
  ]).slice(0, MAX_SEARCH_TERMS);
  const taxonomyContext = matchedCategories
    .map((category) =>
      [
        `テーマ: ${category.name}`,
        `説明: ${category.description}`,
        `関連語: ${category.smallTags
          .slice(0, MAX_EMBEDDING_CONTEXT_TAGS)
          .join("、")}`,
      ].join("\n")
    )
    .join("\n");

  return {
    normalizedQuery,
    embeddingText: [query.trim(), taxonomyContext].filter(Boolean).join("\n"),
    terms,
    councilorIds: Array.from(
      new Set(
        matchedCouncilors.flatMap((councilor) =>
          councilor.id ? [councilor.id] : []
        )
      )
    ),
    councilorNames: Array.from(
      new Set(matchedCouncilors.map((councilor) => councilor.normalizedName))
    ),
    hasUnresolvedCouncilorMention:
      hasCouncilorMention && matchedCouncilors.length === 0,
  };
}

export function normalizeCouncilSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function resolveCouncilorMentions(
  normalizedQuery: string,
  councilors: CouncilSearchCouncilor[]
): CouncilSearchCouncilor[] {
  const normalizedCouncilors = councilors.map((councilor) => ({
    ...councilor,
    normalizedName: normalizeCouncilSearchText(councilor.normalizedName),
  }));
  const exactMentions = normalizedCouncilors.filter(
    (councilor) =>
      councilor.normalizedName.length >= 2 &&
      normalizedQuery.includes(councilor.normalizedName)
  );
  if (exactMentions.length > 0) {
    return deduplicateCouncilors(exactMentions);
  }

  const mentionCandidates = Array.from(
    normalizedQuery.matchAll(/([一-龠々ぁ-んァ-ヶー・]{2,20})(?:区議会)?議員/g),
    (match) => match[1]
  ).filter((value): value is string => Boolean(value));
  const partialMentions = mentionCandidates.flatMap((candidate) =>
    normalizedCouncilors.filter(
      (councilor) =>
        councilor.normalizedName.includes(candidate) ||
        candidate.includes(councilor.normalizedName)
    )
  );

  return deduplicateCouncilors(partialMentions);
}

function splitQueryTerms(query: string): string[] {
  const segments = query
    .split(/[\s、。,.!?！？「」『』（）()[\]{}・/／:：]+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return segments.filter(
    (term) =>
      term.length >= 2 && term.length <= 40 && !GENERIC_QUERY_TERMS.has(term)
  );
}

function uniqueSearchTerms(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map(normalizeCouncilSearchText)
        .filter(
          (term) =>
            term.length >= 2 &&
            term.length <= 40 &&
            !GENERIC_QUERY_TERMS.has(term)
        )
    )
  );
}

function deduplicateCouncilors(
  councilors: CouncilSearchCouncilor[]
): CouncilSearchCouncilor[] {
  const seen = new Set<string>();
  return councilors.filter((councilor) => {
    const key = councilor.id ?? councilor.normalizedName;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
