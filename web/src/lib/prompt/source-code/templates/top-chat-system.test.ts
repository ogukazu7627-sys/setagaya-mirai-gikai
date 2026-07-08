import { describe, expect, it } from "vitest";
import { buildTopChatSystemPrompt } from "./top-chat-system";

describe("buildTopChatSystemPrompt", () => {
  it("範囲外質問には回答しないルールが含まれる", () => {
    const result = buildTopChatSystemPrompt('[{"id":"1","name":"テスト案件"}]');

    expect(result).toContain("話題範囲外の質問への対応");
    expect(result).toContain("晩御飯");
    expect(result).toContain("内容にはお答えできません");
    expect(result).toContain("Web検索ツールも使わないでください");
  });
});
