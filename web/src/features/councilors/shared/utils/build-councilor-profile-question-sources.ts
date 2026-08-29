import { COUNCILOR_STATEMENT_PUBLICATION_CATEGORIES } from "@/features/bills/shared/constants/publication-categories";
import { extractCouncilorOpinionChatSection } from "@/lib/markdown/extract-councilor-opinion-chat-section";
import { normalizeCouncilorName } from "@/lib/markdown/councilor-icon-config";

export type CouncilorProfileStatementInput = {
  billId: string;
  billTitle: string;
  councilorName: string;
  difficultyLevel: string;
  majorCategory: string | null;
  normalContent: string | null;
  publicationCategory: string;
  publishStatus: string;
  statementIndex: number;
};

export type CouncilorProfileQuestionSource = {
  billId: string;
  billTitle: string;
  councilorName: string;
  majorCategory: string | null;
  questionText: string;
};

const PUBLICATION_CATEGORIES = new Set<string>(
  COUNCILOR_STATEMENT_PUBLICATION_CATEGORIES
);

export function buildCouncilorProfileQuestionSources(
  statements: readonly CouncilorProfileStatementInput[]
): CouncilorProfileQuestionSource[] {
  return statements.flatMap((statement) => {
    if (
      statement.difficultyLevel !== "normal" ||
      statement.publishStatus !== "published" ||
      !PUBLICATION_CATEGORIES.has(statement.publicationCategory) ||
      !statement.normalContent
    ) {
      return [];
    }

    const section = extractCouncilorOpinionChatSection(statement.normalContent);
    const normalizedCouncilorName = normalizeCouncilorName(
      statement.councilorName
    );
    const group = section?.groups.find(
      (candidate) =>
        candidate.groupIndex === statement.statementIndex &&
        normalizeCouncilorName(candidate.councilorName) ===
          normalizedCouncilorName
    );
    const questionText = group?.messages
      .filter(({ side }) => side === "questioner")
      .map(({ bodyText }) => bodyText.trim())
      .filter(Boolean)
      .join("\n\n");

    if (!questionText) {
      return [];
    }

    return [
      {
        billId: statement.billId,
        billTitle: statement.billTitle,
        councilorName: normalizedCouncilorName,
        majorCategory: statement.majorCategory,
        questionText,
      },
    ];
  });
}
