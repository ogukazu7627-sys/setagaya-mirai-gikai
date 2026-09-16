import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  next: "/public-comment/minpaku",
  exchange: vi.fn(),
  setCookie: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: mocks.next }),
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
  it("成功時は元のパブコメページへ戻る", async () => {
    mocks.exchange.mockResolvedValue({ error: null });
    const response = await GET(
      new Request("https://civictech-setagaya.org/auth/callback?code=valid")
    );
    expect(response.headers.get("location")).toBe(
      "https://civictech-setagaya.org/public-comment/minpaku"
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
