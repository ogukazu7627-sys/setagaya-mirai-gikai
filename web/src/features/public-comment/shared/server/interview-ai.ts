import "server-only";
import { generateText, type LanguageModel, Output } from "ai";
import {
  isWithinDailyCostLimit,
  recordChatUsage,
} from "@/features/chat/server/services/cost-tracker";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { DEFAULT_INTERVIEW_CHAT_MODEL } from "@/lib/ai/models";
import { env } from "@/lib/env";
import {
  buildTurnPrompt,
  turnResponseSchema,
  type TurnMessage,
} from "../interview-turn";
import type { InterviewState } from "../interview-state";
import type { InterviewCampaign } from "./interview-campaigns";

export async function generateInterviewTurn(params: {
  campaign: InterviewCampaign;
  state: InterviewState;
  messages: TurnMessage[];
  userId: string;
  sessionId: string;
  model?: LanguageModel;
}) {
  if (
    !(await isWithinDailyCostLimit(
      params.userId,
      env.chat.dailyUserCostLimitUsd
    ))
  ) {
    throw new ChatError(ChatErrorCode.DAILY_COST_LIMIT_REACHED);
  }
  const model = params.model ?? DEFAULT_INTERVIEW_CHAT_MODEL;
  const result = await generateText({
    model,
    prompt: buildTurnPrompt({
      policy: params.campaign.policy(),
      state: params.state,
      questions: params.campaign.questions,
      messages: params.messages,
    }),
    output: Output.object({ schema: turnResponseSchema }),
  });
  const gatewayCost = result.providerMetadata?.gateway?.cost;
  try {
    await recordChatUsage({
      userId: params.userId,
      sessionId: params.sessionId,
      promptName: "public-comment-interview",
      model: typeof model === "string" ? model : model.modelId,
      usage: result.usage,
      costUsd: typeof gatewayCost === "number" ? gatewayCost : undefined,
      metadata: {
        pageType: "public-comment",
        campaign: params.campaign.slug,
        finishReason: result.finishReason ?? null,
        stepCount: 0,
      },
    });
  } catch {
    console.error("Failed to record public comment interview usage");
  }
  return result.output;
}
