import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { ChatError, ChatErrorCode } from "../../shared/types/errors";
import {
  chatErrorToResponse,
  chatStreamErrorMessage,
  TEMPORARY_AI_UNAVAILABLE_MESSAGE,
} from "./chat-error-response";

describe("chatErrorToResponse", () => {
  it("DAILY_COST_LIMIT_REACHED で 429 を返す", async () => {
    const res = chatErrorToResponse(
      new ChatError(ChatErrorCode.DAILY_COST_LIMIT_REACHED)
    );
    expect(res.status).toBe(429);
    expect(await res.text()).toContain("本日の利用上限");
  });

  it("SYSTEM_DAILY_COST_LIMIT_REACHED で 429 を返す", async () => {
    const res = chatErrorToResponse(
      new ChatError(ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED)
    );
    expect(res.status).toBe(429);
    expect(await res.text()).toContain("本日の利用上限");
  });

  it("SYSTEM_MONTHLY_COST_LIMIT_REACHED で 429 を返す", async () => {
    const res = chatErrorToResponse(
      new ChatError(ChatErrorCode.SYSTEM_MONTHLY_COST_LIMIT_REACHED)
    );
    expect(res.status).toBe(429);
    expect(await res.text()).toContain("今月の利用上限");
  });

  it("Vercel AI Gateway の 429 で混雑メッセージを返す", async () => {
    const res = chatErrorToResponse(
      new APICallError({
        message:
          "Free tier requests on this model are rate-limited. Upgrade to paid credits.",
        url: "https://ai-gateway.vercel.sh/v1/chat/completions",
        requestBodyValues: {},
        statusCode: 429,
        responseBody:
          "Free tier requests on this model are rate-limited. Upgrade to paid credits.",
      })
    );

    expect(res.status).toBe(429);
    expect(await res.text()).toBe(TEMPORARY_AI_UNAVAILABLE_MESSAGE);
  });

  it("LLM_GENERATION_FAILED に Gateway 制限文言が含まれる場合は混雑メッセージを返す", async () => {
    const res = chatErrorToResponse(
      new ChatError(
        ChatErrorCode.LLM_GENERATION_FAILED,
        "Free tier requests on this model are rate-limited. Upgrade to paid credits."
      )
    );

    expect(res.status).toBe(429);
    expect(await res.text()).toBe(TEMPORARY_AI_UNAVAILABLE_MESSAGE);
  });

  it("その他の ChatError で 500 を返す", async () => {
    const res = chatErrorToResponse(
      new ChatError(ChatErrorCode.PROMPT_FETCH_FAILED)
    );
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("エラーが発生しました");
  });

  it("ChatError 以外のエラーで 500 を返す", async () => {
    const res = chatErrorToResponse(new Error("unexpected"));
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("エラーが発生しました");
  });
});

describe("chatStreamErrorMessage", () => {
  it("Gateway 制限文言をストリーム用の混雑メッセージに変換する", () => {
    expect(
      chatStreamErrorMessage(
        new Error(
          "Free tier requests on this model are rate-limited. Upgrade to paid credits."
        )
      )
    ).toBe(TEMPORARY_AI_UNAVAILABLE_MESSAGE);
  });

  it("通常エラーは汎用メッセージにする", () => {
    expect(chatStreamErrorMessage(new Error("unexpected"))).toContain(
      "エラーが発生しました"
    );
  });
});
