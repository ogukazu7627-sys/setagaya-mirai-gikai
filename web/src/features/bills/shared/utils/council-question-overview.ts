export function formatCouncilQuestionCouncilorLabel(
  displayName: string
): string {
  const normalized = displayName.trim();
  return normalized.endsWith("議員") ? normalized : `${normalized}議員`;
}

function normalizeQuestionTopic(questionName: string): string {
  return questionName
    .trim()
    .replace(/[?？。．.]+$/u, "")
    .replace(/(?:について|に関する)(?:の質問|質問)?$/u, "")
    .replace(/^[「『](.*)[」』]$/u, "$1")
    .trim();
}

export function buildCouncilQuestionOverview(input: {
  councilorDisplayName: string;
  partyOrGroup: string | null;
  questionName: string;
}): string {
  const councilorLabel = formatCouncilQuestionCouncilorLabel(
    input.councilorDisplayName
  );
  const topic = normalizeQuestionTopic(input.questionName);
  const subject = topic || input.questionName.trim();
  const attribution = input.partyOrGroup?.trim()
    ? `${input.partyOrGroup.trim()}の意見として、`
    : "";

  return `${attribution}${councilorLabel}が「${subject}」について質問しました。`;
}
