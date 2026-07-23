import { describe, expect, it } from "vitest";
import { getActiveInterviewQuestion } from "./get-active-interview-question";
import type { ConversationMessage } from "./message-utils";

const assistantQuestion: ConversationMessage = {
  id: "assistant-1",
  role: "assistant",
  content: "現在回答すべき質問です",
};

function getQuestion(
  overrides: Partial<Parameters<typeof getActiveInterviewQuestion>[0]> = {}
) {
  return getActiveInterviewQuestion({
    messages: [assistantQuestion],
    stage: "chat",
    isLoading: false,
    isPreparingInitialQuestion: false,
    isStreamingMessageCommitted: false,
    ...overrides,
  });
}

describe("getActiveInterviewQuestion", () => {
  it("最後のユーザー回答より後にあるassistantメッセージを返す", () => {
    const messages: ConversationMessage[] = [
      assistantQuestion,
      {
        id: "user-1",
        role: "user",
        content: "回答です",
      },
      {
        id: "assistant-2",
        role: "assistant",
        content: "次の質問です",
      },
    ];

    expect(getQuestion({ messages })).toEqual({
      text: "次の質問です",
      isLoading: false,
    });
  });

  it("最後のメッセージがuserの場合は次の質問の生成中表示を返す", () => {
    expect(
      getQuestion({
        messages: [
          assistantQuestion,
          {
            id: "user-1",
            role: "user",
            content: "回答です",
          },
        ],
      })
    ).toEqual({
      text: "次の質問を考えています…",
      isLoading: true,
    });
  });

  it("未確定のストリーミング文を最新質問として返す", () => {
    expect(
      getQuestion({
        isLoading: true,
        streamingText: "生成中の次の質問です",
      })
    ).toEqual({
      text: "生成中の次の質問です",
      isLoading: true,
    });
  });

  it("summaryへ進むストリームは質問として表示しない", () => {
    expect(
      getQuestion({
        isLoading: true,
        streamingNextStage: "summary",
        streamingText: "レポート本文",
      })
    ).toEqual({
      text: "レポートを作成しています…",
      isLoading: true,
    });
  });

  it("summaryステージでは質問を返さない", () => {
    expect(getQuestion({ stage: "summary" })).toBeNull();
  });

  it("レポート付きassistantメッセージを質問扱いしない", () => {
    expect(
      getQuestion({
        messages: [
          {
            ...assistantQuestion,
            report: {
              summary: "レポート",
              stance: null,
              role: null,
              role_description: null,
              role_title: null,
              opinions: [],
            },
          },
        ],
      })
    ).toEqual({
      text: "次の質問を考えています…",
      isLoading: true,
    });
  });
});
