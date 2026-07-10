import { describe, expect, it } from "vitest";
import { normalizeSetagayaHeadings } from "./bill-content";

describe("normalizeSetagayaHeadings", () => {
  it("renames the old divided-opinion heading", () => {
    expect(
      normalizeSetagayaHeadings(`# この案件のポイント

# 意見が分かれるところ

本文です。`)
    ).toContain("# 考えておきたいこと");
  });

  it("keeps the heading level when renaming", () => {
    expect(normalizeSetagayaHeadings(`## 意見が分かれるところ`)).toBe(
      "## 考えておきたいこと"
    );
  });
});
