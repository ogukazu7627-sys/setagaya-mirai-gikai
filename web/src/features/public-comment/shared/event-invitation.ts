export type PublicCommentEventInvitationStatus =
  | "not_requested"
  | "pending"
  | "accepted"
  | "failed"
  | "needs_review";

export type PublicCommentEventInvitationResult = {
  status: PublicCommentEventInvitationStatus;
  canRetry: boolean;
};
