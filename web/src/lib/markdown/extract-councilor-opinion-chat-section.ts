import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  getCouncilorIconUrl,
  getCouncilorPartyOrGroup,
  normalizeCouncilorName,
  normalizeCouncilorText,
} from "./councilor-icon-config";
import {
  COUNCILOR_OPINION_SECTION_TITLE,
  isCouncilorOpinionSectionTitle,
} from "./councilor-opinion-section";

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

export type CouncilorOpinionChatMessageSide = "questioner" | "answerer";

export type CouncilorOpinionChatMessage = {
  messageIndex: number;
  rawSpeaker: string;
  speakerName: string;
  partyOrGroup: string | null;
  bodyText: string;
  side: CouncilorOpinionChatMessageSide;
};

export type CouncilorOpinionChatGroup = {
  groupIndex: number;
  rawHeading: string;
  councilorName: string;
  partyOrGroup: string | null;
  iconUrl: string;
  messages: CouncilorOpinionChatMessage[];
};

export type CouncilorOpinionChatSection = {
  title: typeof COUNCILOR_OPINION_SECTION_TITLE;
  startOffset: number;
  endOffset: number;
  groups: CouncilorOpinionChatGroup[];
};

export type SplitCouncilorOpinionChatMarkdown = {
  beforeMarkdown: string;
  chatSection: CouncilorOpinionChatSection;
  afterMarkdown: string;
};

function parseMarkdown(markdown: string): MarkdownNode {
  return unified().use(remarkParse).parse(markdown) as MarkdownNode;
}

function isHeading(node: MarkdownNode, depth: number): boolean {
  return node.type === "heading" && node.depth === depth;
}

function isNestedMessageHeading(node: MarkdownNode): boolean {
  return (
    node.type === "heading" && typeof node.depth === "number" && node.depth > 3
  );
}

function isThematicBreak(node: MarkdownNode): boolean {
  return node.type === "thematicBreak";
}

function getNodeText(node: MarkdownNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }

  return node.children?.map(getNodeText).join(" ") ?? "";
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

function getNodesEndOffset(nodes: MarkdownNode[], fallback: number): number {
  return getEndOffset(nodes.at(-1)) ?? fallback;
}

function normalizeSpeakerComparisonKey(value: string): string {
  const normalizedName = normalizeCouncilorName(value);
  const withoutRoleAfterSeparator = normalizeCouncilorName(
    normalizedName.replace(/[・･].*$/u, "")
  );

  return normalizeCouncilorText(withoutRoleAfterSeparator).replace(/\s+/g, "");
}

function isQuestionerSpeaker(speaker: string, groupHeading: string): boolean {
  const speakerKey = normalizeSpeakerComparisonKey(speaker);
  const groupKey = normalizeSpeakerComparisonKey(groupHeading);

  return speakerKey !== "" && groupKey !== "" && speakerKey === groupKey;
}

function findNextHeadingIndex(
  nodes: MarkdownNode[],
  startIndex: number,
  depth: number
): number {
  const nextHeadingOffset = nodes
    .slice(startIndex + 1)
    .findIndex((candidate) => isHeading(candidate, depth));

  return nextHeadingOffset === -1
    ? nodes.length
    : startIndex + 1 + nextHeadingOffset;
}

function findNextMessageBoundaryIndex(
  nodes: MarkdownNode[],
  startIndex: number
): number {
  const nextBoundaryOffset = nodes
    .slice(startIndex + 1)
    .findIndex(
      (candidate) => isHeading(candidate, 3) || isThematicBreak(candidate)
    );

  return nextBoundaryOffset === -1
    ? nodes.length
    : startIndex + 1 + nextBoundaryOffset;
}

function extractMessagesFromGroup(
  markdown: string,
  groupNodes: MarkdownNode[],
  groupHeading: string
): CouncilorOpinionChatMessage[] {
  const messages: CouncilorOpinionChatMessage[] = [];

  groupNodes.forEach((node, index) => {
    if (!isHeading(node, 3)) {
      return;
    }

    const nextBoundaryIndex = findNextMessageBoundaryIndex(groupNodes, index);
    const nextBoundary = groupNodes[nextBoundaryIndex];
    const messageNodes = groupNodes.slice(index + 1, nextBoundaryIndex);

    if (messageNodes.some(isNestedMessageHeading)) {
      return;
    }

    const endOffset =
      getStartOffset(nextBoundary) ??
      getNodesEndOffset(messageNodes, getEndOffset(node) ?? 0);
    const bodyText = sliceMarkdown(markdown, getEndOffset(node), endOffset);

    if (!bodyText) {
      return;
    }

    const rawSpeaker = normalizeCouncilorText(getNodeText(node));
    messages.push({
      messageIndex: messages.length,
      rawSpeaker,
      speakerName: normalizeCouncilorName(rawSpeaker),
      partyOrGroup: getCouncilorPartyOrGroup(rawSpeaker),
      bodyText,
      side: isQuestionerSpeaker(rawSpeaker, groupHeading)
        ? "questioner"
        : "answerer",
    });
  });

  return messages;
}

export function extractCouncilorOpinionChatSection(
  markdown: string
): CouncilorOpinionChatSection | null {
  const root = parseMarkdown(markdown);
  const nodes = root.children ?? [];
  const sectionStartIndex = nodes.findIndex(
    (node) =>
      isHeading(node, 1) && isCouncilorOpinionSectionTitle(getNodeText(node))
  );

  if (sectionStartIndex === -1) {
    return null;
  }

  const sectionStartNode = nodes[sectionStartIndex];
  const followingNodes = nodes.slice(sectionStartIndex + 1);
  const nextH1Offset = followingNodes.findIndex((node) => isHeading(node, 1));
  const sectionEndIndex =
    nextH1Offset === -1 ? nodes.length : sectionStartIndex + 1 + nextH1Offset;
  const sectionNodes = nodes.slice(sectionStartIndex + 1, sectionEndIndex);
  const groups: CouncilorOpinionChatGroup[] = [];

  sectionNodes.forEach((node, index) => {
    if (!isHeading(node, 2)) {
      return;
    }

    const nextHeadingIndex = findNextHeadingIndex(sectionNodes, index, 2);
    const groupNodes = sectionNodes.slice(index + 1, nextHeadingIndex);
    const rawHeading = normalizeCouncilorText(getNodeText(node));
    const messages = extractMessagesFromGroup(markdown, groupNodes, rawHeading);

    if (messages.length === 0) {
      return;
    }

    groups.push({
      groupIndex: groups.length,
      rawHeading,
      councilorName: normalizeCouncilorName(rawHeading),
      partyOrGroup: getCouncilorPartyOrGroup(rawHeading),
      iconUrl: getCouncilorIconUrl(rawHeading),
      messages,
    });
  });

  if (groups.length === 0) {
    return null;
  }

  return {
    title: COUNCILOR_OPINION_SECTION_TITLE,
    startOffset: getStartOffset(sectionStartNode) ?? 0,
    endOffset:
      getStartOffset(nodes[sectionEndIndex]) ??
      getNodesEndOffset(nodes, markdown.length),
    groups,
  };
}

export function splitMarkdownByCouncilorOpinionChatSection(
  markdown: string
): SplitCouncilorOpinionChatMarkdown | null {
  const chatSection = extractCouncilorOpinionChatSection(markdown);

  if (chatSection === null) {
    return null;
  }

  return {
    beforeMarkdown: markdown.slice(0, chatSection.startOffset).trimEnd(),
    chatSection,
    afterMarkdown: markdown.slice(chatSection.endOffset).trimStart(),
  };
}
