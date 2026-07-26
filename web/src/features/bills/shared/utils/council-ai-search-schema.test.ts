import { describe, expect, it } from "vitest";
import { councilAiSearchRequestSchema } from "./council-ai-search-schema";

const validInput = {
  installationId: "11111111-1111-4111-8111-111111111111",
  query: "子育て世代が知っておくべきこと",
  contentType: "all",
  themeId: "child-rearing",
  committeeName: "",
};

describe("councilAiSearchRequestSchema", () => {
  it("自然文と検索条件を受け付ける", () => {
    expect(councilAiSearchRequestSchema.parse(validInput)).toEqual(validInput);
  });

  it("200文字を超える検索文と未知のテーマを拒否する", () => {
    expect(
      councilAiSearchRequestSchema.safeParse({
        ...validInput,
        query: "あ".repeat(201),
      }).success
    ).toBe(false);
    expect(
      councilAiSearchRequestSchema.safeParse({
        ...validInput,
        themeId: "unknown",
      }).success
    ).toBe(false);
  });
});
