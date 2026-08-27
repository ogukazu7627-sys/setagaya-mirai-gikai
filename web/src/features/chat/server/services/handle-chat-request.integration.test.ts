import {
  adminClient,
  cleanupTestBill,
  cleanupTestUser,
  createTestBill,
  createTestBillContent,
  createTestUser,
  type TestUser,
} from "@test-utils/utils";
import type { LanguageModelUsage, UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OFF_TOPIC_RESPONSE_TEXT } from "@/features/chat/shared/off-topic-guard";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { createStreamMock } from "@/test-utils/mock-language-model";
import { createMockPromptProvider } from "@/test-utils/mock-prompt-provider";
import { recordChatUsage } from "./cost-tracker";
import {
  buildTools,
  type ChatMessageMetadata,
  handleChatRequest,
} from "./handle-chat-request";

/**
 * Response のボディストリームを全て読み込み、テキストとして返す。
 * onFinish コールバックを発火させるために必要。
 */
async function consumeResponseStream(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

/**
 * テスト用メッセージを作成するヘルパー
 */
function createTestMessages(
  overrides: Partial<ChatMessageMetadata> = {}
): UIMessage<ChatMessageMetadata>[] {
  return [
    {
      id: "test-msg-1",
      role: "user",
      parts: [{ type: "text", text: "テスト質問です" }],
      metadata: {
        difficultyLevel: "normal",
        sessionId: "",
        ...overrides,
      },
    },
  ];
}

describe("handleChatRequest 統合テスト", () => {
  let testUser: TestUser;

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await adminClient
      .from("chat_message_events")
      .delete()
      .eq("user_id", testUser.id);
    await adminClient
      .from("chat_usage_events")
      .delete()
      .eq("user_id", testUser.id);
    await cleanupTestUser(testUser.id);
  });

  describe("ストリーミングレスポンス", () => {
    it("mock model + mock promptProvider でストリーミングレスポンスが返る", async () => {
      const mockModel = createStreamMock([
        "こんにちは",
        "！",
        "テスト応答です。",
      ]);
      const mockPromptProvider = createMockPromptProvider();
      const messages = createTestMessages();

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: mockPromptProvider },
      });

      expect(response.status).toBe(200);
      const content = await consumeResponseStream(response);
      // AI SDK のストリーム形式でテキストが含まれている
      expect(content.length).toBeGreaterThan(0);
    });

    it("最新のユーザー質問を chat_message_events に保存する", async () => {
      const mockModel = createStreamMock(["テスト応答"]);
      const mockPromptProvider = createMockPromptProvider();
      const messages = createTestMessages({
        pageContext: { type: "bill" },
        sessionId: "question-log-session",
      });
      messages[0].parts = [
        { type: "text", text: "この案件のポイントを教えて" },
      ];

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: mockPromptProvider },
      });

      await consumeResponseStream(response);

      const { data, error } = await adminClient
        .from("chat_message_events")
        .select("message, page_type, session_id, scope_status, block_reason")
        .eq("user_id", testUser.id)
        .single();

      expect(error).toBeNull();
      expect(data?.message).toBe("この案件のポイントを教えて");
      expect(data?.page_type).toBe("bill");
      expect(data?.session_id).toBe("question-log-session");
      expect(data?.scope_status).toBe("allowed");
      expect(data?.block_reason).toBeNull();
    });

    it("billContext を持つメッセージで bill-chat-system プロンプトが選択される", async () => {
      const promptProvider = createMockPromptProvider(
        "請求書チャット用システムプロンプト"
      );
      const receivedPromptNames: string[] = [];

      // getPrompt が呼ばれた際にプロンプト名を記録するカスタムプロバイダー
      const trackingPromptProvider = {
        getPrompt: async (name: string, variables?: Record<string, string>) => {
          receivedPromptNames.push(name);
          return promptProvider.getPrompt(name, variables);
        },
      };

      const mockModel = createStreamMock(["テスト応答"]);
      const messages = createTestMessages({
        pageContext: { type: "bill" },
        difficultyLevel: "normal",
      });

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: trackingPromptProvider },
      });

      await consumeResponseStream(response);

      expect(receivedPromptNames).toHaveLength(1);
      expect(receivedPromptNames[0]).toBe("bill-chat-system-normal");
    });

    it("公開済みbillでトグルONなら knowledgeSource がサーバー側で取得されてプロンプト変数に渡る", async () => {
      const bill = await createTestBill({ publish_status: "published" });
      await createTestBillContent(bill.id);
      await adminClient
        .from("bills")
        .update({
          knowledge_source: "補足ナレッジ本文",
          use_knowledge_source_in_chat: true,
        })
        .eq("id", bill.id);

      try {
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            _name: string,
            variables?: Record<string, string>
          ) => {
            receivedVariables.push(variables);
            return { content: "テスト", metadata: "{}" };
          },
        };
        const mockModel = createStreamMock(["応答"]);
        const messages = createTestMessages({
          billContext: {
            id: bill.id,
            name: bill.name,
          } as unknown as ChatMessageMetadata["billContext"],
        });

        const response = await handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: trackingPromptProvider },
        });
        await consumeResponseStream(response);

        expect(receivedVariables[0]?.knowledgeSource).toBe("補足ナレッジ本文");
      } finally {
        await cleanupTestBill(bill.id);
      }
    });

    it("公開済み予算質問の knowledge_source を質問・答弁のAI回答に使う", async () => {
      const bill = await createTestBill({
        name: "学校改修についての質問",
        publication_category: "budget",
        publish_status: "published",
      });
      await createTestBillContent(bill.id, {
        content: "公開画面に表示する質問・答弁",
        difficulty_level: "normal",
        summary: "予算質問の要約",
        title: "学校改修について",
      });
      await adminClient
        .from("bills")
        .update({
          interview_enabled: true,
          knowledge_source: "予算質問に紐づく質問・答弁の原文ナレッジ",
          use_knowledge_source_in_chat: true,
        })
        .eq("id", bill.id);

      try {
        const receivedPromptNames: string[] = [];
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            name: string,
            variables?: Record<string, string>
          ) => {
            receivedPromptNames.push(name);
            receivedVariables.push(variables);
            return { content: "予算質問用テストプロンプト", metadata: "{}" };
          },
        };
        const messages = createTestMessages({
          billContext: {
            id: bill.id,
            interview_enabled: false,
            item_type: "question",
            name: bill.name,
          },
          pageContext: { type: "budget-question" },
        });

        const response = await handleChatRequest({
          deps: {
            model: createStreamMock(["ナレッジに基づく応答"]),
            promptProvider: trackingPromptProvider,
          },
          messages,
          userId: testUser.id,
        });
        await consumeResponseStream(response);

        expect(receivedPromptNames).toEqual(["bill-chat-system-normal"]);
        expect(receivedVariables[0]).toMatchObject({
          billContent: "公開画面に表示する質問・答弁",
          billName: "学校改修についての質問",
          knowledgeSource: "予算質問に紐づく質問・答弁の原文ナレッジ",
        });

        const { data: messageEvent, error: messageEventError } =
          await adminClient
            .from("chat_message_events")
            .select("bill_id, page_type")
            .eq("user_id", testUser.id)
            .eq("bill_id", bill.id)
            .single();
        expect(messageEventError).toBeNull();
        expect(messageEvent).toMatchObject({
          bill_id: bill.id,
          page_type: "bill",
        });
      } finally {
        await cleanupTestBill(bill.id);
      }
    });

    it("公開済み一般質問の knowledge_source を質問・答弁のAI回答に使う", async () => {
      const bill = await createTestBill({
        name: "若者支援についての一般質問",
        publication_category: "general_question",
        publish_status: "published",
      });
      await createTestBillContent(bill.id, {
        content: "公開画面に表示する一般質問と答弁",
        difficulty_level: "normal",
        summary: "一般質問の要約",
        title: "若者支援について",
      });
      await adminClient
        .from("bills")
        .update({
          interview_enabled: true,
          knowledge_source: "一般質問に紐づく質問・答弁の原文ナレッジ",
          use_knowledge_source_in_chat: true,
        })
        .eq("id", bill.id);

      try {
        const receivedPromptNames: string[] = [];
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            name: string,
            variables?: Record<string, string>
          ) => {
            receivedPromptNames.push(name);
            receivedVariables.push(variables);
            return { content: "一般質問用テストプロンプト", metadata: "{}" };
          },
        };
        const messages = createTestMessages({
          billContext: {
            id: bill.id,
            interview_enabled: false,
            item_type: "question",
            name: bill.name,
          },
          pageContext: { type: "general-question" },
        });

        const response = await handleChatRequest({
          deps: {
            model: createStreamMock(["ナレッジに基づく応答"]),
            promptProvider: trackingPromptProvider,
          },
          messages,
          userId: testUser.id,
        });
        await consumeResponseStream(response);

        expect(receivedPromptNames).toEqual(["bill-chat-system-normal"]);
        expect(receivedVariables[0]).toMatchObject({
          billContent: "公開画面に表示する一般質問と答弁",
          billName: "若者支援についての一般質問",
          knowledgeSource: "一般質問に紐づく質問・答弁の原文ナレッジ",
        });

        const { data: messageEvent, error: messageEventError } =
          await adminClient
            .from("chat_message_events")
            .select("bill_id, page_type")
            .eq("user_id", testUser.id)
            .eq("bill_id", bill.id)
            .single();
        expect(messageEventError).toBeNull();
        expect(messageEvent).toMatchObject({
          bill_id: bill.id,
          page_type: "bill",
        });
      } finally {
        await cleanupTestBill(bill.id);
      }
    });

    it("公開済みbillでナレッジ本文があれば旧DB値がfalseでも knowledgeSource に渡る", async () => {
      const bill = await createTestBill({ publish_status: "published" });
      await createTestBillContent(bill.id);
      await adminClient
        .from("bills")
        .update({
          knowledge_source: "本文があれば常に使う",
          use_knowledge_source_in_chat: false,
        })
        .eq("id", bill.id);

      try {
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            _name: string,
            variables?: Record<string, string>
          ) => {
            receivedVariables.push(variables);
            return { content: "テスト", metadata: "{}" };
          },
        };
        const mockModel = createStreamMock(["応答"]);
        const messages = createTestMessages({
          billContext: {
            id: bill.id,
            name: bill.name,
          } as unknown as ChatMessageMetadata["billContext"],
        });

        const response = await handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: trackingPromptProvider },
        });
        await consumeResponseStream(response);

        expect(receivedVariables[0]?.knowledgeSource).toBe(
          "本文があれば常に使う"
        );
      } finally {
        await cleanupTestBill(bill.id);
      }
    });

    it("クライアント側で bill 関連フィールドを偽装してもサーバー側のDB値が優先される", async () => {
      const bill = await createTestBill({ publish_status: "published" });
      await adminClient
        .from("bills")
        .update({
          knowledge_source: null,
          use_knowledge_source_in_chat: false,
        })
        .eq("id", bill.id);
      await adminClient.from("bill_contents").insert({
        bill_id: bill.id,
        difficulty_level: "normal",
        title: "サーバー側タイトル",
        summary: "サーバー側要約",
        content: "サーバー側本文",
      });

      try {
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            _name: string,
            variables?: Record<string, string>
          ) => {
            receivedVariables.push(variables);
            return { content: "テスト", metadata: "{}" };
          },
        };
        const mockModel = createStreamMock(["応答"]);
        const messages = createTestMessages({
          billContext: {
            id: bill.id,
            name: "クライアント側で書き換えた名称",
            bill_content: {
              title: "クライアント側で書き換えたタイトル",
              summary: "クライアント側で書き換えた要約",
              content: "クライアント側で書き換えた本文",
            },
            knowledge_source: "クライアントから注入した秘密",
            use_knowledge_source_in_chat: true,
          } as unknown as ChatMessageMetadata["billContext"],
        });

        const response = await handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: trackingPromptProvider },
        });
        await consumeResponseStream(response);

        expect(receivedVariables[0]?.knowledgeSource).toBe("");
        expect(receivedVariables[0]?.billName).toBe(bill.name);
        expect(receivedVariables[0]?.billTitle).toBe("サーバー側タイトル");
        expect(receivedVariables[0]?.billSummary).toBe("サーバー側要約");
        expect(receivedVariables[0]?.billContent).toBe("サーバー側本文");
      } finally {
        await cleanupTestBill(bill.id);
      }
    });

    it("difficultyLevel に応じてサーバー側の bill_contents が切り替わる", async () => {
      const bill = await createTestBill({ publish_status: "published" });
      await createTestBillContent(bill.id, {
        difficulty_level: "normal",
        title: "ふつうタイトル",
        summary: "ふつう要約",
        content: "ふつう本文",
      });
      await createTestBillContent(bill.id, {
        difficulty_level: "hard",
        title: "詳しいタイトル",
        summary: "詳しい要約",
        content: "詳しい本文",
      });

      try {
        const receivedPromptNames: string[] = [];
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            name: string,
            variables?: Record<string, string>
          ) => {
            receivedPromptNames.push(name);
            receivedVariables.push(variables);
            return { content: "テスト", metadata: "{}" };
          },
        };
        const mockModel = createStreamMock(["応答"]);
        const messages = createTestMessages({
          difficultyLevel: "hard",
          billContext: {
            id: bill.id,
            name: bill.name,
          } as unknown as ChatMessageMetadata["billContext"],
        });

        const response = await handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: trackingPromptProvider },
        });
        await consumeResponseStream(response);

        expect(receivedPromptNames[0]).toBe("bill-chat-system-hard");
        expect(receivedVariables[0]?.billTitle).toBe("詳しいタイトル");
        expect(receivedVariables[0]?.billSummary).toBe("詳しい要約");
        expect(receivedVariables[0]?.billContent).toBe("詳しい本文");
      } finally {
        await cleanupTestBill(bill.id);
      }
    });

    it("本文が未登録でも公開済み bill の基本情報をプロンプト変数に渡す", async () => {
      const bill = await createTestBill({ publish_status: "published" });
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      try {
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            _name: string,
            variables?: Record<string, string>
          ) => {
            receivedVariables.push(variables);
            return { content: "テスト", metadata: "{}" };
          },
        };
        const mockModel = createStreamMock(["応答"]);
        const messages = createTestMessages({
          billContext: {
            id: bill.id,
            name: "クライアント側名称",
          } as unknown as ChatMessageMetadata["billContext"],
        });

        const response = await handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: trackingPromptProvider },
        });
        await consumeResponseStream(response);

        expect(receivedVariables[0]?.billName).toBe(bill.name);
        expect(receivedVariables[0]?.billTitle).toBe("");
        expect(receivedVariables[0]?.billSummary).toBe("");
        expect(receivedVariables[0]?.billContent).toBe("");
      } finally {
        consoleErrorSpy.mockRestore();
        await cleanupTestBill(bill.id);
      }
    });

    it("pageContext.type が home の場合は top-chat-system プロンプトが選択される", async () => {
      const receivedPromptNames: string[] = [];
      const trackingPromptProvider = {
        getPrompt: async (name: string) => {
          receivedPromptNames.push(name);
          return { content: "ホームチャット用プロンプト", metadata: "{}" };
        },
      };

      const mockModel = createStreamMock(["テスト応答"]);
      const messages = createTestMessages({
        pageContext: {
          type: "home",
          bills: [{ id: "bill-1", name: "テスト案件" }],
        },
      });

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: trackingPromptProvider },
      });

      await consumeResponseStream(response);

      expect(receivedPromptNames[0]).toBe("top-chat-system");
    });

    it("明らかな範囲外質問はモデルに渡さず固定文で返し、blocked として保存する", async () => {
      const receivedPromptNames: string[] = [];
      const trackingPromptProvider = {
        getPrompt: async (name: string) => {
          receivedPromptNames.push(name);
          return { content: "呼ばれないプロンプト", metadata: "{}" };
        },
      };
      const mockModel = createStreamMock(["呼ばれない応答"]);
      const messages = createTestMessages({
        pageContext: { type: "bill" },
      });
      messages[0].parts = [
        { type: "text", text: "今日の夜ご飯のメニューを考えて" },
      ];

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: trackingPromptProvider },
      });

      const content = await consumeResponseStream(response);

      expect(response.status).toBe(200);
      expect(content).toContain(OFF_TOPIC_RESPONSE_TEXT);
      expect(content).not.toContain("魚の照り焼き");
      expect(receivedPromptNames).toHaveLength(0);

      const { data, error } = await adminClient
        .from("chat_message_events")
        .select("message, scope_status, block_reason")
        .eq("user_id", testUser.id)
        .single();

      expect(error).toBeNull();
      expect(data?.message).toBe("今日の夜ご飯のメニューを考えて");
      expect(data?.scope_status).toBe("blocked");
      expect(data?.block_reason).toBe("off_topic_standalone_request");
    });
  });

  describe("ツール構成", () => {
    it("案件ページチャットでも web_search ツールを利用できる", () => {
      const tools = buildTools(false);

      expect(tools).toHaveProperty("web_search");
    });
  });

  describe("chat_usage_events の保存", () => {
    it("ストリーム完了後に chat_usage_events が DB に保存される", async () => {
      const sessionId = `test-session-${Date.now()}`;
      const mockModel = createStreamMock(["テスト応答"]);
      const mockPromptProvider = createMockPromptProvider();
      const messages = createTestMessages({ sessionId });

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: mockPromptProvider },
      });

      // ストリームを全て読み込んで onFinish を発火させる
      await consumeResponseStream(response);

      // onFinish は非同期のため少し待つ
      await new Promise((resolve) => setTimeout(resolve, 200));

      const { data: usageEvents } = await adminClient
        .from("chat_usage_events")
        .select("*")
        .eq("user_id", testUser.id);

      expect(usageEvents).toHaveLength(1);
      expect(usageEvents?.[0].user_id).toBe(testUser.id);
      expect(usageEvents?.[0].session_id).toBe(sessionId);
    });

    it("sessionId が空の場合は session_id が null として保存される", async () => {
      const mockModel = createStreamMock(["応答"]);
      const mockPromptProvider = createMockPromptProvider();
      const messages = createTestMessages({ sessionId: "" });

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: mockPromptProvider },
      });

      await consumeResponseStream(response);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const { data: usageEvents } = await adminClient
        .from("chat_usage_events")
        .select("session_id")
        .eq("user_id", testUser.id);

      expect(usageEvents).toHaveLength(1);
      expect(usageEvents?.[0].session_id).toBeNull();
    });
  });

  describe("コストリミット超過", () => {
    it("日次コストリミットを超過している場合は ChatError をスローする", async () => {
      // デイリーコストリミットを超える記録を事前にシード
      await recordChatUsage({
        userId: testUser.id,
        model: "openai/gpt-4o",
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        } as LanguageModelUsage,
        costUsd: 9999.99,
      });

      const mockModel = createStreamMock(["テスト"]);
      const mockPromptProvider = createMockPromptProvider();
      const messages = createTestMessages();

      await expect(
        handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: mockPromptProvider },
        })
      ).rejects.toThrow(ChatError);

      await expect(
        handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: mockPromptProvider },
        })
      ).rejects.toMatchObject({
        code: ChatErrorCode.DAILY_COST_LIMIT_REACHED,
      });
    });
  });
});
