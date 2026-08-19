import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout, RequestTimeoutError } from "./fetch-with-timeout";

/** 実際の fetch と同じく、中断済み・中断時どちらでも AbortError を返す。 */
function abortErrorFrom(
  signal: AbortSignal | null | undefined
): Promise<never> {
  return new Promise((_resolve, reject) => {
    const reject_ = () => reject(new DOMException("Aborted", "AbortError"));
    if (!signal || signal.aborted) {
      reject_();
      return;
    }
    signal.addEventListener("abort", reject_, { once: true });
  });
}

describe("fetchWithTimeout", () => {
  it("returns the response when it arrives in time", async () => {
    const response = new Response("ok");
    const fetchImpl = vi.fn().mockResolvedValue(response);

    await expect(
      fetchWithTimeout("/api/example", { timeoutMs: 50 }, fetchImpl)
    ).resolves.toBe(response);
  });

  it("throws RequestTimeoutError when the response never arrives", async () => {
    const fetchImpl = vi.fn((_input: string, init?: RequestInit) =>
      abortErrorFrom(init?.signal)
    ) as unknown as typeof fetch;

    await expect(
      fetchWithTimeout("/api/example", { timeoutMs: 10 }, fetchImpl)
    ).rejects.toBeInstanceOf(RequestTimeoutError);
  });

  it("keeps a caller abort distinguishable from a timeout", async () => {
    const caller = new AbortController();
    const fetchImpl = vi.fn((_input: string, init?: RequestInit) => {
      caller.abort();
      return abortErrorFrom(init?.signal);
    }) as unknown as typeof fetch;

    const error = await fetchWithTimeout(
      "/api/example",
      { timeoutMs: 1000, signal: caller.signal },
      fetchImpl
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("does not call fetch with an already-aborted caller signal left dangling", async () => {
    const caller = new AbortController();
    caller.abort();
    const fetchImpl = vi.fn((_input: string, init?: RequestInit) => {
      expect(init?.signal?.aborted).toBe(true);
      return abortErrorFrom(init?.signal);
    }) as unknown as typeof fetch;

    const error = await fetchWithTimeout(
      "/api/example",
      { timeoutMs: 1000, signal: caller.signal },
      fetchImpl
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DOMException);
  });

  it("clears the timer so a slow caller abort cannot be reported as a timeout", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn().mockResolvedValue(new Response("ok"));
      await fetchWithTimeout("/api/example", { timeoutMs: 10 }, fetchImpl);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
