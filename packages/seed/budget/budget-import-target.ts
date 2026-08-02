export const budgetProductionImportConfirmation = "IMPORT_2026_INITIAL_BUDGET";

const productionRepository = "ogukazu7627-sys/setagaya-mirai-gikai";

export interface BudgetImportTarget {
  supabaseUrl: string;
  environmentName?: string;
  productionConfirmation?: string;
  productionProjectRef?: string;
  githubActions?: string;
  githubRefName?: string;
  githubEventName?: string;
  githubRepository?: string;
}

export function assertSafeBudgetImportTarget({
  supabaseUrl,
  environmentName,
  productionConfirmation,
  productionProjectRef,
  githubActions,
  githubRefName,
  githubEventName,
  githubRepository,
}: BudgetImportTarget): void {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error("SUPABASE_URL が有効なURLではありません");
  }

  const isLocal =
    parsedUrl.hostname === "127.0.0.1" ||
    parsedUrl.hostname === "localhost" ||
    parsedUrl.hostname === "::1" ||
    parsedUrl.hostname === "[::1]";

  if (environmentName === "production") {
    const expectedHostname = productionProjectRef
      ? `${productionProjectRef}.supabase.co`
      : undefined;
    if (
      productionConfirmation !== budgetProductionImportConfirmation ||
      githubActions !== "true" ||
      githubRefName !== "main" ||
      githubEventName !== "workflow_dispatch" ||
      githubRepository !== productionRepository ||
      expectedHostname === undefined ||
      parsedUrl.hostname !== expectedHostname
    ) {
      throw new Error(
        "本番Supabaseへの投入はmainの承認済み手動workflowだけが実行できます"
      );
    }
    return;
  }

  if (!isLocal && environmentName !== "validation") {
    throw new Error(
      "リモート環境へ投入する場合は BUDGET_IMPORT_ENVIRONMENT=validation が必要です"
    );
  }
}
