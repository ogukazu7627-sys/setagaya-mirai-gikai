import { describe, expect, it } from "vitest";
import { assertSafeBudgetImportTarget } from "./import-public-budget";

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

  it("production指定はURLにかかわらず拒否する", () => {
    expect(() =>
      assertSafeBudgetImportTarget({
        supabaseUrl: "http://127.0.0.1:54421",
        environmentName: "production",
      })
    ).toThrow("本番Supabase");
  });
});
