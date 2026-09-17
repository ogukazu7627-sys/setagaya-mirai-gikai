import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  next: "/public-comment/minpaku" as string | undefined,
  exchange: vi.fn(),
  setCookie: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (mocks.next === undefined ? undefined : { value: mocks.next }),
    set: mocks.setCookie,
    getAll: () => [],
  }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { exchangeCodeForSession: mocks.exchange },
  }),
}));
vi.mock("@/lib/env", () => ({
  env: {
    webUrl: "https://civictech-setagaya.org",
    supabaseUrl: "http://localhost:54321",
    supabasePublishableKey: "test",
  },
}));

import { GET } from "./route";

describe("Google OAuth callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.next = "/public-comment/minpaku";
  });
  it.each([
    undefined,
    "/",
    "/bills/stale",
  ])("Cookieがない・古くても今回の認証URLの戻り先を優先: %s", async (cookie) => {
    mocks.next = cookie;
    mocks.exchange.mockResolvedValue({ error: null });
    const next = "/public-comment/minpaku?auth_return=1&receipt=0";
    const response = await GET(
      new Request(
        `https://civictech-setagaya.org/auth/callback?code=valid&next=${encodeURIComponent(next)}`
      )
    );
    expect(response.headers.get("location")).toBe(
      `https://civictech-setagaya.org${next}`
    );
  });
  it.each([
    "code=missing-pkce",
    "error=access_denied",
  ])("Cookieを引き継げず認証失敗してもパブコメで再試行: %s", async (query) => {
    mocks.next = undefined;
    mocks.exchange.mockResolvedValue({
      error: new Error("PKCE verifier missing"),
    });
    const next = "/public-comment/minpaku?auth_return=1&receipt=0";
    const response = await GET(
      new Request(
        `https://civictech-setagaya.org/auth/callback?${query}&next=${encodeURIComponent(next)}`
      )
    );
    expect(response.headers.get("location")).toBe(
      `https://civictech-setagaya.org${next}&auth_error=google_login_failed`
    );
  });
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/auth/callback",
  ])("URLの戻り先から外部へリダイレクトしない: %s", async (next) => {
    mocks.next = undefined;
    mocks.exchange.mockResolvedValue({ error: null });
    const response = await GET(
      new Request(
        `https://civictech-setagaya.org/auth/callback?code=valid&next=${encodeURIComponent(next)}`
      )
    );
    expect(response.headers.get("location")).toBe(
      "https://civictech-setagaya.org/"
    );
  });
  it("成功時は元のパブコメページへ戻る", async () => {
    mocks.exchange.mockResolvedValue({ error: null });
    const response = await GET(
      new Request("https://civictech-setagaya.org/auth/callback?code=valid")
    );
    expect(response.headers.get("location")).toBe(
      "https://civictech-setagaya.org/public-comment/minpaku"
    );
  });
  it("いじめパブコメの認証失敗時は同じページへ戻る", async () => {
    mocks.next = "/public-comment/ijime?auth_return=1";
    mocks.exchange.mockResolvedValue({ error: new Error("failed") });
    const response = await GET(
      new Request("https://civictech-setagaya.org/auth/callback?code=invalid")
    );
    expect(response.headers.get("location")).toBe(
      "https://civictech-setagaya.org/public-comment/ijime?auth_return=1&auth_error=google_login_failed"
    );
  });
  it("障害理解パブコメの認証失敗時は同じページへ戻る", async () => {
    mocks.next = "/public-comment/disability?auth_return=1";
    mocks.exchange.mockResolvedValue({ error: new Error("failed") });
    const response = await GET(
      new Request("https://civictech-setagaya.org/auth/callback?code=invalid")
    );
    expect(response.headers.get("location")).toBe(
      "https://civictech-setagaya.org/public-comment/disability?auth_return=1&auth_error=google_login_failed"
    );
  });
  it("がけ・擁壁パブコメの認証失敗時は同じページへ戻る", async () => {
    mocks.next = "/public-comment/retaining-wall?auth_return=1";
    mocks.exchange.mockResolvedValue({ error: new Error("failed") });
    const response = await GET(
      new Request("https://civictech-setagaya.org/auth/callback?code=invalid")
    );
    expect(response.headers.get("location")).toBe(
      "https://civictech-setagaya.org/public-comment/retaining-wall?auth_return=1&auth_error=google_login_failed"
    );
  });
  it("自殺対策計画パブコメの認証失敗時は同じページへ戻る", async () => {
    mocks.next = "/public-comment/suicide-prevention?auth_return=1";
    mocks.exchange.mockResolvedValue({ error: new Error("failed") });
    const response = await GET(
      new Request("https://civictech-setagaya.org/auth/callback?code=invalid")
    );
    expect(response.headers.get("location")).toBe(
      "https://civictech-setagaya.org/public-comment/suicide-prevention?auth_return=1&auth_error=google_login_failed"
    );
  });
  it.each([
    "?error=access_denied",
    "?code=invalid",
  ])("キャンセル・交換失敗はパブコメへエラー付きで戻る: %s", async (query) => {
    mocks.exchange.mockResolvedValue({ error: new Error("failed") });
    const response = await GET(
      new Request(`https://civictech-setagaya.org/auth/callback${query}`)
    );
    expect(response.headers.get("location")).toBe(
      "https://civictech-setagaya.org/public-comment/minpaku?auth_error=google_login_failed"
    );
  });
  it.each([
    "/bills/example",
    "//evil.example",
    "/auth/callback",
    "/",
  ])("他ページ・不正な戻り先は既存の失敗導線を維持: %s", async (next) => {
    mocks.next = next;
    const response = await GET(
      new Request(
        "https://civictech-setagaya.org/auth/callback?error=access_denied"
      )
    );
    expect(response.headers.get("location")).toBe(
      "https://civictech-setagaya.org/?auth_error=google_login_failed"
    );
  });
});
