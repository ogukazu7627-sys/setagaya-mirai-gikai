import { describe, expect, it } from "vitest";
import {
  buildUtmShortLinkRedirectUrl,
  isHtmlAcceptHeader,
  isNextRouterPrefetch,
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

  it("should skip Supabase session refresh for the service worker", () => {
    expect(shouldSkipSupabaseSessionUpdate("/sw.js")).toBe(true);
  });

  it.each([
    ["next-router-prefetch", "1"],
    ["x-middleware-prefetch", "1"],
    ["purpose", "prefetch"],
    ["sec-purpose", "prefetch;prerender"],
  ])("should skip session refresh for %s requests", (name, value) => {
    expect(
      shouldSkipSupabaseSessionUpdate(
        "/admin/bills",
        new Headers([[name, value]])
      )
    ).toBe(true);
  });
});

describe("isNextRouterPrefetch", () => {
  it("does not classify a normal navigation as a prefetch", () => {
    expect(isNextRouterPrefetch(new Headers({ accept: "text/html" }))).toBe(
      false
    );
  });
});

describe("buildUtmShortLinkRedirectUrl", () => {
  it.each([
    ["/ig", "instagram", "social", undefined],
    ["/ig-movie", "instagram", "social", "movie"],
    ["/x", "x", "social", undefined],
    ["/x-image", "x", "social", "image"],
    ["/x-movie", "x", "social", "movie"],
    ["/note", "note", "referral", undefined],
    ["/line", "line", "social", undefined],
    ["/qr", "qr", "offline", undefined],
  ])("redirects %s to the home page with UTM params", (path, source, medium, content) => {
    const redirectUrl = buildUtmShortLinkRedirectUrl(
      new URL(`https://civictech-setagaya.org${path}`)
    );

    const expectedUrl = new URL("https://civictech-setagaya.org/");
    expectedUrl.searchParams.set("utm_source", source);
    expectedUrl.searchParams.set("utm_medium", medium);
    expectedUrl.searchParams.set("utm_campaign", "launch");
    if (content) {
      expectedUrl.searchParams.set("utm_content", content);
    }

    expect(redirectUrl?.toString()).toBe(expectedUrl.toString());
  });

  it("accepts a trailing slash on short links", () => {
    const redirectUrl = buildUtmShortLinkRedirectUrl(
      new URL("https://civictech-setagaya.org/x-movie/")
    );

    expect(redirectUrl?.toString()).toBe(
      "https://civictech-setagaya.org/?utm_source=x&utm_medium=social&utm_campaign=launch&utm_content=movie"
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
