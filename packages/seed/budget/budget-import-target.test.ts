import { describe, expect, it } from "vitest";
import {
  assertSafeBudgetImportTarget,
  budgetProductionImportConfirmation,
} from "./budget-import-target";

describe("assertSafeBudgetImportTarget", () => {
  it.each([
    "http://127.0.0.1:54421",
    "http://localhost:54421",
    "http://[::1]:54421",
  ])("ローカルSupabaseを許可する: %s", (supabaseUrl) => {
    expect(() => assertSafeBudgetImportTarget({ supabaseUrl })).not.toThrow();
  });

  it("明示されたvalidation環境だけリモートを許可する", () => {
    expect(() =>
      assertSafeBudgetImportTarget({
        supabaseUrl: "https://validation.example.supabase.co",
        environmentName: "validation",
      })
    ).not.toThrow();
  });

  it("環境指定のないリモート投入を拒否する", () => {
    expect(() =>
      assertSafeBudgetImportTarget({
        supabaseUrl: "https://example.supabase.co",
      })
    ).toThrow("BUDGET_IMPORT_ENVIRONMENT=validation");
  });

  it("通常のローカル実行からproductionを拒否する", () => {
    expect(() =>
      assertSafeBudgetImportTarget({
        supabaseUrl: "https://project-ref.supabase.co",
        environmentName: "production",
        productionConfirmation: budgetProductionImportConfirmation,
        productionProjectRef: "project-ref",
      })
    ).toThrow("承認済み手動workflow");
  });

  it("mainのworkflow_dispatchと完全一致する確認文・projectだけproductionを許可する", () => {
    expect(() =>
      assertSafeBudgetImportTarget({
        supabaseUrl: "https://project-ref.supabase.co",
        environmentName: "production",
        productionConfirmation: budgetProductionImportConfirmation,
        productionProjectRef: "project-ref",
        githubActions: "true",
        githubRefName: "main",
        githubEventName: "workflow_dispatch",
        githubRepository: "ogukazu7627-sys/setagaya-mirai-gikai",
      })
    ).not.toThrow();
  });

  it.each([
    { productionConfirmation: "wrong" },
    { productionProjectRef: "different-ref" },
    { githubActions: "false" },
    { githubRefName: "develop" },
    { githubEventName: "push" },
    { githubRepository: "someone/fork" },
  ])("production条件の不一致を拒否する: %o", (override) => {
    expect(() =>
      assertSafeBudgetImportTarget({
        supabaseUrl: "https://project-ref.supabase.co",
        environmentName: "production",
        productionConfirmation: budgetProductionImportConfirmation,
        productionProjectRef: "project-ref",
        githubActions: "true",
        githubRefName: "main",
        githubEventName: "workflow_dispatch",
        githubRepository: "ogukazu7627-sys/setagaya-mirai-gikai",
        ...override,
      })
    ).toThrow("承認済み手動workflow");
  });
});
