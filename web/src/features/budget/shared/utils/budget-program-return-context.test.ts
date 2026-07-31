import { describe, expect, it } from "vitest";
import {
  parseBudgetProgramReturnContext,
  resolveBudgetProgramReturnDestination,
} from "./budget-program-return-context";

describe("parseBudgetProgramReturnContext", () => {
  it("既知カテゴリーと安全な課題slugだけを戻り文脈として受け入れる", () => {
    expect(
      parseBudgetProgramReturnContext({
        fromCategory: "education",
        fromTopic: "school-facility-aging",
      })
    ).toEqual({
      categorySlug: "education",
      topicSlug: "school-facility-aging",
    });
  });

  it("不正な課題slugは捨て、既知カテゴリーへの復帰だけを残す", () => {
    expect(
      parseBudgetProgramReturnContext({
        fromCategory: "education",
        fromTopic: "https://example.com",
      })
    ).toEqual({ categorySlug: "education" });
  });

  it("未知カテゴリーや複数値を戻り先に使わない", () => {
    expect(
      parseBudgetProgramReturnContext({
        fromCategory: "unknown",
        fromTopic: "topic",
      })
    ).toBeNull();
    expect(
      parseBudgetProgramReturnContext({
        fromCategory: ["education", "welfare"],
      })
    ).toBeNull();
  });
});

describe("resolveBudgetProgramReturnDestination", () => {
  const topic = {
    slug: "school-facility-aging",
    name: "学校施設の老朽化への対応",
    categories: [
      {
        slug: "education",
        name: "教育",
        isPrimary: true,
      },
    ],
  };

  it("公開課題と所属カテゴリーの組み合わせが一致する場合だけ課題へ戻す", () => {
    expect(
      resolveBudgetProgramReturnDestination(
        {
          categorySlug: "education",
          topicSlug: "school-facility-aging",
        },
        [topic]
      )
    ).toEqual({
      href: "/budget?category=education&topic=school-facility-aging",
      label: "「学校施設の老朽化への対応」へ戻る",
    });
  });

  it("課題とカテゴリーが不一致なら既知カテゴリーへ安全に戻す", () => {
    expect(
      resolveBudgetProgramReturnDestination(
        {
          categorySlug: "daily-life",
          topicSlug: "school-facility-aging",
        },
        [topic]
      )
    ).toEqual({
      href: "/budget?category=daily-life",
      label: "「暮らし」へ戻る",
    });
  });
});
