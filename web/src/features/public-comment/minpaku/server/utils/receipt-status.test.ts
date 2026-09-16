import { describe, expect, it } from "vitest";
import { receiptStatus } from "./receipt-status";

const now = Date.now();
const record = {
  status: "failed",
  attempt_count: 1,
  first_attempt_at: new Date(now).toISOString(),
  lease_expires_at: null,
  next_attempt_at: null,
};
describe("receiptStatus", () => {
  it("distinguishes not requested and provider accepted", () => {
    expect(receiptStatus(null)).toEqual({
      status: "not_requested",
      canRetry: false,
    });
    expect(receiptStatus({ ...record, status: "accepted" })).toEqual({
      status: "accepted",
      canRetry: false,
    });
  });
  it("keeps retry visible during cooldown and lease", () => {
    expect(
      receiptStatus(
        { ...record, next_attempt_at: new Date(now + 60_000).toISOString() },
        now
      )
    ).toEqual({ status: "failed", canRetry: true });
    expect(
      receiptStatus(
        { ...record, lease_expires_at: new Date(now + 120_000).toISOString() },
        now
      )
    ).toEqual({ status: "pending", canRetry: true });
  });
  it("stops at 23h, maximum attempts, or explicit review", () => {
    expect(receiptStatus(record, now + 23 * 3600_000)).toEqual({
      status: "needs_review",
      canRetry: false,
    });
    expect(receiptStatus({ ...record, attempt_count: 10 })).toEqual({
      status: "needs_review",
      canRetry: false,
    });
    expect(receiptStatus({ ...record, status: "needs_review" })).toEqual({
      status: "needs_review",
      canRetry: false,
    });
  });
});
