import type { LanguageModelUsage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BillSeoGeneratedFields,
  BillSeoProfile,
  BillSeoSourceData,
} from "../../shared/types";

const mocks = vi.hoisted(() => ({
  adminClient: {},
  claimBillSeoGeneration: vi.fn(),
  completeBillSeoGeneration: vi.fn(),
  failBillSeoGeneration: vi.fn(),
  findBillSeoProfile: vi.fn(),
  findBillSeoSource: vi.fn(),
  recordBillSeoGenerationEvent: vi.fn(),
  sumBillSeoGenerationCostSince: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@mirai-gikai/supabase", () => ({
  createAdminClient: () => mocks.adminClient,
}));
vi.mock("@/lib/env", () => ({
  env: { seo: { dailyTotalCostLimitUsd: 1 } },
}));
vi.mock("../repositories/bill-seo-repository", () => ({
  claimBillSeoGeneration: mocks.claimBillSeoGeneration,
  completeBillSeoGeneration: mocks.completeBillSeoGeneration,
  failBillSeoGeneration: mocks.failBillSeoGeneration,
  findBillSeoProfile: mocks.findBillSeoProfile,
  findBillSeoSource: mocks.findBillSeoSource,
  recordBillSeoGenerationEvent: mocks.recordBillSeoGenerationEvent,
  sumBillSeoGenerationCostSince: mocks.sumBillSeoGenerationCostSince,
}));

import {
  syncBillSeoProfile,
  syncBillSeoProfileSafely,
} from "./generate-bill-seo";

describe("syncBillSeoProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findBillSeoSource.mockResolvedValue({
      isReport: true,
      source: createSource(),
    });
    mocks.findBillSeoProfile.mockResolvedValue(null);
    mocks.sumBillSeoGenerationCostSince.mockResolvedValue(0);
    mocks.claimBillSeoGeneration.mockResolvedValue(true);
    mocks.completeBillSeoGeneration.mockResolvedValue(createProfile());
    mocks.failBillSeoGeneration.mockResolvedValue(undefined);
    mocks.recordBillSeoGenerationEvent.mockResolvedValue(undefined);
  });

  it("検証済みSEOを保存し、使用量とコストを記録する", async () => {
    const generate = vi.fn().mockResolvedValue(
      createAttempt({
        seoTitle: "学校改築計画の内容と重要な論点",
        seoDescription:
          "世田谷区の学校改築計画について、対象校や整備方針、区議会で確認された重要な論点と今後の対応を分かりやすく整理します。",
        seoKeywords: ["世田谷区議会", "学校改築", "教育政策"],
      })
    );

    const result = await syncBillSeoProfile(
      createSource().billId,
      {},
      { model: "openai/gpt-5.6-luna", generate }
    );

    expect(result.status).toBe("ready");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(mocks.completeBillSeoGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        seoTitle: "学校改築計画の内容と重要な論点",
        model: "openai/gpt-5.6-luna",
      }),
      mocks.adminClient
    );
    expect(mocks.recordBillSeoGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        costUsd: 0.02,
      }),
      mocks.adminClient
    );
  });

  it("最初の出力が制約違反なら問題点を添えて1回だけ修復する", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce(
        createAttempt({
          seoTitle: "",
          seoDescription: "短い説明",
          seoKeywords: ["教育"],
        })
      )
      .mockResolvedValueOnce(
        createAttempt({
          seoTitle: "学校改築計画の内容と重要な論点",
          seoDescription:
            "世田谷区の学校改築計画について、対象校や整備方針、区議会で確認された重要な論点と今後の対応を分かりやすく整理します。",
          seoKeywords: ["世田谷区議会", "学校改築", "教育政策"],
        })
      );

    const result = await syncBillSeoProfile(
      createSource().billId,
      {},
      { model: "openai/gpt-5.6-luna", generate }
    );

    expect(result.status).toBe("ready");
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0]).toContain("前回出力には次の問題");
    expect(mocks.recordBillSeoGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTokens: 20,
        outputTokens: 40,
        totalTokens: 60,
        costUsd: 0.04,
      }),
      mocks.adminClient
    );
  });

  it("日次コスト上限ではLLMを呼ばず失敗状態を記録する", async () => {
    mocks.sumBillSeoGenerationCostSince.mockResolvedValue(1);
    const generate = vi.fn();

    const result = await syncBillSeoProfile(
      createSource().billId,
      {},
      { model: "openai/gpt-5.6-luna", generate }
    );

    expect(result.status).toBe("failed");
    expect(result.warning).toContain("日次コスト上限");
    expect(generate).not.toHaveBeenCalled();
    expect(mocks.claimBillSeoGeneration).not.toHaveBeenCalled();
    expect(mocks.failBillSeoGeneration).toHaveBeenCalledOnce();
  });

  it("生成処理の例外は安全な警告へ変換し案件保存を継続できる", async () => {
    mocks.findBillSeoSource.mockRejectedValue(new Error("database offline"));

    const result = await syncBillSeoProfileSafely(createSource().billId);

    expect(result).toEqual({
      status: "failed",
      profile: null,
      warning: "案件は保存しましたが、SEO生成に失敗しました: database offline",
    });
  });
});

function createAttempt(fields: BillSeoGeneratedFields) {
  return {
    fields,
    usage: {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    } as LanguageModelUsage,
    gatewayCostUsd: 0.02,
  };
}

function createSource(): BillSeoSourceData {
  return {
    billId: "11111111-1111-4111-8111-111111111111",
    formalName: "学校改築計画について",
    itemType: "report",
    majorCategory: "教育🏫",
    submittedDate: "2026-08-29",
    statusLabel: "報告済み",
    statusNote: "文教常任委員会で報告",
    dietSessionName: "令和8年第3回定例会",
    normalTitle: "学校改築について",
    normalSummary: "学校改築の計画を説明します。",
    normalContent: "# 具体的な内容\n\n本文",
    tags: ["学校改築", "小学校"],
    sources: [],
  };
}

function createProfile(): BillSeoProfile {
  return {
    billId: createSource().billId,
    seoTitle: "学校改築計画の内容と重要な論点",
    seoDescription:
      "世田谷区の学校改築計画について、対象校や整備方針、区議会で確認された重要な論点と今後の対応を分かりやすく整理します。",
    seoKeywords: ["世田谷区議会", "学校改築", "教育政策"],
    status: "ready",
    sourceHash: "source-hash",
    generatedAt: "2026-08-29T00:00:00.000Z",
    generationStartedAt: null,
    model: "openai/gpt-5.6-luna",
    lastError: null,
    updatedAt: "2026-08-29T00:00:00.000Z",
  };
}
