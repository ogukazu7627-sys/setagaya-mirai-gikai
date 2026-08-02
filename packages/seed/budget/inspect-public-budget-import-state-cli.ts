import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  budgetDatasetStorageBucket,
  buildBudgetDatasetStoragePrefix,
} from "./build-budget-import-payload";
import { assertSafeBudgetImportTarget } from "./budget-import-target";
import { readPublicBudgetDataset } from "./read-public-budget-files";

const inspectedTables = [
  "budget_program_identities",
  "budget_programs",
  "budget_items",
  "budget_item_sections",
  "budget_revenue_items",
  "budget_revenue_sections",
  "budget_revenue_details",
  "budget_revenue_allocations",
  "budget_source_documents",
] as const;

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です`);
  }
  return value;
}

async function main(argv: string[]): Promise<number> {
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const { values } = parseArgs({
    args: normalizedArgv,
    strict: true,
    options: { "input-dir": { type: "string" } },
  });
  if (!values["input-dir"]) {
    throw new Error("--input-dir は必須です");
  }
  const inputDirectory = path.resolve(
    process.env.INIT_CWD ?? process.cwd(),
    values["input-dir"]
  );
  const dataset = readPublicBudgetDataset({ inputDirectory });
  const supabaseUrl = requireEnvironment("SUPABASE_URL");
  requireEnvironment("SUPABASE_SECRET_KEY");
  assertSafeBudgetImportTarget({
    supabaseUrl,
    environmentName: process.env.BUDGET_IMPORT_ENVIRONMENT,
    productionConfirmation: process.env.BUDGET_PRODUCTION_IMPORT_CONFIRMATION,
    productionProjectRef: process.env.SUPABASE_PROJECT_REF,
    githubActions: process.env.GITHUB_ACTIONS,
    githubRefName: process.env.GITHUB_REF_NAME,
    githubEventName: process.env.GITHUB_EVENT_NAME,
    githubRepository: process.env.GITHUB_REPOSITORY,
  });

  const client = createAdminClient() as SupabaseClient;
  const { data: datasets, error: datasetError } = await client
    .from("budget_datasets")
    .select("id,status,validation_status,manifest_sha256")
    .eq("fiscal_year", dataset.manifest.fiscalYear)
    .eq("budget_type", dataset.manifest.budgetType);
  if (datasetError) {
    throw new Error(`dataset状態の確認に失敗しました: ${datasetError.message}`);
  }
  const target = (datasets ?? []).find(
    (row) => row.manifest_sha256 === dataset.manifestSha256
  );
  const counts: Record<string, number | null> = {};
  if (target) {
    for (const table of inspectedTables) {
      const { count, error } = await client
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("dataset_id", target.id);
      if (error) {
        throw new Error(`${table}の件数確認に失敗しました: ${error.message}`);
      }
      counts[table] = count;
    }
  }

  const prefix = buildBudgetDatasetStoragePrefix(dataset);
  const { data: objects, error: storageError } = await client.storage
    .from(budgetDatasetStorageBucket)
    .list(prefix, { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (storageError) {
    throw new Error(`Storage状態の確認に失敗しました: ${storageError.message}`);
  }

  console.log(
    JSON.stringify(
      {
        manifestSha256: dataset.manifestSha256,
        datasets: (datasets ?? []).map((row) => ({
          isTargetManifest: row.manifest_sha256 === dataset.manifestSha256,
          status: row.status,
          validationStatus: row.validation_status,
        })),
        counts,
        storage: {
          objectCount: objects?.length ?? 0,
          objectNames: (objects ?? []).map((object) => object.name).sort(),
        },
      },
      null,
      2
    )
  );
  return 0;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
