import { describe, expect, it } from "vitest";
import { councilKeywordSearchRequestSchema } from "./council-keyword-search-schema";

const validInput = {
  installationId: "11111111-1111-4111-8111-111111111111",
  query: "子育て",
  contentType: "all",
  themeId: "child-rearing",
  committeeName: "",
};

describe("councilKeywordSearchRequestSchema", () => {
  it("キーワードと検索条件を受け付ける", () => {
    expect(councilKeywordSearchRequestSchema.parse(validInput)).toEqual(
      validInput
    );
  });

  it("200文字を超える検索文と未知のテーマを拒否する", () => {
    expect(
      councilKeywordSearchRequestSchema.safeParse({
        ...validInput,
        query: "あ".repeat(201),
      }).success
    ).toBe(false);
    expect(
      councilKeywordSearchRequestSchema.safeParse({
        ...validInput,
        themeId: "unknown",
      }).success
    ).toBe(false);
  });
});
