import { createHash } from "node:crypto";
import fs from "node:fs";
import { createAdminClient, type Json } from "@mirai-gikai/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  type BudgetImportArtifact,
  budgetDatasetStorageBucket,
  buildBudgetImportPayload,
} from "./build-budget-import-payload";
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

export type BudgetDatasetValidationResult = z.infer<
  typeof validationResultSchema
>;

export interface BudgetDatasetApplyResult {
  datasetId: string;
  alreadyImported: boolean;
  validation: BudgetDatasetValidationResult;
}

export interface BudgetImportEnvironment {
  supabaseUrl: string;
  environmentName?: string;
}

type AdminClient = SupabaseClient;

export function assertSafeBudgetImportTarget({
  supabaseUrl,
  environmentName,
}: BudgetImportEnvironment): void {
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
    throw new Error("本番Supabaseへの予算データ投入は禁止されています");
  }
  if (!isLocal && environmentName !== "validation") {
    throw new Error(
      "リモート環境へ投入する場合は BUDGET_IMPORT_ENVIRONMENT=validation が必要です"
    );
  }
}

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
  const content = fs.readFileSync(artifact.filePath);
  const { error } = await bucket.upload(artifact.storageObjectPath, content, {
    contentType: artifact.contentType,
    upsert: false,
  });

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
    throw new Error(`予算データのstaging投入に失敗しました: ${error.message}`);
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

async function cleanupNewDataset(
  client: AdminClient,
  datasetId: string
): Promise<boolean> {
  const { data, error } = await client
    .from("budget_datasets")
    .delete()
    .eq("id", datasetId)
    .eq("status", "staging")
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(
      `stagingデータのロールバックに失敗しました: ${error.message}`
    );
  }
  return data !== null;
}

export async function applyPublicBudgetDataset(
  dataset: PublicBudgetDataset,
  client?: AdminClient
): Promise<BudgetDatasetApplyResult> {
  const supabaseUrl = requireEnvironment("SUPABASE_URL");
  requireEnvironment("SUPABASE_SECRET_KEY");
  assertSafeBudgetImportTarget({
    supabaseUrl,
    environmentName: process.env.BUDGET_IMPORT_ENVIRONMENT,
  });
  const adminClient = client ?? (createAdminClient() as AdminClient);

  const { payload, artifacts } = buildBudgetImportPayload(dataset);
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
  let importResult: z.infer<typeof importResultSchema> | undefined;

  try {
    for (const artifact of artifacts) {
      if (await uploadArtifact(adminClient, artifact)) {
        newlyUploadedPaths.push(artifact.storageObjectPath);
      }
    }

    importResult = await callImportRpc(adminClient, payload as unknown as Json);
    const validation = await callValidationRpc(
      adminClient,
      importResult.datasetId
    );
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
    await callActivationRpc(adminClient, importResult.datasetId);

    return {
      datasetId: importResult.datasetId,
      alreadyImported: importResult.alreadyImported,
      validation,
    };
  } catch (error) {
    const rollbackErrors: string[] = [];
    let removeUploadedArtifacts = existingDataset === undefined;

    if (removeUploadedArtifacts) {
      try {
        const persistedDataset = await findDatasetByManifestHash(
          adminClient,
          dataset.manifestSha256
        );
        if (
          persistedDataset?.status === "staging" &&
          importResult?.alreadyImported === false &&
          persistedDataset.id === importResult.datasetId
        ) {
          removeUploadedArtifacts = await cleanupNewDataset(
            adminClient,
            persistedDataset.id
          );
        } else if (persistedDataset !== undefined) {
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
    throw new Error(
      rollbackErrors.length === 0
        ? message
        : `${message}; rollback: ${rollbackErrors.join("; ")}`
    );
  }
}
