const COUNCILOR_STATEMENT_ANCHOR_PREFIX = "councilor-opinion";

export function getCouncilorStatementAnchorId(statementIndex: number) {
  const safeIndex =
    Number.isFinite(statementIndex) && statementIndex >= 0
      ? Math.floor(statementIndex)
      : 0;

  return `${COUNCILOR_STATEMENT_ANCHOR_PREFIX}-${safeIndex}`;
}

export function getCouncilorStatementIndexFromHash(hash: string) {
  const normalizedHash = decodeURIComponent(hash).replace(/^#/, "");
  const match = normalizedHash.match(
    new RegExp(`^${COUNCILOR_STATEMENT_ANCHOR_PREFIX}-(\\d+)$`, "u")
  );

  if (!match?.[1]) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}
