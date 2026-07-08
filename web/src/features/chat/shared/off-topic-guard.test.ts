import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { assessChatTopicScope } from "./off-topic-guard";

function userMessage(text: string): UIMessage[] {
  return [
    {
      id: "msg-1",
      role: "user",
      parts: [{ type: "text", text }],
    },
  ];
}

describe("assessChatTopicScope", () => {
  it.each([
    "今日の晩御飯を考えて",
    "今日の夜ご飯のメニューを提案して",
    "冷蔵庫にある食材でレシピを教えて",
    "おすすめのレストランを教えて",
  ])("食事やレシピの単独依頼をブロックする: %s", (text) => {
    expect(assessChatTopicScope(userMessage(text))).toMatchObject({
      status: "blocked",
    });
  });

  it.each([
    "この案件のポイントは？",
    "自分にどう影響する？",
    "学校給食費の話をわかりやすく教えて",
    "子ども食堂への支援政策について教えて",
  ])("議会・区政・案件に関係する質問は許可する: %s", (text) => {
    expect(assessChatTopicScope(userMessage(text))).toMatchObject({
      status: "allowed",
    });
  });
});
