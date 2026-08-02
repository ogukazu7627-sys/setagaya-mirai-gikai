export const budgetTopicProductionConfirmation =
  "PUBLISH_REVIEWED_BUDGET_TOPICS";

export interface BudgetTopicPublishTarget {
  supabaseUrl: string;
  environmentName?: string;
  productionConfirmation?: string;
  githubActions?: string;
  githubRefName?: string;
  githubEventName?: string;
}

export function assertSafeBudgetTopicPublishTarget({
  supabaseUrl,
  environmentName,
  productionConfirmation,
  githubActions,
  githubRefName,
  githubEventName,
}: BudgetTopicPublishTarget): void {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error("SUPABASE_URL が有効なURLではありません");
  }

  const isLocal = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(
    parsedUrl.hostname
  );
  if (isLocal) {
    return;
  }
  if (environmentName === "validation") {
    return;
  }
  if (environmentName !== "production") {
    throw new Error(
      "リモート環境へ公開する場合は BUDGET_IMPORT_ENVIRONMENT の明示が必要です"
    );
  }

  if (
    productionConfirmation !== budgetTopicProductionConfirmation ||
    githubActions !== "true" ||
    githubRefName !== "main" ||
    githubEventName !== "workflow_dispatch"
  ) {
    throw new Error(
      "本番の課題関係公開はmainの手動GitHub Actionsからだけ実行できます"
    );
  }
}
