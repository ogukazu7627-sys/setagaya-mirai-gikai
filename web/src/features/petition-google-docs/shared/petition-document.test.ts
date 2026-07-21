import { describe, expect, it } from "vitest";
import {
  buildPetitionDocumentText,
  buildPetitionDocumentTitle,
} from "./petition-document";

describe("petition document builders", () => {
  it("builds a Google Docs title from the public bill title", () => {
    expect(
      buildPetitionDocumentTitle({
        billName: "正式案件名",
        billTitle: "区民向け案件タイトル",
      })
    ).toBe("区民向け案件タイトルに関する請願下書き");
  });

  it("formats interview report data as a petition draft", () => {
    const text = buildPetitionDocumentText({
      billName: "低所得世帯エアコン購入費等助成事業の実施について",
      billTitle: "エアコン購入費助成に関する報告",
      summary: "暑さで困る世帯に届くよう、助成制度を分かりやすくしてほしい",
      opinions: [
        {
          title: "情報提供を強化してほしい",
          content: "対象者が制度を知れるよう、案内を増やしてほしい",
        },
        {
          title: "申請負担を下げてほしい",
          content: "高齢者でも申請しやすい仕組みにしてほしい",
        },
      ],
    });

    expect(text).toContain("世田谷区議会議長 あて");
    expect(text).toContain("件名");
    expect(text).toContain("エアコン購入費助成に関する報告に関する請願");
    expect(text).toContain(
      "暑さで困る世帯に届くよう、助成制度を分かりやすくしてほしい"
    );
    expect(text).toContain("1. 対象者が制度を知れるよう、案内を増やしてほしい");
    expect(text).toContain("住所：");
    expect(text).toContain("氏名：");
    expect(text).toContain("電話番号：");
    expect(text).toContain("紹介議員");
  });

  it("limits petition items to three opinions", () => {
    const text = buildPetitionDocumentText({
      billName: "案件",
      opinions: [
        { title: "1", content: "一つ目" },
        { title: "2", content: "二つ目" },
        { title: "3", content: "三つ目" },
        { title: "4", content: "四つ目" },
      ],
    });

    expect(text).toContain("3. 三つ目");
    expect(text).not.toContain("4. 四つ目");
  });
});
