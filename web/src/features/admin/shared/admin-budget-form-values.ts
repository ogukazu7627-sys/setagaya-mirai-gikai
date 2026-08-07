export const BUDGET_OVERALL_MAJOR_CATEGORY = "全体";

const SUMMARY_MAX_LENGTH = 180;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripMarkdown(value: string) {
  return normalizeWhitespace(
    value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/[*_~>#-]/g, " ")
  );
}

export function buildBudgetContentSummary(
  markdown: string | null | undefined,
  fallback: string
) {
  const summary = stripMarkdown(markdown ?? "") || fallback.trim();
  return summary.slice(0, SUMMARY_MAX_LENGTH);
}

export function buildBudgetContentMetadata({
  hardContent,
  name,
  normalContent,
}: {
  hardContent: string | null | undefined;
  name: string;
  normalContent: string | null | undefined;
}) {
  const title = name.trim();
  const normalSummary = buildBudgetContentSummary(normalContent, title);
  const hardSummary = hardContent
    ? buildBudgetContentSummary(hardContent, title)
    : null;

  return {
    normalTitle: title,
    normalSummary,
    hardTitle: hardContent ? title : null,
    hardSummary,
  };
}
