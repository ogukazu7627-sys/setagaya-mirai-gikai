import { describe, expect, it } from "vitest";
import {
  buildChatAuthCallbackUrl,
  isGoogleAuthUser,
  sanitizeChatAuthNextPath,
} from "./auth";

describe("buildChatAuthCallbackUrl", () => {
  it("エンコード済みのクエリは認証の往復・再検証で変わらない", () => {
    const next = "/bills?q=a%26b%3Dc&nested=%252526";
    const callback = new URL(
      buildChatAuthCallbackUrl(
        "https://civictech-setagaya.org",
        sanitizeChatAuthNextPath(next)
      )
    );
    expect(sanitizeChatAuthNextPath(callback.searchParams.get("next"))).toBe(
      next
    );
    expect(sanitizeChatAuthNextPath(encodeURIComponent(next))).toBe(next);
  });
  it("戻り先とクエリをOAuth URLに含める", () => {
    const next = "/public-comment/minpaku?auth_return=1&receipt=0";
    const callback = new URL(
      buildChatAuthCallbackUrl("https://civictech-setagaya.org", next)
    );
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("next")).toBe(next);
  });
  it("外部への戻り先を受け入れない", () => {
    const callback = new URL(
      buildChatAuthCallbackUrl(
        "https://civictech-setagaya.org",
        "https://evil.example"
      )
    );
    expect(callback.searchParams.get("next")).toBe("/");
  });
});

describe("sanitizeChatAuthNextPath", () => {
  it.each([
    "/\\evil.example",
    "/%5cevil.example",
    "/a/..//evil.example",
    "/a/../auth/callback",
    "/%2e%2e/auth/callback",
  ])("URL正規化による外部遷移・認証ループを拒否: %s", (path) => {
    expect(sanitizeChatAuthNextPath(path)).toBe("/");
  });
  it("keeps safe relative paths", () => {
    expect(sanitizeChatAuthNextPath("/bills/123?difficulty=normal")).toBe(
      "/bills/123?difficulty=normal"
    );
  });

  it("decodes encoded paths from cookies", () => {
    expect(sanitizeChatAuthNextPath("%2Fbills%2F123")).toBe("/bills/123");
  });

  it("falls back for empty, external, protocol-relative, and callback paths", () => {
    expect(sanitizeChatAuthNextPath(null)).toBe("/");
    expect(sanitizeChatAuthNextPath("https://example.com")).toBe("/");
    expect(sanitizeChatAuthNextPath("//example.com")).toBe("/");
    expect(sanitizeChatAuthNextPath("/auth/callback")).toBe("/");
  });

  it("falls back for values with control characters", () => {
    expect(sanitizeChatAuthNextPath("/bills/123%0D%0ALocation:/admin")).toBe(
      "/"
    );
  });
});

describe("isGoogleAuthUser", () => {
  it("accepts users whose primary provider is google", () => {
    expect(isGoogleAuthUser({ app_metadata: { provider: "google" } })).toBe(
      true
    );
  });

  it("accepts users with a google identity", () => {
    expect(
      isGoogleAuthUser({
        identities: [{ provider: "email" }, { provider: "google" }],
      })
    ).toBe(true);
  });

  it("rejects email-only users", () => {
    expect(
      isGoogleAuthUser({
        app_metadata: { provider: "email" },
        identities: [{ provider: "email" }],
      })
    ).toBe(false);
  });
});
