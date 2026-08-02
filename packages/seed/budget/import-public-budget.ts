import { createHash } from "node:crypto";
import { createAdminClient, type Json } from "@mirai-gikai/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  type BudgetImportArtifact,
  budgetDatasetStorageBucket,
  buildBudgetImportPayload,
} from "./build-budget-import-payload";
import { assertSafeBudgetImportTarget } from "./budget-import-target";
import type { PublicBudgetDataset } from "./read-public-budget-files";

const datasetStatusSchema = z.enum(["staging", "active", "archived"]);

const importResultSchema = z.strictObject({
  datasetId: z.string().uuid(),
  status: datasetStatusSchema,
  alreadyImported: z.boolean(),
});

const activationResultSchema = z.strictObject({
  datasetId: z.string().uuid(),
  status: z.literal("active"),
  alreadyActive: z.boolean(),
});

const validationResultSchema = z.strictObject({
  datasetId: z.string().uuid(),
  status: z.enum(["PASS", "FAIL"]),
  errors: z.array(z.unknown()),
  counts: z.record(z.string(), z.number()),
  totals: z.record(z.string(), z.number()),
  accountTotals: z.array(z.record(z.string(), z.unknown())),
});

const persistedDatasetSchema = z.strictObject({
  id: z.string().uuid(),
  status: datasetStatusSchema,
});

class BudgetImportRpcError extends Error {
  readonly transactionRolledBack: boolean;

  constructor(message: string, transactionRolledBack: boolean) {
    super(message);
    this.name = "BudgetImportRpcError";
    this.transactionRolledBack = transactionRolledBack;
  }
}

export type BudgetDatasetValidationResult = z.infer<
  typeof validationResultSchema
>;

export interface BudgetDatasetApplyResult {
  datasetId: string;
  alreadyImported: boolean;
  validation: BudgetDatasetValidationResult;
  metrics: {
    payloadBytes: number;
    storageArtifactCount: number;
    storageUploadedCount: number;
    storageReusedCount: number;
    storageDurationMs: number;
    importRpcDurationMs: number;
    validationRpcDurationMs: number;
    activationRpcDurationMs: number;
    totalDurationMs: number;
  };
}

type AdminClient = SupabaseClient;

export { assertSafeBudgetImportTarget } from "./budget-import-target";

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です`);
  }
  return value;
}

function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function uploadArtifact(
  client: AdminClient,
  artifact: BudgetImportArtifact
): Promise<boolean> {
  const bucket = client.storage.from(budgetDatasetStorageBucket);
  if (sha256Buffer(artifact.content) !== artifact.sha256) {
    throw new Error(
      `読み込み後に入力スナップショットが変更されました: ${artifact.logicalFileName}`
    );
  }
  const { error } = await bucket.upload(
    artifact.storageObjectPath,
    artifact.content,
    {
      contentType: artifact.contentType,
      upsert: false,
    }
  );

  if (!error) {
    return true;
  }

  const { data: existing, error: downloadError } = await bucket.download(
    artifact.storageObjectPath
  );
  if (!downloadError && existing) {
    const existingBuffer = Buffer.from(await existing.arrayBuffer());
    if (sha256Buffer(existingBuffer) === artifact.sha256) {
      return false;
    }
  }

  throw new Error(
    `Storageへの保存に失敗しました: ${artifact.logicalFileName}: ${error.message}`
  );
}

async function removeArtifacts(
  client: AdminClient,
  storageObjectPaths: string[]
): Promise<void> {
  if (storageObjectPaths.length === 0) {
    return;
  }
  const { error } = await client.storage
    .from(budgetDatasetStorageBucket)
    .remove(storageObjectPaths);
  if (error) {
    throw new Error(`Storageのロールバックに失敗しました: ${error.message}`);
  }
}

async function callImportRpc(
  client: AdminClient,
  payload: Json
): Promise<z.infer<typeof importResultSchema>> {
  const { data, error } = await client.rpc("import_budget_dataset", {
    p_payload: payload,
  });
  if (error) {
    const errorCode =
      typeof error.code === "string" ? error.code.toUpperCase() : "";
    throw new BudgetImportRpcError(
      `予算データのstaging投入に失敗しました: ${error.message}`,
      /^[0-9A-Z]{5}$/.test(errorCode)
    );
  }
  return importResultSchema.parse(data);
}

async function callValidationRpc(
  client: AdminClient,
  datasetId: string
): Promise<BudgetDatasetValidationResult> {
  const { data, error } = await client.rpc("validate_budget_dataset", {
    p_dataset_id: datasetId,
  });
  if (error) {
    throw new Error(`投入後検証に失敗しました: ${error.message}`);
  }
  return validationResultSchema.parse(data);
}

async function callActivationRpc(
  client: AdminClient,
  datasetId: string
): Promise<z.infer<typeof activationResultSchema>> {
  const { data, error } = await client.rpc("activate_budget_dataset", {
    p_dataset_id: datasetId,
  });
  if (error) {
    throw new Error(`active切替に失敗しました: ${error.message}`);
  }
  return activationResultSchema.parse(data);
}

async function findDatasetByManifestHash(
  client: AdminClient,
  manifestSha256: string
): Promise<z.infer<typeof persistedDatasetSchema> | undefined> {
  const { data, error } = await client
    .from("budget_datasets")
    .select("id, status")
    .eq("manifest_sha256", manifestSha256)
    .maybeSingle();
  if (error) {
    throw new Error(`既存datasetの確認に失敗しました: ${error.message}`);
  }
  return data === null ? undefined : persistedDatasetSchema.parse(data);
}

export async function applyPublicBudgetDataset(
  dataset: PublicBudgetDataset,
  client?: AdminClient
): Promise<BudgetDatasetApplyResult> {
  const totalStartedAt = performance.now();
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
  const adminClient = client ?? (createAdminClient() as AdminClient);

  const { payload, artifacts } = buildBudgetImportPayload(dataset);
  const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  const existingDataset = await findDatasetByManifestHash(
    adminClient,
    dataset.manifestSha256
  );
  if (existingDataset?.status === "archived") {
    throw new Error(
      "同じmanifestはarchivedとして既に存在するため再有効化しません"
    );
  }

  const newlyUploadedPaths: string[] = [];
  let storageReusedCount = 0;
  let importResult: z.infer<typeof importResultSchema> | undefined;
  let importRpcStarted = false;

  try {
    const storageStartedAt = performance.now();
    for (const artifact of artifacts) {
      if (await uploadArtifact(adminClient, artifact)) {
        newlyUploadedPaths.push(artifact.storageObjectPath);
      } else {
        storageReusedCount += 1;
      }
    }
    const storageDurationMs = performance.now() - storageStartedAt;

    importRpcStarted = true;
    const importRpcStartedAt = performance.now();
    importResult = await callImportRpc(adminClient, payload as unknown as Json);
    const importRpcDurationMs = performance.now() - importRpcStartedAt;
    const validationRpcStartedAt = performance.now();
    const validation = await callValidationRpc(
      adminClient,
      importResult.datasetId
    );
    const validationRpcDurationMs = performance.now() - validationRpcStartedAt;
    if (validation.status !== "PASS") {
      throw new Error(
        `stagingデータの検証がFAILです: ${JSON.stringify(validation.errors)}`
      );
    }

    if (importResult.status === "archived") {
      throw new Error(
        "同じmanifestはarchivedとして既に存在するため再有効化しません"
      );
    }
    const activationRpcStartedAt = performance.now();
    await callActivationRpc(adminClient, importResult.datasetId);
    const activationRpcDurationMs = performance.now() - activationRpcStartedAt;

    return {
      datasetId: importResult.datasetId,
      alreadyImported: importResult.alreadyImported,
      validation,
      metrics: {
        payloadBytes,
        storageArtifactCount: artifacts.length,
        storageUploadedCount: newlyUploadedPaths.length,
        storageReusedCount,
        storageDurationMs,
        importRpcDurationMs,
        validationRpcDurationMs,
        activationRpcDurationMs,
        totalDurationMs: performance.now() - totalStartedAt,
      },
    };
  } catch (error) {
    const rollbackErrors: string[] = [];
    const importOutcomeUnknown =
      importRpcStarted &&
      importResult === undefined &&
      !(error instanceof BudgetImportRpcError && error.transactionRolledBack);
    let removeUploadedArtifacts =
      existingDataset === undefined &&
      importResult === undefined &&
      !importOutcomeUnknown;

    if (removeUploadedArtifacts) {
      try {
        const persistedDataset = await findDatasetByManifestHash(
          adminClient,
          dataset.manifestSha256
        );
        if (persistedDataset !== undefined) {
          removeUploadedArtifacts = false;
        }
      } catch (cleanupError) {
        removeUploadedArtifacts = false;
        rollbackErrors.push(
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError)
        );
      }
    }
    if (removeUploadedArtifacts) {
      try {
        await removeArtifacts(adminClient, newlyUploadedPaths);
      } catch (cleanupError) {
        rollbackErrors.push(
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError)
        );
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    const retentionNote = importOutcomeUnknown
      ? "import結果が通信上不明なため、hash単位のStorageファイルは再実行用に保持しました"
      : importResult !== undefined
        ? "DB投入完了後の失敗のため、datasetとhash単位のStorageファイルは再実行・調査用に保持しました"
        : undefined;
    const notes = [
      retentionNote,
      ...rollbackErrors.map((rollbackError) => `rollback: ${rollbackError}`),
    ].filter((note): note is string => note !== undefined);
    throw new Error(
      notes.length === 0 ? message : `${message}; ${notes.join("; ")}`
    );
  }
}
