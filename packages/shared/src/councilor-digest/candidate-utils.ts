export type CandidateSource =
  | "questioner"
  | "committee_member"
  | "statement"
  | "manual";

export function normalizeJapaneseName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/議員$/u, "")
    .trim();
}

export function normalizeCommitteeName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[・･、，,／\/\\]/g, "")
    .replace(/[()（）「」『』【】［］\[\]]/g, "")
    .replace(/等/g, "")
    .trim();
}

export function isCommitteeNameMatch(
  sourceName: string,
  candidateName: string
) {
  const source = normalizeCommitteeName(sourceName);
  const candidate = normalizeCommitteeName(candidateName);
  if (!source || !candidate) {
    return false;
  }

  return (
    source === candidate ||
    source.includes(candidate) ||
    candidate.includes(source)
  );
}

export function extractQuestionerName(statusNote: string | null | undefined) {
  if (!statusNote) {
    return null;
  }

  const normalized = statusNote.normalize("NFKC");
  const match =
    normalized.match(/本会議で(.+?)議員が質問/u) ??
    normalized.match(/(.+?)議員が(?:代表|一般)?質問/u);

  return match?.[1] ? normalizeJapaneseName(match[1]) : null;
}

export function extractCommitteeName(statusNote: string | null | undefined) {
  if (!statusNote) {
    return null;
  }

  const normalized = statusNote.normalize("NFKC");
  return (
    normalized.match(/(?:報告先|付託委員会|担当委員会)[:：]\s*([^\n、,。]+?委員会)/u)
      ?.[1] ??
    normalized.match(/(?:（|\()([^（）()]*委員会)(?:）|\))/u)?.[1] ??
    normalized.match(
      /([一-龠ぁ-んァ-ヶー0-9０-９A-Za-z・･／\/]+委員会)/u
    )?.[1] ??
    null
  );
}

export function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}
