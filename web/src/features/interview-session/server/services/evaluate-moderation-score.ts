import "server-only";

import { buildModerationPrompt } from "@mirai-gikai/shared/moderation/build-prompt";
import { moderationResultSchema } from "@mirai-gikai/shared/moderation/schemas";
import {
  determineModerationStatus,
  type ModerationStatus,
} from "@mirai-gikai/shared/moderation/status";
import {
  generateObject,
  type LanguageModel,
  type LanguageModelUsage,
} from "ai";
import { DEFAULT_INTERVIEW_CHAT_MODEL } from "@/lib/ai/models";

/** テスト時にモック注入するための外部依存 */
export type ModerationDeps = {
  model?: LanguageModel;
};

type ModerationInput = {
  summary: string | null;
  opinions: Array<{ title: string; content: string }> | null;
  roleDescription: string | null;
  messages: Array<{ role: string; content: string }>;
};

type ModerationOutput = {
  score: number;
  status: ModerationStatus;
  reasoning: string;
  model: string;
  usage: LanguageModelUsage;
  costUsd?: number;
  finishReason: string | null;
};

/**
 * レポート内容のモデレーションスコアを評価する
 */
export async function evaluateModerationScore(
  input: ModerationInput,
  deps?: ModerationDeps
): Promise<ModerationOutput> {
  const prompt = buildModerationPrompt(input);
  const model = deps?.model ?? DEFAULT_INTERVIEW_CHAT_MODEL;

  const result = await generateObject({
    model,
    schema: moderationResultSchema,
    prompt,
  });

  const { object } = result;
  const status = determineModerationStatus(object.score);

  console.log(`Moderation result: score=${object.score}, status=${status}`);

  return {
    score: object.score,
    status,
    reasoning: object.reasoning,
    model: getModelName(model),
    usage: result.usage,
    costUsd: extractGatewayCost(result),
    finishReason:
      typeof result.finishReason === "string" ? result.finishReason : null,
  };
}

function getModelName(model: LanguageModel | string): string {
  if (typeof model === "string") {
    return model;
  }

  return typeof model.modelId === "string" ? model.modelId : "unknown";
}

function extractGatewayCost(event: {
  providerMetadata?: unknown;
}): number | undefined {
  const providerMetadata = event.providerMetadata;
  if (!providerMetadata || typeof providerMetadata !== "object") {
    return undefined;
  }

  const gatewayCost = (
    providerMetadata as {
      gateway?: { cost?: unknown };
    }
  ).gateway?.cost;

  const numericCost = Number(gatewayCost);

  return Number.isFinite(numericCost) ? numericCost : undefined;
}
