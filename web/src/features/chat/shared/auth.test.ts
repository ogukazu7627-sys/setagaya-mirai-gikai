import { describe, expect, it } from "vitest";
import { isGoogleAuthUser, sanitizeChatAuthNextPath } from "./auth";

describe("sanitizeChatAuthNextPath", () => {
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
