import remarkParse from "remark-parse";
import { unified } from "unified";

export type BillFaqItem = {
  question: string;
  answer: string;
};

type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
};

export function extractBillFaq(markdown: string): BillFaqItem[] {
  const root = unified().use(remarkParse).parse(markdown) as MarkdownNode;
  const faqItems: BillFaqItem[] = [];
  let inFaqSection = false;
  let currentQuestion = "";
  let answerNodes: MarkdownNode[] = [];

  function flush() {
    const question = normalizeText(currentQuestion);
    const answer = normalizeText(answerNodes.map(getNodeText).join(" "));
    if (question && answer) {
      faqItems.push({ question, answer });
    }
    currentQuestion = "";
    answerNodes = [];
  }

  for (const node of root.children ?? []) {
    if (node.type === "heading" && node.depth === 1) {
      if (inFaqSection) {
        flush();
      }
      inFaqSection = normalizeHeading(getNodeText(node)) === "よくある質問";
      continue;
    }

    if (!inFaqSection) {
      continue;
    }

    if (node.type === "heading" && node.depth === 2) {
      flush();
      currentQuestion = getNodeText(node);
      continue;
    }

    if (currentQuestion) {
      answerNodes.push(node);
    }
  }

  if (inFaqSection) {
    flush();
  }

  return faqItems;
}

function getNodeText(node: MarkdownNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }
  return node.children?.map(getNodeText).join(" ") ?? "";
}

function normalizeHeading(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, "").trim();
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
