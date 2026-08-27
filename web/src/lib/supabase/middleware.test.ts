import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFetchWithTimeout,
  hasSupabaseAuthCookie,
  isSupabaseAuthCookieName,
  updateSupabaseSession,
} from "./middleware";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: supabaseMocks.createServerClient,
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  supabaseMocks.createServerClient.mockReset();
  supabaseMocks.getUser.mockReset();
  supabaseMocks.createServerClient.mockReturnValue({
    auth: { getUser: supabaseMocks.getUser },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("isSupabaseAuthCookieName", () => {
  it.each([
    "sb-projectref-auth-token",
    "sb-projectref-auth-token.0",
    "sb-access-token",
    "sb-refresh-token",
  ])("recognizes %s", (name) => {
    expect(isSupabaseAuthCookieName(name)).toBe(true);
  });

  it.each([
    "theme",
    "sb-projectref-auth-token-code-verifier",
    "sb-random-cookie",
  ])("ignores %s", (name) => {
    expect(isSupabaseAuthCookieName(name)).toBe(false);
  });
});

describe("hasSupabaseAuthCookie", () => {
  it("returns false for anonymous requests", () => {
    expect(hasSupabaseAuthCookie([{ name: "difficulty" }])).toBe(false);
  });

  it("returns true when a chunked auth cookie exists", () => {
    expect(
      hasSupabaseAuthCookie([
        { name: "difficulty" },
        { name: "sb-projectref-auth-token.1" },
      ])
    ).toBe(true);
  });
});

describe("createFetchWithTimeout", () => {
  it("aborts a fetch that does not return before the deadline", async () => {
    const hangingFetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true }
          );
        })
    );
    const timedFetch = createFetchWithTimeout(10, hangingFetch as typeof fetch);

    await expect(timedFetch("https://example.com/auth")).rejects.toMatchObject({
      name: "TimeoutError",
    });
    expect(hangingFetch).toHaveBeenCalledOnce();
  });

  it("preserves a successful response before the deadline", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchImplementation = vi.fn().mockResolvedValue(response);
    const timedFetch = createFetchWithTimeout(
      100,
      fetchImplementation as typeof fetch
    );

    await expect(timedFetch("https://example.com/auth")).resolves.toBe(
      response
    );
  });
});

describe("updateSupabaseSession", () => {
  it("does not create an auth client for an anonymous request", async () => {
    const response = await updateSupabaseSession(
      new NextRequest("https://civictech-setagaya.org/bills")
    );

    expect(response.status).toBe(200);
    expect(supabaseMocks.createServerClient).not.toHaveBeenCalled();
  });

  it("returns a response when the auth service fails", async () => {
    supabaseMocks.getUser.mockRejectedValue(new Error("network unavailable"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const response = await updateSupabaseSession(
      new NextRequest("https://civictech-setagaya.org/admin/bills", {
        headers: {
          cookie: "sb-projectref-auth-token=session",
          "x-vercel-id": "hnd1::test",
        },
      })
    );

    expect(response.status).toBe(200);
    expect(supabaseMocks.getUser).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Supabase session refresh failed open")
    );
  });
});
