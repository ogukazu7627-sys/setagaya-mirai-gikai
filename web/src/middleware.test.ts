import { describe, expect, it } from "vitest";
import {
  buildUtmShortLinkRedirectUrl,
  isHtmlAcceptHeader,
  isValidDifficultyLevel,
  shouldSkipSupabaseSessionUpdate,
} from "./middleware";

describe("isValidDifficultyLevel", () => {
  it("should return true for 'normal'", () => {
    expect(isValidDifficultyLevel("normal")).toBe(true);
  });

  it("should return true for 'hard'", () => {
    expect(isValidDifficultyLevel("hard")).toBe(true);
  });

  it("should return false for invalid value", () => {
    expect(isValidDifficultyLevel("easy")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidDifficultyLevel("")).toBe(false);
  });

  it("should return false for null", () => {
    expect(isValidDifficultyLevel(null)).toBe(false);
  });
});

describe("isHtmlAcceptHeader", () => {
  it("should return true for text/html", () => {
    expect(isHtmlAcceptHeader("text/html")).toBe(true);
  });

  it("should return true for accept header with text/html among others", () => {
    expect(
      isHtmlAcceptHeader(
        "text/html,application/xhtml+xml,application/xml;q=0.9"
      )
    ).toBe(true);
  });

  it("should return false for application/json", () => {
    expect(isHtmlAcceptHeader("application/json")).toBe(false);
  });

  it("should return false for image/png", () => {
    expect(isHtmlAcceptHeader("image/png")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isHtmlAcceptHeader("")).toBe(false);
  });
});

describe("shouldSkipSupabaseSessionUpdate", () => {
  it("should skip Supabase session refresh on chat auth callback", () => {
    expect(shouldSkipSupabaseSessionUpdate("/auth/callback")).toBe(true);
  });

  it("should not skip Supabase session refresh on other pages", () => {
    expect(shouldSkipSupabaseSessionUpdate("/")).toBe(false);
    expect(shouldSkipSupabaseSessionUpdate("/admin/bills")).toBe(false);
  });
});

describe("buildUtmShortLinkRedirectUrl", () => {
  it.each([
    ["/ig", "instagram", "social"],
    ["/x", "x", "social"],
    ["/note", "note", "referral"],
    ["/line", "line", "social"],
    ["/qr", "qr", "offline"],
  ])("redirects %s to the home page with UTM params", (path, source, medium) => {
    const redirectUrl = buildUtmShortLinkRedirectUrl(
      new URL(`https://civictech-setagaya.org${path}`)
    );

    expect(redirectUrl?.toString()).toBe(
      `https://civictech-setagaya.org/?utm_source=${source}&utm_medium=${medium}&utm_campaign=launch`
    );
  });

  it("accepts a trailing slash on short links", () => {
    const redirectUrl = buildUtmShortLinkRedirectUrl(
      new URL("https://civictech-setagaya.org/ig/")
    );

    expect(redirectUrl?.toString()).toBe(
      "https://civictech-setagaya.org/?utm_source=instagram&utm_medium=social&utm_campaign=launch"
    );
  });

  it("does not redirect normal pages", () => {
    expect(
      buildUtmShortLinkRedirectUrl(
        new URL("https://civictech-setagaya.org/bills/abc")
      )
    ).toBeNull();
  });
});
