import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import {
  generateObject,
  type LanguageModel,
  type LanguageModelUsage,
} from "ai";
import {
  calculateUsageCostUsd,
  roundCost,
  sanitizeUsage,
} from "@/lib/ai/calculate-ai-cost";
import { AI_MODELS } from "@/lib/ai/models";
import { env } from "@/lib/env";
import type {
  BillSeoGeneratedFields,
  BillSeoGenerationResult,
} from "../../shared/types";
import {
  billSeoGenerationSchema,
  buildBillSeoGenerationPrompt,
  normalizeGeneratedBillSeo,
  validateGeneratedBillSeo,
} from "../../shared/utils/bill-seo-generation";
import {
  createBillSeoSourceHash,
  getTokyoDayStartIso,
} from "../../shared/utils/bill-seo-source";
import {
  claimBillSeoGeneration,
  completeBillSeoGeneration,
  failBillSeoGeneration,
  findBillSeoProfile,
  findBillSeoSource,
  recordBillSeoGenerationEvent,
  sumBillSeoGenerationCostSince,
} from "../repositories/bill-seo-repository";

export const BILL_SEO_MODEL = AI_MODELS.gpt5_6_luna;

type SeoGenerationAttempt = {
  fields: BillSeoGeneratedFields;
  usage: LanguageModelUsage;
  gatewayCostUsd?: number;
};

export type BillSeoGenerationDeps = {
  model?: LanguageModel | string;
  generate?: (
    prompt: string,
    model: LanguageModel | string
  ) => Promise<SeoGenerationAttempt>;
  now?: Date;
};

export async function syncBillSeoProfileSafely(
  billId: string,
  options: { force?: boolean } = {}
): Promise<BillSeoGenerationResult> {
  try {
    return await syncBillSeoProfile(billId, options);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "案件別SEOの生成に失敗しました。";
    return {
      status: "failed",
      profile: null,
      warning: `案件は保存しましたが、SEO生成に失敗しました: ${message}`,
    };
  }
}

export async function syncBillSeoProfile(
  billId: string,
  options: { force?: boolean } = {},
  deps: BillSeoGenerationDeps = {}
): Promise<BillSeoGenerationResult> {
  const supabase = createAdminClient();
  const sourceResult = await findBillSeoSource(billId, supabase);

  if (!sourceResult.isReport) {
    return { status: "skipped", profile: null, warning: null };
  }
  if (!sourceResult.source) {
    return {
      status: "failed",
      profile: await findBillSeoProfile(billId, supabase),
      warning: "normal版本文がないため、案件別SEOを生成できませんでした。",
    };
  }

  const sourceHash = createBillSeoSourceHash(sourceResult.source);
  const now = deps.now ?? new Date();
  const dailyCost = await sumBillSeoGenerationCostSince(
    getTokyoDayStartIso(now),
    supabase
  );
  if (dailyCost >= env.seo.dailyTotalCostLimitUsd) {
    const message = `案件別SEOの日次コスト上限（$${env.seo.dailyTotalCostLimitUsd}）に達したため生成を見送りました。`;
    await failBillSeoGeneration(
      { billId, sourceHash, errorMessage: message },
      supabase
    );
    return {
      status: "failed",
      profile: await findBillSeoProfile(billId, supabase),
      warning: message,
    };
  }

  const claimed = await claimBillSeoGeneration(
    { billId, sourceHash, force: options.force ?? false },
    supabase
  );
  if (!claimed) {
    return {
      status: "skipped",
      profile: await findBillSeoProfile(billId, supabase),
      warning: null,
    };
  }

  const model = deps.model ?? BILL_SEO_MODEL;
  const modelName = getModelName(model);
  const generate = deps.generate ?? generateBillSeoAttempt;
  let aggregateUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let aggregateCostUsd = 0;

  try {
    let attempt = await generate(
      buildBillSeoGenerationPrompt(sourceResult.source),
      model
    );
    aggregateUsage = addUsage(aggregateUsage, sanitizeUsage(attempt.usage));
    aggregateCostUsd = roundCost(
      aggregateCostUsd +
        (attempt.gatewayCostUsd ??
          calculateUsageCostUsd(modelName, sanitizeUsage(attempt.usage)))
    );

    let issues = validateGeneratedBillSeo(attempt.fields);
    if (issues.length > 0) {
      attempt = await generate(
        buildBillSeoGenerationPrompt(sourceResult.source, issues),
        model
      );
      aggregateUsage = addUsage(aggregateUsage, sanitizeUsage(attempt.usage));
      aggregateCostUsd = roundCost(
        aggregateCostUsd +
          (attempt.gatewayCostUsd ??
            calculateUsageCostUsd(modelName, sanitizeUsage(attempt.usage)))
      );
      issues = validateGeneratedBillSeo(attempt.fields);
    }

    if (issues.length > 0) {
      throw new Error(`AI生成値の検証に失敗しました: ${issues.join(" ")}`);
    }

    const profile = await completeBillSeoGeneration(
      {
        billId,
        sourceHash,
        ...attempt.fields,
        model: modelName,
        generatedAt: now.toISOString(),
      },
      supabase
    );

    await recordBillSeoGenerationEvent(
      {
        billId,
        sourceHash,
        model: modelName,
        ...aggregateUsage,
        costUsd: aggregateCostUsd,
        success: true,
        errorMessage: null,
      },
      supabase
    );

    return {
      status: profile ? "ready" : "skipped",
      profile,
      warning: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "案件別SEOの生成に失敗しました。";
    await Promise.allSettled([
      failBillSeoGeneration(
        {
          billId,
          sourceHash,
          errorMessage: message,
          onlyIfGenerating: true,
        },
        supabase
      ),
      recordBillSeoGenerationEvent(
        {
          billId,
          sourceHash,
          model: modelName,
          ...aggregateUsage,
          costUsd: aggregateCostUsd,
          success: false,
          errorMessage: message,
        },
        supabase
      ),
    ]);

    return {
      status: "failed",
      profile: await findBillSeoProfile(billId, supabase),
      warning: `案件は保存しましたが、SEO生成に失敗しました: ${message}`,
    };
  }
}

async function generateBillSeoAttempt(
  prompt: string,
  model: LanguageModel | string
): Promise<SeoGenerationAttempt> {
  const result = await generateObject({
    model,
    schema: billSeoGenerationSchema,
    prompt,
  });

  return {
    fields: normalizeGeneratedBillSeo(result.object),
    usage: result.usage,
    gatewayCostUsd: extractGatewayCost(result),
  };
}

function addUsage(
  left: { inputTokens: number; outputTokens: number; totalTokens: number },
  right: { inputTokens: number; outputTokens: number; totalTokens: number }
) {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  };
}

function getModelName(model: LanguageModel | string): string {
  return typeof model === "string" ? model : model.modelId;
}

function extractGatewayCost(value: {
  providerMetadata?: unknown;
}): number | undefined {
  const providerMetadata = value.providerMetadata;
  if (!providerMetadata || typeof providerMetadata !== "object") {
    return undefined;
  }

  const cost = (providerMetadata as { gateway?: { cost?: unknown } }).gateway
    ?.cost;
  const numericCost = Number(cost);
  return Number.isFinite(numericCost) ? numericCost : undefined;
}
