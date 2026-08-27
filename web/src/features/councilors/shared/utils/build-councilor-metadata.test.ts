import { describe, expect, it } from "vitest";
import { buildCouncilorMetadata } from "./build-councilor-metadata";

describe("buildCouncilorMetadata", () => {
  it("puts the councilor name in the title so pages are distinguishable", () => {
    expect(
      buildCouncilorMetadata({ displayName: "河野俊弘", questionCount: 14 })
    ).toEqual({
      title: "河野俊弘 | みらい議会＠世田谷区",
      description:
        "世田谷区議会議員 河野俊弘 の、このサイトに掲載中の質問14件を確認できます。",
    });
  });

  it("omits the question count when nothing is published yet", () => {
    expect(
      buildCouncilorMetadata({ displayName: "上川あや", questionCount: 0 })
        .description
    ).toBe("世田谷区議会議員 上川あや のプロフィールを確認できます。");
  });

  it("falls back to a generic name when the display name is blank", () => {
    expect(
      buildCouncilorMetadata({ displayName: "   ", questionCount: 1 }).title
    ).toBe("議員 | みらい議会＠世田谷区");
  });

  it("produces different titles for different councilors", () => {
    const first = buildCouncilorMetadata({
      displayName: "福田たえ美",
      questionCount: 9,
    });
    const second = buildCouncilorMetadata({
      displayName: "上川あや",
      questionCount: 11,
    });
    expect(first.title).not.toBe(second.title);
  });
});
