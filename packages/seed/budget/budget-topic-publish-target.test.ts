import { describe, expect, it } from "vitest";
import {
  assertSafeBudgetTopicPublishTarget,
  budgetTopicProductionConfirmation,
} from "./budget-topic-publish-target";

describe("assertSafeBudgetTopicPublishTarget", () => {
  it("localhostは明示確認なしで許可する", () => {
    expect(() =>
      assertSafeBudgetTopicPublishTarget({
        supabaseUrl: "http://127.0.0.1:54421",
      })
    ).not.toThrow();
  });

  it("validation環境は明示指定した場合だけ許可する", () => {
    expect(() =>
      assertSafeBudgetTopicPublishTarget({
        supabaseUrl: "https://validation.example.supabase.co",
        environmentName: "validation",
      })
    ).not.toThrow();
  });

  it("productionは通常のローカル実行から拒否する", () => {
    expect(() =>
      assertSafeBudgetTopicPublishTarget({
        supabaseUrl: "https://production.example.supabase.co",
        environmentName: "production",
        productionConfirmation: budgetTopicProductionConfirmation,
      })
    ).toThrow("mainの手動GitHub Actions");
  });

  it("mainのworkflow_dispatchと完全一致する確認文だけproductionを許可する", () => {
    expect(() =>
      assertSafeBudgetTopicPublishTarget({
        supabaseUrl: "https://production.example.supabase.co",
        environmentName: "production",
        productionConfirmation: budgetTopicProductionConfirmation,
        githubActions: "true",
        githubRefName: "main",
        githubEventName: "workflow_dispatch",
      })
    ).not.toThrow();
  });

  it("main以外や自動イベントからのproduction公開を拒否する", () => {
    expect(() =>
      assertSafeBudgetTopicPublishTarget({
        supabaseUrl: "https://production.example.supabase.co",
        environmentName: "production",
        productionConfirmation: budgetTopicProductionConfirmation,
        githubActions: "true",
        githubRefName: "develop",
        githubEventName: "push",
      })
    ).toThrow("mainの手動GitHub Actions");
  });
});
