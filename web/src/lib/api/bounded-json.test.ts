import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  assertSameOrigin,
  MAX_PUBLIC_API_BODY_BYTES,
  PublicApiRequestError,
  parseBoundedJson,
} from "./bounded-json";

describe("parseBoundedJson", () => {
  it("parses validated JSON", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: JSON.stringify({ value: "ok" }),
    });
    await expect(
      parseBoundedJson(request, z.object({ value: z.literal("ok") }))
    ).resolves.toEqual({ value: "ok" });
  });

  it("rejects invalid and oversized bodies", async () => {
    const invalid = new Request("https://example.test/api", {
      method: "POST",
      body: "{",
    });
    await expect(parseBoundedJson(invalid, z.unknown())).rejects.toMatchObject({
      status: 400,
    });

    const oversized = new Request("https://example.test/api", {
      method: "POST",
      body: "x".repeat(MAX_PUBLIC_API_BODY_BYTES + 1),
    });
    await expect(
      parseBoundedJson(oversized, z.unknown())
    ).rejects.toMatchObject({ status: 413 });
  });
});

describe("assertSameOrigin", () => {
  it("accepts a matching Origin and rejects absent or cross-origin requests", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://example.test/api", {
          headers: { origin: "https://example.test" },
        })
      )
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(new Request("https://example.test/api"))
    ).toThrow(PublicApiRequestError);
    expect(() =>
      assertSameOrigin(
        new Request("https://example.test/api", {
          headers: { origin: "https://attacker.test" },
        })
      )
    ).toThrow(PublicApiRequestError);
  });
});
