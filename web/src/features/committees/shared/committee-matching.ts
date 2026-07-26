import { PUBLIC_COMMITTEE_NAMES } from "./committee-profiles";

export function normalizeCommitteeText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

export function getCommitteeSearchTerm(committeeName: string): string {
  return committeeName.replace(/(?:常任|特別)?委員会$/, "");
}

export function statusNoteMatchesCommittee(
  statusNote: string | null | undefined,
  committeeName: string
): boolean {
  if (!statusNote) {
    return false;
  }

  const normalizedNote = normalizeCommitteeText(statusNote);
  const normalizedName = normalizeCommitteeText(committeeName);
  const normalizedSearchTerm = normalizeCommitteeText(
    getCommitteeSearchTerm(committeeName)
  );

  return (
    normalizedNote.includes(normalizedName) ||
    (normalizedSearchTerm.length >= 2 &&
      normalizedNote.includes(normalizedSearchTerm))
  );
}

export function extractCommitteeName(
  statusNote: string | null | undefined
): string | null {
  if (!statusNote) {
    return null;
  }

  const knownCommittee = PUBLIC_COMMITTEE_NAMES.find((name) =>
    statusNoteMatchesCommittee(statusNote, name)
  );
  if (knownCommittee) {
    return knownCommittee;
  }

  return (
    statusNote.match(/[（(]([^）)]*委員会)[）)]/)?.[1]?.trim() ??
    statusNote.match(/([^、。]+委員会)/)?.[1]?.trim() ??
    null
  );
}
