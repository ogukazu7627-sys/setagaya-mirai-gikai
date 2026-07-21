import "server-only";

import type { UIMessage } from "ai";
import type { ChatTopicScopeDecision } from "../../shared/off-topic-guard";
import { extractLatestUserText } from "../../shared/off-topic-guard";
import { insertChatMessageEvent } from "../repositories/chat-message-event-repository";
import type { ChatMessageMetadata } from "./handle-chat-request";

type RecordUserChatMessageEventParams = {
  messages: UIMessage<ChatMessageMetadata>[];
  userId: string;
  context: ChatMessageMetadata;
  topicScope: ChatTopicScopeDecision;
};

export async function recordUserChatMessageEvent({
  messages,
  userId,
  context,
  topicScope,
}: RecordUserChatMessageEventParams) {
  const message = extractLatestUserText(messages).trim();

  if (!message) {
    return;
  }

  try {
    await insertChatMessageEvent({
      user_id: userId,
      session_id: context.sessionId || null,
      page_type:
        context.pageContext?.type ?? (context.billContext ? "bill" : "unknown"),
      bill_id: context.billContext?.id ?? null,
      difficulty_level: context.difficultyLevel,
      message,
      scope_status: topicScope.status,
      block_reason: topicScope.status === "blocked" ? topicScope.reason : null,
      metadata: {
        matchedTerm: topicScope.matchedTerm ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to record chat message event:", error);
  }
}
