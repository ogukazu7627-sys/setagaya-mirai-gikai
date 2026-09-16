import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createResendReceiptProvider,
  type ReceiptEmail,
} from "./receipt-provider";

const email: ReceiptEmail = {
  from: "sender@example.test",
  to: "owner@example.test",
  subject: "控え",
  text: "会話\n<原文> & 本文",
  idempotencyKey: "minpaku-receipt/session",
};

describe("Resend receipt provider (fake HTTP only)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("sends plaintext with deterministic idempotency key; acceptance is not delivery", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "provider-id" }), { status: 200 })
      );
    expect(
      await createResendReceiptProvider("fake-key", request).send(email)
    ).toEqual({ status: "accepted", id: "provider-id" });
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.headers).toMatchObject({
      "Idempotency-Key": email.idempotencyKey,
    });
    expect(JSON.parse(init?.body as string)).toEqual({
      from: email.from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
    });
  });
  it.each([400, 401, 429, 500])("does not accept HTTP %s", async (status) => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("private error", { status }));
    expect(
      await createResendReceiptProvider("fake", request).send(email)
    ).toEqual({ status: "failed" });
  });
  it("distinguishes conflicting payload from a concurrent request", async () => {
    for (const [name, status] of [
      ["invalid_idempotent_request", "needs_review"],
      ["concurrent_idempotent_requests", "failed"],
    ]) {
      const request = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify({ name }), { status: 409 })
        );
      expect(
        await createResendReceiptProvider("fake", request).send(email)
      ).toEqual({ status });
    }
  });
  it("network errors and invalid success payloads remain retryable", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("PII"))
      .mockResolvedValueOnce(new Response("{}"));
    const provider = createResendReceiptProvider("fake", request);
    expect(await provider.send(email)).toEqual({ status: "failed" });
    expect(await provider.send(email)).toEqual({ status: "failed" });
  });

  it("aborts an outstanding request at 15 seconds with the timeout signal", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const timeoutError = new DOMException("Request timed out", "TimeoutError");
    // Native AbortSignal.timeout uses Node timers outside Vitest's fake clock.
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation((delay) => {
        setTimeout(() => controller.abort(timeoutError), delay);
        return controller.signal;
      });
    const aborted = vi.fn();
    const request = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              aborted();
              reject(init.signal?.reason);
            },
            { once: true }
          );
        })
    );
    const settled = vi.fn();
    const pending = createResendReceiptProvider("fake", request).send(email);
    void pending.then(settled);

    expect(timeout).toHaveBeenCalledExactlyOnceWith(15_000);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1]?.signal).toBe(controller.signal);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(controller.signal.aborted).toBe(false);
    expect(aborted).not.toHaveBeenCalled();
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(controller.signal.aborted).toBe(true);
    expect(controller.signal.reason).toBe(timeoutError);
    expect(aborted).toHaveBeenCalledTimes(1);
    await expect(pending).resolves.toEqual({ status: "failed" });
    expect(vi.getTimerCount()).toBe(0);
  });
});
