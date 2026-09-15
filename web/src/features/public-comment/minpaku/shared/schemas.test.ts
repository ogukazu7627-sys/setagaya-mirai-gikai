import { describe, expect, it } from "vitest";
import {
  publicCommentChatResponseSchema,
  publicCommentDraftSchema,
} from "./schemas";

describe("パブリックコメントAI出力スキーマ", () => {
  it("インタビュー応答に次の段階と質問情報を要求する", () => {
    expect(
      publicCommentChatResponseSchema.safeParse({
        text: "詳しく教えてください。",
        question_id: "experience",
        topic_title: "経験と影響",
        quick_replies: [],
        next_stage: "interview",
      }).success
    ).toBe(true);
  });

  it("下書きは少なくとも1つの対象条例と本文を要求する", () => {
    expect(
      publicCommentDraftSchema.safeParse({
        target_ordinances: ["条例"],
        body: "意見本文",
        fact_check_notes: [],
      }).success
    ).toBe(true);
    expect(
      publicCommentDraftSchema.safeParse({
        target_ordinances: [],
        body: "意見本文",
        fact_check_notes: [],
      }).success
    ).toBe(false);
  });
});
