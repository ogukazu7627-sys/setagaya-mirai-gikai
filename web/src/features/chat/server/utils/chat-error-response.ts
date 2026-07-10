import { APICallError } from "ai";
import { textResponse } from "@/lib/api/response";
import { ChatError, ChatErrorCode } from "../../shared/types/errors";

export const TEMPORARY_AI_UNAVAILABLE_MESSAGE =
  "現在AIチャットが混み合っています。少し時間をおいてお試しください。";

/**
 * ChatError を適切な HTTP レスポンスに変換する。
 * ChatError でない場合は汎用の500レスポンスを返す。
 */
export function chatErrorToResponse(error: unknown): Response {
  if (isTemporaryAiGatewayError(error)) {
    return textResponse(TEMPORARY_AI_UNAVAILABLE_MESSAGE, 429);
  }

  if (error instanceof ChatError) {
    switch (error.code) {
      case ChatErrorCode.DAILY_COST_LIMIT_REACHED:
      case ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED:
        return textResponse(
          "本日の利用上限に達しました。明日0時以降に再度お試しください。",
          429
        );
      case ChatErrorCode.SYSTEM_MONTHLY_COST_LIMIT_REACHED:
        return textResponse(
          "今月の利用上限に達しました。来月1日以降に再度お試しください。",
          429
        );
      case ChatErrorCode.LLM_GENERATION_FAILED:
        if (isTemporaryAiGatewayError(error.message)) {
          return textResponse(TEMPORARY_AI_UNAVAILABLE_MESSAGE, 429);
        }
        return textResponse(
          "エラーが発生しました。しばらく待ってから再度お試しください。",
          500
        );
      default:
        return textResponse(
          "エラーが発生しました。しばらく待ってから再度お試しください。",
          500
        );
    }
  }

  return textResponse(
    "エラーが発生しました。しばらく待ってから再度お試しください。",
    500
  );
}

export function chatStreamErrorMessage(error: unknown): string {
  if (isTemporaryAiGatewayError(error)) {
    return TEMPORARY_AI_UNAVAILABLE_MESSAGE;
  }

  return "エラーが発生しました。しばらく待ってから再度お試しください。";
}

function isTemporaryAiGatewayError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    return [402, 429, 503].includes(error.statusCode ?? 0);
  }

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  const normalizedMessage = message.toLowerCase();

  return [
    "free tier requests",
    "rate-limited",
    "rate limited",
    "paid credits",
    "ai gateway credits",
    "upgrade to paid credits",
    "too many requests",
  ].some((keyword) => normalizedMessage.includes(keyword));
}
