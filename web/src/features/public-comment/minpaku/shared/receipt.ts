export type PublicCommentReceiptStatus =
  | "not_requested"
  | "pending"
  | "accepted"
  | "failed"
  | "needs_review";

export type ReceiptResult = {
  status: PublicCommentReceiptStatus;
  canRetry: boolean;
};

export type PublicCommentReceipt = ReceiptResult;
