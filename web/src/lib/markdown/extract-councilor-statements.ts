import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  getCouncilorPartyOrGroup,
  normalizeCouncilorName,
  normalizeCouncilorText,
} from "./councilor-icon-config";

const COUNCILOR_OPINION_SECTION_TITLE = "議員の意見";

type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

export type ExtractedCouncilorStatement = {
  statementIndex: number;
  rawHeading: string;
  councilorName: string;
  partyOrGroup: string | null;
  contentMd: string;
  contentText: string;
  sourceSectionTitle: typeof COUNCILOR_OPINION_SECTION_TITLE;
};

function isHeading(node: MarkdownNode, depth: number): boolean {
  return node.type === "heading" && node.depth === depth;
}

function getNodeText(node: MarkdownNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }

  return node.children?.map(getNodeText).join(" ") ?? "";
}

function getNodesText(nodes: MarkdownNode[]): string {
  return nodes.map(getNodeText).join(" ").replace(/\s+/g, " ").trim();
}

function getStartOffset(node: MarkdownNode | undefined): number | null {
  return typeof node?.position?.start?.offset === "number"
    ? node.position.start.offset
    : null;
}

function getEndOffset(node: MarkdownNode | undefined): number | null {
  return typeof node?.position?.end?.offset === "number"
    ? node.position.end.offset
    : null;
}

function sliceMarkdown(
  markdown: string,
  startOffset: number | null,
  endOffset: number | null
): string {
  if (startOffset === null || endOffset === null || endOffset <= startOffset) {
    return "";
  }

  return markdown.slice(startOffset, endOffset).trim();
}

function parseMarkdown(markdown: string): MarkdownNode {
  return unified().use(remarkParse).parse(markdown) as MarkdownNode;
}

export function extractCouncilorStatementsFromMarkdown(
  markdown: string
): ExtractedCouncilorStatement[] {
  const root = parseMarkdown(markdown);
  const nodes = root.children ?? [];
  const sectionStartIndex = nodes.findIndex(
    (node) =>
      isHeading(node, 1) &&
      normalizeCouncilorText(getNodeText(node)) ===
        COUNCILOR_OPINION_SECTION_TITLE
  );

  if (sectionStartIndex === -1) {
    return [];
  }

  const sectionNodes: MarkdownNode[] = [];
  for (const node of nodes.slice(sectionStartIndex + 1)) {
    if (isHeading(node, 1)) {
      break;
    }
    sectionNodes.push(node);
  }

  const statements: ExtractedCouncilorStatement[] = [];

  sectionNodes.forEach((node, index) => {
    if (!isHeading(node, 2)) {
      return;
    }

    const nextHeadingOffset = sectionNodes
      .slice(index + 1)
      .findIndex((candidate) => isHeading(candidate, 2));
    const nextHeadingIndex =
      nextHeadingOffset === -1
        ? sectionNodes.length
        : index + 1 + nextHeadingOffset;
    const nextHeading = sectionNodes[nextHeadingIndex];
    const bodyNodes = sectionNodes.slice(index + 1, nextHeadingIndex);
    const statementEndOffset =
      getStartOffset(nextHeading) ?? getEndOffset(sectionNodes.at(-1)) ?? null;
    const contentMd = sliceMarkdown(
      markdown,
      getEndOffset(node),
      statementEndOffset
    );

    if (!contentMd) {
      return;
    }

    const rawHeading = normalizeCouncilorText(getNodeText(node));
    statements.push({
      statementIndex: statements.length,
      rawHeading,
      councilorName: normalizeCouncilorName(rawHeading),
      partyOrGroup: getCouncilorPartyOrGroup(rawHeading),
      contentMd,
      contentText: getNodesText(bodyNodes),
      sourceSectionTitle: COUNCILOR_OPINION_SECTION_TITLE,
    });
  });

  return statements;
}
