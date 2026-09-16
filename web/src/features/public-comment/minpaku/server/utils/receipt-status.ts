import type { PublicCommentReceipt } from "../../shared/receipt";

export function receiptStatus(
  record: {
    status: string;
    attempt_count: number;
    first_attempt_at: string | null;
    lease_expires_at: string | null;
    next_attempt_at: string | null;
  } | null,
  now = Date.now()
): PublicCommentReceipt {
  if (!record) return { status: "not_requested", canRetry: false };
  if (record.status === "accepted")
    return { status: "accepted", canRetry: false };
  const leased =
    !!record.lease_expires_at && Date.parse(record.lease_expires_at) > now;
  if (leased) return { status: "pending", canRetry: true };
  if (
    record.status === "needs_review" ||
    record.attempt_count >= 10 ||
    (record.first_attempt_at &&
      now - Date.parse(record.first_attempt_at) >= 23 * 60 * 60 * 1000)
  )
    return { status: "needs_review", canRetry: false };
  return {
    status: record.status === "failed" ? "failed" : "pending",
    // Availability is durable; the claim RPC, not the UI, enforces cooldowns.
    canRetry: true,
  };
}
