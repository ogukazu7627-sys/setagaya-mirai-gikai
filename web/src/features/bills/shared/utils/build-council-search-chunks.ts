import remarkParse from "remark-parse";
import { unified } from "unified";
import { extractCommitteeName } from "@/features/committees/shared/committee-matching";
import { RECOMMENDATION_CATEGORIES } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { isCouncilorOpinionSectionTitle } from "@/lib/markdown/councilor-opinion-section";
import type {
  CouncilSearchChunkDraft,
  CouncilSearchIndexSource,
} from "../types/council-search-index";

export const COUNCIL_SEARCH_CHUNK_MAX_CHARACTERS = 1200;
export const COUNCIL_SEARCH_CHUNK_OVERLAP_CHARACTERS = 120;

type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
};

type SearchSection = {
  heading: string;
  text: string;
};

export function buildCouncilSearchChunks(
  source: CouncilSearchIndexSource
): CouncilSearchChunkDraft[] {
  const committeeName = extractCommitteeName(source.statusNote);
  const context = buildSharedContext(source, committeeName);
  const chunks: CouncilSearchChunkDraft[] = [
    createChunk(source, {
      chunkKey: "overview",
      chunkKind: "overview",
      heading: null,
      content: buildOverviewContent(source, committeeName),
      councilorId: null,
      councilorName: null,
      committeeName,
    }),
  ];

  markdownToSearchSections(source.content).forEach((section, sectionIndex) => {
    splitCouncilSearchText(section.text).forEach((text, partIndex) => {
      chunks.push(
        createChunk(source, {
          chunkKey: `content-${sectionIndex}-${partIndex}`,
          chunkKind: "content",
          heading: section.heading,
          content: `${context}\n見出し: ${section.heading}\n${text}`,
          councilorId: null,
          councilorName: null,
          committeeName,
        })
      );
    });
  });

  source.statements.forEach((statement) => {
    splitCouncilSearchText(statement.contentText).forEach((text, partIndex) => {
      chunks.push(
        createChunk(source, {
          chunkKey: `statement-${statement.statementIndex}-${partIndex}`,
          chunkKind: "councilor_statement",
          heading: statement.councilorName,
          content: [
            context,
            `発言者: ${statement.councilorName}`,
            statement.partyOrGroup
              ? `会派・所属: ${statement.partyOrGroup}`
              : "",
            text,
          ]
            .filter(Boolean)
            .join("\n"),
          councilorId: statement.councilorId,
          councilorName: statement.councilorName,
          committeeName,
        })
      );
    });
  });

  return chunks;
}

export function splitCouncilSearchText(
  value: string,
  maxCharacters = COUNCIL_SEARCH_CHUNK_MAX_CHARACTERS,
  overlapCharacters = COUNCIL_SEARCH_CHUNK_OVERLAP_CHARACTERS
): string[] {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const characters = Array.from(normalized);
  if (characters.length <= maxCharacters) {
    return [normalized];
  }

  const step = Math.max(1, maxCharacters - overlapCharacters);
  const chunks: string[] = [];
  for (let offset = 0; offset < characters.length; offset += step) {
    const chunk = characters.slice(offset, offset + maxCharacters).join("");
    if (chunk) {
      chunks.push(chunk);
    }
    if (offset + maxCharacters >= characters.length) {
      break;
    }
  }
  return chunks;
}

export function markdownToSearchSections(markdown: string): SearchSection[] {
  const root = unified().use(remarkParse).parse(markdown) as MarkdownNode;
  const sections: SearchSection[] = [];
  let heading = "本文";
  let textParts: string[] = [];
  let skipsCouncilorSection = false;

  function flush() {
    const text = textParts.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      sections.push({ heading, text });
    }
    textParts = [];
  }

  for (const node of root.children ?? []) {
    if (node.type === "heading") {
      const nextHeading = getMarkdownNodeText(node).trim() || "本文";
      if (node.depth === 1) {
        flush();
        skipsCouncilorSection = isCouncilorOpinionSectionTitle(nextHeading);
      } else if (!skipsCouncilorSection) {
        flush();
      }
      heading = nextHeading;
      continue;
    }

    if (!skipsCouncilorSection) {
      const text = getMarkdownNodeText(node).trim();
      if (text) {
        textParts.push(text);
      }
    }
  }
  flush();

  return sections;
}

function buildOverviewContent(
  source: CouncilSearchIndexSource,
  committeeName: string | null
): string {
  const category = findRecommendationCategory(source);
  return [
    `案件名: ${source.title}`,
    `正式名称: ${source.name}`,
    `概要: ${source.summary}`,
    `情報の種類: ${source.itemType}`,
    source.statusLabel ? `状態: ${source.statusLabel}` : "",
    source.submittedDate ? `日付: ${source.submittedDate}` : "",
    source.majorCategory ? `テーマ: ${source.majorCategory}` : "",
    committeeName ? `委員会: ${committeeName}` : "",
    source.tags.length > 0
      ? `タグ: ${source.tags.map((tag) => tag.label).join("、")}`
      : "",
    category ? `テーマの説明: ${category.description}` : "",
    category ? `関連語: ${category.smallTags.join("、")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSharedContext(
  source: CouncilSearchIndexSource,
  committeeName: string | null
): string {
  return [
    `案件名: ${source.title}`,
    source.majorCategory ? `テーマ: ${source.majorCategory}` : "",
    source.tags.length > 0
      ? `タグ: ${source.tags.map((tag) => tag.label).join("、")}`
      : "",
    committeeName ? `委員会: ${committeeName}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function createChunk(
  source: CouncilSearchIndexSource,
  input: Omit<
    CouncilSearchChunkDraft,
    | "billId"
    | "dietSessionId"
    | "normalizedContent"
    | "itemType"
    | "majorCategory"
  >
): CouncilSearchChunkDraft {
  const content = input.content.trim();
  return {
    ...input,
    billId: source.billId,
    dietSessionId: source.dietSessionId,
    content,
    normalizedContent: content
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
    itemType: source.itemType,
    majorCategory: source.majorCategory,
  };
}

function findRecommendationCategory(source: CouncilSearchIndexSource) {
  return RECOMMENDATION_CATEGORIES.find(
    (category) =>
      source.majorCategory?.includes(category.name) ||
      source.tags.some(
        (tag) =>
          tag.majorCategory?.includes(category.name) ||
          category.smallTags.some((smallTag) => smallTag === tag.label)
      )
  );
}

function getMarkdownNodeText(node: MarkdownNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }
  return node.children?.map(getMarkdownNodeText).join(" ") ?? "";
}
