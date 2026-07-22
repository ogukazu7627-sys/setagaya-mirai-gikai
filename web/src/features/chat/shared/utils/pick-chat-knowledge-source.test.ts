import { describe, expect, it } from "vitest";
import { pickChatKnowledgeSource } from "./pick-chat-knowledge-source";

describe("pickChatKnowledgeSource", () => {
  it("bill が null/undefined なら空文字", () => {
    expect(pickChatKnowledgeSource(null)).toBe("");
    expect(pickChatKnowledgeSource(undefined)).toBe("");
  });

  it("ナレッジ本文があれば旧DB値がfalseでも返す", () => {
    const bill = {
      knowledge_source: "本文",
      use_knowledge_source_in_chat: false,
    };
    expect(pickChatKnowledgeSource(bill)).toBe("本文");
  });

  it("ナレッジ本文があればその文字列を返す", () => {
    expect(
      pickChatKnowledgeSource({
        knowledge_source: "本文",
      })
    ).toBe("本文");
  });

  it("ナレッジが null なら空文字", () => {
    expect(
      pickChatKnowledgeSource({
        knowledge_source: null,
      })
    ).toBe("");
  });
});
