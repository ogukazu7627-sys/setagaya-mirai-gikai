import "server-only";

import { generateText, type LanguageModel, Output } from "ai";
import {
  isWithinDailyCostLimit,
  recordChatUsage,
} from "@/features/chat/server/services/cost-tracker";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import {
  publicCommentChatResponseSchema,
  publicCommentDraftSchema,
} from "@/features/public-comment/minpaku/shared/schemas";
import { AI_MODELS, DEFAULT_INTERVIEW_CHAT_MODEL } from "@/lib/ai/models";
import { env } from "@/lib/env";
import { GENDER_EQUALITY_CAMPAIGN_SLUG } from "../shared/campaign";
import { buildDraftPrompt, buildInterviewPrompt } from "./prompt";

type Message = { role: "user" | "assistant"; content: string };

function modelName(model: LanguageModel | string) {
  return typeof model === "string" ? model : model.modelId;
}

function gatewayCost(result: { providerMetadata?: unknown }) {
  if (!result.providerMetadata || typeof result.providerMetadata !== "object") {
    return undefined;
  }
  const cost = (result.providerMetadata as { gateway?: { cost?: unknown } })
    .gateway?.cost;
  return typeof cost === "number" ? cost : undefined;
}

async function checkCost(userId: string) {
  const allowed = await isWithinDailyCostLimit(
    userId,
    env.chat.dailyUserCostLimitUsd
  );
  if (!allowed) throw new ChatError(ChatErrorCode.DAILY_COST_LIMIT_REACHED);
}

export async function generateInterviewResponse(params: {
  userId: string;
  sessionId: string;
  messages: Message[];
  nextQuestionId: string;
  model?: LanguageModel;
}) {
  await checkCost(params.userId);
  const model = params.model ?? DEFAULT_INTERVIEW_CHAT_MODEL;
  const result = await generateText({
    model,
    prompt: buildInterviewPrompt({
      messages: params.messages,
      nextQuestionId: params.nextQuestionId,
    }),
    output: Output.object({ schema: publicCommentChatResponseSchema }),
    experimental_telemetry: {
      isEnabled: true,
      functionId: "public-comment-interview",
      metadata: {
        sessionId: params.sessionId,
        campaign: GENDER_EQUALITY_CAMPAIGN_SLUG,
      },
    },
  });

  try {
    await recordChatUsage({
      userId: params.userId,
      sessionId: params.sessionId,
      promptName: "public-comment-interview",
      model: modelName(model),
      usage: result.usage,
      costUsd: gatewayCost(result),
      metadata: {
        pageType: "public-comment",
        campaign: GENDER_EQUALITY_CAMPAIGN_SLUG,
        finishReason: result.finishReason ?? null,
        stepCount: 0,
      },
    });
  } catch (error) {
    console.error("Failed to record public comment interview usage:", error);
  }
  return result.output;
}

export async function generatePublicCommentDraft(params: {
  userId: string;
  sessionId: string;
  messages: Message[];
  model?: LanguageModel;
}) {
  await checkCost(params.userId);
  const model = params.model ?? AI_MODELS.gpt5_6_sol;
  const result = await generateText({
    model,
    prompt: buildDraftPrompt({ messages: params.messages }),
    output: Output.object({ schema: publicCommentDraftSchema }),
    experimental_telemetry: {
      isEnabled: true,
      functionId: "public-comment-draft",
      metadata: {
        sessionId: params.sessionId,
        campaign: GENDER_EQUALITY_CAMPAIGN_SLUG,
      },
    },
  });

  try {
    await recordChatUsage({
      userId: params.userId,
      sessionId: params.sessionId,
      promptName: "public-comment-draft",
      model: modelName(model),
      usage: result.usage,
      costUsd: gatewayCost(result),
      metadata: {
        pageType: "public-comment",
        campaign: GENDER_EQUALITY_CAMPAIGN_SLUG,
        finishReason: result.finishReason ?? null,
        stepCount: 0,
      },
    });
  } catch (error) {
    console.error("Failed to record public comment draft usage:", error);
  }
  return result.output;
}
