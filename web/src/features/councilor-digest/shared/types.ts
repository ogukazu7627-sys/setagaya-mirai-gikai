import type { CandidateSource } from "@mirai-gikai/shared/councilor-digest/candidate-utils";

export type CouncilorRecipientCandidate = {
  id: string;
  displayName: string;
  iconUrl: string | null;
  source: CandidateSource;
  sourceLabel: string;
  recommended: boolean;
};

export type ReportRecipientSelection = {
  candidates: CouncilorRecipientCandidate[];
  selectedCouncilorIds: string[];
  selectedCouncilors: CouncilorRecipientCandidate[];
  shareContact: boolean;
  alreadySentCouncilorIds: string[];
};

export type SaveReportRecipientsResult = {
  success: boolean;
  message: string;
};
