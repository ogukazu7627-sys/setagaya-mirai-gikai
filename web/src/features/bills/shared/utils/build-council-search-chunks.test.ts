import { describe, expect, it } from "vitest";
import type { CouncilSearchIndexSource } from "../types/council-search-index";
import {
  buildCouncilSearchChunks,
  markdownToSearchSections,
  splitCouncilSearchText,
} from "./build-council-search-chunks";

const source: CouncilSearchIndexSource = {
  billId: "11111111-1111-4111-8111-111111111111",
  dietSessionId: "22222222-2222-4222-8222-222222222222",
  name: "防災対策に関する報告",
  itemType: "report",
  majorCategory: "防災☔",
  statusLabel: "報告済み",
  statusNote: "第1回定例会（災害・防犯・オウム問題対策等特別委員会）",
  submittedDate: "2026-07-01",
  title: "避難所運営を見直します",
  summary: "災害時の避難所運営と情報提供を改善する報告です。",
  content: `# 具体的な内容

避難所の設備と情報提供を改善します。

# 議員、会派の意見

## 上川あや

情報保障について質問しました。

# 今後の予定

秋までに運用案をまとめます。`,
  tags: [
    {
      label: "避難計画",
      majorCategory: "防災☔",
      description: "災害時の避難に関する計画",
    },
  ],
  seoKeywords: ["避難所運営", "情報保障"],
  statements: [
    {
      statementIndex: 0,
      councilorId: "33333333-3333-4333-8333-333333333333",
      councilorName: "上川あや",
      partyOrGroup: "レインボー世田谷",
      contentText: "情報保障について質問しました。",
    },
  ],
};

describe("buildCouncilSearchChunks", () => {
  it("公開表示用の概要、本文、議員発言を別チャンクにする", () => {
    const chunks = buildCouncilSearchChunks(source);

    expect(chunks[0]).toMatchObject({
      chunkKey: "overview",
      chunkKind: "overview",
      committeeName: "災害・防犯・オウム問題対策等特別委員会",
    });
    expect(chunks[0]?.content).toContain("関連語: 風水害");
    expect(chunks[0]?.content).toContain(
      "検索キーワード: 避難所運営、情報保障"
    );
    expect(
      chunks.some(
        (chunk) =>
          chunk.chunkKind === "content" &&
          chunk.content.includes("避難所の設備")
      )
    ).toBe(true);
    expect(
      chunks.some(
        (chunk) =>
          chunk.chunkKind === "content" &&
          chunk.content.includes("情報保障について質問")
      )
    ).toBe(false);
    expect(
      chunks.find((chunk) => chunk.chunkKind === "councilor_statement")
    ).toMatchObject({
      councilorName: "上川あや",
      councilorId: "33333333-3333-4333-8333-333333333333",
    });
  });

  it("管理用knowledge_sourceを受け取る型も索引項目も持たない", () => {
    const overview = buildCouncilSearchChunks(source)[0];

    expect(overview?.content).not.toContain("knowledge_source");
  });
});

describe("markdownToSearchSections", () => {
  it("議員意見章を本文検索から除外する", () => {
    expect(markdownToSearchSections(source.content)).toEqual([
      {
        heading: "具体的な内容",
        text: "避難所の設備と情報提供を改善します。",
      },
      {
        heading: "今後の予定",
        text: "秋までに運用案をまとめます。",
      },
    ]);
  });
});

describe("splitCouncilSearchText", () => {
  it("指定文字数でオーバーラップしながら分割する", () => {
    const chunks = splitCouncilSearchText("abcdefghij", 6, 2);

    expect(chunks).toEqual(["abcdef", "efghij"]);
  });
});
