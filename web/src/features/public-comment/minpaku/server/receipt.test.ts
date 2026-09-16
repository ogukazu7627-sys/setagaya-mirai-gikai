import { afterEach, describe, expect, it, vi } from "vitest";
import { sendPublicCommentReceipt } from "./receipt";
import type { ReceiptProvider } from "./receipt-provider";
import type { ReceiptRecord, ReceiptRepository } from "./receipt-repository";

function setup(overrides: Partial<ReceiptRecord> = {}) {
  let record: ReceiptRecord = {
    id: "receipt",
    session_id: "session",
    recipient: "owner@example.test",
    sender: null,
    subject: "fixed subject",
    body: "fixed body",
    final_body: "fixed",
    conversation: [],
    consent_version: "2026-09-16-receipt-v1",
    status: "pending",
    idempotency_key: "fixed-key",
    attempt_count: 0,
    first_attempt_at: null,
    next_attempt_at: null,
    lease_token: null,
    lease_expires_at: null,
    provider_id: null,
    failure_code: null,
    created_at: new Date().toISOString(),
    accepted_at: null,
    ...overrides,
  };
  const repository: ReceiptRepository = {
    find: vi.fn(async () => record),
    claim: vi.fn(async ({ sender, configFailure }) => {
      if (configFailure) {
        record = { ...record, status: "failed" };
        return null;
      }
      record = {
        ...record,
        sender: record.sender ?? sender,
        status: "pending",
        attempt_count: record.attempt_count + 1,
        lease_token: `lease-${record.attempt_count + 1}`,
        lease_expires_at: new Date(Date.now() + 120_000).toISOString(),
        first_attempt_at: record.first_attempt_at ?? new Date().toISOString(),
      };
      return record;
    }),
    finish: vi.fn(async ({ providerId, needsReview }) => {
      record = {
        ...record,
        status: providerId
          ? "accepted"
          : needsReview
            ? "needs_review"
            : "failed",
        provider_id: providerId ?? null,
        lease_token: null,
        lease_expires_at: null,
      };
    }),
  };
  const provider = {
    send: vi
      .fn<ReceiptProvider["send"]>()
      .mockResolvedValue({ status: "accepted", id: "resend-id" }),
  };
  const env = {
    PUBLIC_COMMENT_RECEIPT_EMAIL_ENABLED: "true",
    PUBLIC_COMMENT_RECEIPT_FROM: "sender@example.test",
    NODE_ENV: "test",
  };
  return { repository, provider, env };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("receipt dispatch with injected provider", () => {
  it("sends only the persisted snapshot", async () => {
    const deps = setup();
    expect(await sendPublicCommentReceipt("session", "owner", deps)).toEqual({
      status: "accepted",
      canRetry: false,
    });
    expect(deps.provider.send).toHaveBeenCalledWith({
      from: deps.env.PUBLIC_COMMENT_RECEIPT_FROM,
      to: "owner@example.test",
      subject: "fixed subject",
      text: "fixed body",
      idempotencyKey: "fixed-key",
    });
  });
  it("disabling email never calls the injected provider", async () => {
    const deps = setup();
    deps.env.PUBLIC_COMMENT_RECEIPT_EMAIL_ENABLED = "false";
    expect(await sendPublicCommentReceipt("session", "owner", deps)).toEqual({
      status: "failed",
      canRetry: true,
    });
    expect(deps.provider.send).not.toHaveBeenCalled();
  });
  it.each([
    {
      NODE_ENV: "test",
      VERCEL_ENV: "production",
      PUBLIC_COMMENT_RECEIPT_TEST_EMAIL: "owner@example.test",
    },
    { NODE_ENV: "production" },
    { NODE_ENV: "production", VERCEL_ENV: "preview" },
    {
      NODE_ENV: "development",
      PUBLIC_COMMENT_RECEIPT_TEST_EMAIL: "other@example.test",
    },
  ])("prevents live sends under unsafe environments: %j", async (environment) => {
    const deps = setup();
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("must not run"));
    const result = await sendPublicCommentReceipt("session", "owner", {
      repository: deps.repository,
      env: { ...deps.env, RESEND_API_KEY: "fake", ...environment },
    });
    expect(result).toEqual({ status: "failed", canRetry: true });
    expect(network).not.toHaveBeenCalled();
  });
  it("missing config never falsely marks sent", async () => {
    const deps = setup();
    expect(
      await sendPublicCommentReceipt("session", "owner", {
        repository: deps.repository,
        env: {},
      })
    ).toEqual({ status: "failed", canRetry: true });
    expect(deps.repository.finish).not.toHaveBeenCalled();
  });
  it("does not log exception contents on delivery or persistence failures", async () => {
    const deps = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    deps.provider.send.mockRejectedValue(
      new Error("secret transcript owner@example.test")
    );
    expect(await sendPublicCommentReceipt("session", "owner", deps)).toEqual({
      status: "failed",
      canRetry: true,
    });
    vi.mocked(deps.repository.find).mockRejectedValue(
      new Error("private address")
    );
    expect(await sendPublicCommentReceipt("session", "owner", deps)).toEqual({
      status: "pending",
      canRetry: true,
    });
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(
      /secret|transcript|example.test|private/
    );
  });
  it("does not dispatch without a claim", async () => {
    const deps = setup();
    vi.mocked(deps.repository.claim).mockResolvedValue(null);
    await sendPublicCommentReceipt("session", "owner", deps);
    expect(deps.provider.send).not.toHaveBeenCalled();
  });

  it("does not claim or dispatch an already accepted receipt", async () => {
    const deps = setup({ status: "accepted", provider_id: "resend-id" });
    expect(await sendPublicCommentReceipt("session", "owner", deps)).toEqual({
      status: "accepted",
      canRetry: false,
    });
    expect(deps.repository.claim).not.toHaveBeenCalled();
    expect(deps.provider.send).not.toHaveBeenCalled();
    expect(deps.repository.finish).not.toHaveBeenCalled();
  });

  it.each([
    0, 1,
  ])("rechecks the 23h deadline after a claim taking %i ms", async (claimDelay) => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const firstAttempt = Date.parse("2026-09-15T00:00:00.000Z");
    const deadline = firstAttempt + 23 * 60 * 60 * 1000;
    vi.setSystemTime(deadline - 1);
    const deps = setup({
      first_attempt_at: new Date(firstAttempt).toISOString(),
      attempt_count: 1,
      status: "failed",
    });
    const claim = vi.mocked(deps.repository.claim).getMockImplementation();
    if (!claim) throw new Error("Missing test claim implementation");
    vi.mocked(deps.repository.claim).mockImplementationOnce(async (params) => {
      const claimed = await claim(params);
      vi.setSystemTime(deadline - 1 + claimDelay);
      return claimed;
    });

    const result = await sendPublicCommentReceipt("session", "owner", deps);

    expect(deps.repository.claim).toHaveBeenCalledExactlyOnceWith({
      sessionId: "session",
      userId: "owner",
      sender: deps.env.PUBLIC_COMMENT_RECEIPT_FROM,
      configFailure: null,
    });
    if (claimDelay === 0) {
      expect(deps.provider.send).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: "accepted", canRetry: false });
    } else {
      expect(deps.provider.send).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "needs_review", canRetry: false });
    }
    expect(deps.repository.finish).toHaveBeenCalledExactlyOnceWith({
      receiptId: "receipt",
      leaseToken: "lease-2",
      providerId: claimDelay === 0 ? "resend-id" : undefined,
      needsReview: claimDelay !== 0,
    });
  });

  it("retries the identical persisted payload after acceptance followed by a DB failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T00:00:00.000Z"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const deps = setup();
    vi.mocked(deps.repository.finish).mockRejectedValueOnce(
      new Error("DB unavailable")
    );

    expect(await sendPublicCommentReceipt("session", "owner", deps)).toEqual({
      status: "pending",
      canRetry: true,
    });
    expect(deps.provider.send).toHaveBeenCalledTimes(1);
    expect(deps.repository.finish).toHaveBeenNthCalledWith(1, {
      receiptId: "receipt",
      leaseToken: "lease-1",
      providerId: "resend-id",
      needsReview: false,
    });

    await vi.advanceTimersByTimeAsync(120_001);
    deps.env.PUBLIC_COMMENT_RECEIPT_FROM = "changed-sender@example.test";
    expect(await sendPublicCommentReceipt("session", "owner", deps)).toEqual({
      status: "accepted",
      canRetry: false,
    });
    const expectedEmail = {
      from: "sender@example.test",
      to: "owner@example.test",
      subject: "fixed subject",
      text: "fixed body",
      idempotencyKey: "fixed-key",
    };
    expect(deps.provider.send.mock.calls).toEqual([
      [expectedEmail],
      [expectedEmail],
    ]);
    expect(deps.repository.finish).toHaveBeenNthCalledWith(2, {
      receiptId: "receipt",
      leaseToken: "lease-2",
      providerId: "resend-id",
      needsReview: false,
    });
    expect(deps.repository.finish).toHaveBeenCalledTimes(2);
    const persisted = await deps.repository.find("session", "owner");
    expect(persisted).toMatchObject({
      status: "accepted",
      sender: "sender@example.test",
      provider_id: "resend-id",
      first_attempt_at: "2026-09-16T00:00:00.000Z",
    });

    await sendPublicCommentReceipt("session", "owner", deps);
    expect(deps.repository.claim).toHaveBeenCalledTimes(2);
    expect(deps.provider.send).toHaveBeenCalledTimes(2);
  });
});
