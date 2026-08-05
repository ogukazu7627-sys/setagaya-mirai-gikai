import { extractCouncilorOpinionChatSection } from "@/lib/markdown/extract-councilor-opinion-chat-section";

type GetCouncilorStatementPreviewTextInput = {
  normalContent: string | null | undefined;
  statementIndex: number;
  fallbackText: string;
};

function normalizePreviewText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\n{3,}/g, "\n\n");
}

export function getCouncilorStatementPreviewText({
  normalContent,
  statementIndex,
  fallbackText,
}: GetCouncilorStatementPreviewTextInput): string {
  const fallback = normalizePreviewText(fallbackText);

  if (!normalContent) {
    return fallback;
  }

  const targetGroup = extractCouncilorOpinionChatSection(
    normalContent
  )?.groups.find((group) => group.groupIndex === statementIndex);
  const firstCouncilorMessage =
    targetGroup?.messages.find((message) => message.side === "questioner") ??
    targetGroup?.messages[0];

  return normalizePreviewText(firstCouncilorMessage?.bodyText) || fallback;
}
