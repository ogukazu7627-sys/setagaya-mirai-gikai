import { describe, expect, it } from "vitest";
import { buildBillChatSystemHardPrompt } from "./bill-chat-system-hard";

describe("buildBillChatSystemHardPrompt", () => {
  it("4つのパラメータがプロンプトに埋め込まれる", () => {
    const result = buildBillChatSystemHardPrompt(
      "テスト案件名",
      "テスト案件タイトル",
      "テスト案件要約",
      "テスト案件詳細"
    );

    expect(result).toContain("テスト案件名");
    expect(result).toContain("テスト案件タイトル");
    expect(result).toContain("テスト案件要約");
    expect(result).toContain("テスト案件詳細");
  });

  it("難易度「難しい」セクションが含まれる", () => {
    const result = buildBillChatSystemHardPrompt("a", "b", "c", "d");

    expect(result).toContain("回答の難易度：難しい");
    expect(result).toContain("専門用語を正確に使用");
  });

  it("みらい議会の説明が含まれる", () => {
    const result = buildBillChatSystemHardPrompt("a", "b", "c", "d");

    expect(result).toContain("みらい議会");
    expect(result).toContain("世田谷区議会");
  });

  it("knowledgeSource を渡すと <knowledge_source> セクションが含まれる", () => {
    const result = buildBillChatSystemHardPrompt(
      "a",
      "b",
      "c",
      "d",
      "補足知識"
    );

    expect(result).toContain("補足ナレッジ");
    expect(result).toContain("補足知識");
  });

  it("knowledgeSource を省略するとセクションごと出ない", () => {
    const result = buildBillChatSystemHardPrompt("a", "b", "c", "d");

    expect(result).not.toContain("<knowledge_source>");
  });

  it("案件本文優先・Web検索補助・選択テキスト優先のルールが含まれる", () => {
    const result = buildBillChatSystemHardPrompt("a", "b", "c", "d");

    expect(result).toContain("案件ページAIチャットの回答材料");
    expect(result).toContain("第一優先");
    expect(result).toContain("第二優先");
    expect(result).toContain("Web検索は補助");
    expect(result).toContain("案件本文に書かれている情報");
    expect(result).toContain("外部検索で補った情報");
    expect(result).toContain("ユーザーが本文の一部を「」で示して質問した場合");
  });

  it("詳細本文が不足していても限定回答するルールが含まれる", () => {
    const result = buildBillChatSystemHardPrompt("案件名", "", "", "");

    expect(result).toContain("詳細本文が空、または十分でない場合");
    expect(result).toContain("限定的に答えてください");
    expect(result).toContain("情報が不足していることを明示してください");
  });

  it("範囲外質問には回答しないルールが含まれる", () => {
    const result = buildBillChatSystemHardPrompt("a", "b", "c", "d");

    expect(result).toContain("話題範囲外の質問への対応");
    expect(result).toContain("晩御飯");
    expect(result).toContain("内容にはお答えできません");
    expect(result).toContain("Web検索ツールも使わないでください");
  });
});
