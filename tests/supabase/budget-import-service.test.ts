import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import { applyPublicBudgetDataset } from "../../packages/seed/budget/import-public-budget";
import {
  type BudgetTestDataset,
  cleanupBudgetTestDataset,
  createBudgetTestDataset,
} from "./budget-test-dataset";
import { adminClient } from "./utils";

const client = adminClient as SupabaseClient;
const testDatasets: BudgetTestDataset[] = [];
const importedDatasetIds: string[] = [];
const storagePaths: string[] = [];

afterEach(async () => {
  if (importedDatasetIds.length > 0) {
    await client
      .from("budget_datasets")
      .delete()
      .in("id", importedDatasetIds.splice(0));
  }
  if (storagePaths.length > 0) {
    await client.storage.from("budget-datasets").remove(storagePaths.splice(0));
  }
  for (const dataset of testDatasets.splice(0)) {
    cleanupBudgetTestDataset(dataset);
  }
});

describe("applyPublicBudgetDataset", () => {
  it("7ファイルを非公開Storageへ保存して冪等にactive化する", async () => {
    const testDataset = createBudgetTestDataset();
    testDatasets.push(testDataset);
    storagePaths.push(
      ...testDataset.builtImport.artifacts.map(
        (artifact) => artifact.storageObjectPath
      )
    );

    const first = await applyPublicBudgetDataset(testDataset.dataset, client);
    importedDatasetIds.push(first.datasetId);
    const second = await applyPublicBudgetDataset(testDataset.dataset, client);

    expect(first.alreadyImported).toBe(false);
    expect(second).toMatchObject({
      datasetId: first.datasetId,
      alreadyImported: true,
      validation: { status: "PASS" },
    });

    for (const artifact of testDataset.builtImport.artifacts) {
      const { data, error } = await client.storage
        .from("budget-datasets")
        .download(artifact.storageObjectPath);
      expect(error).toBeNull();
      expect(data?.size).toBeGreaterThan(0);
    }
  });

  it("DB投入失敗時は新規Storageファイルも削除する", async () => {
    const testDataset = createBudgetTestDataset();
    testDatasets.push(testDataset);
    testDataset.dataset.programs[0] = {
      ...testDataset.dataset.programs[0],
      budget_program_identity_id: "missing_identity",
    };

    await expect(
      applyPublicBudgetDataset(testDataset.dataset, client)
    ).rejects.toThrow("staging投入に失敗");

    for (const artifact of testDataset.builtImport.artifacts) {
      const { error } = await client.storage
        .from("budget-datasets")
        .download(artifact.storageObjectPath);
      expect(error).not.toBeNull();
    }
    const { count } = await client
      .from("budget_datasets")
      .select("*", { count: "exact", head: true })
      .eq("manifest_sha256", testDataset.dataset.manifestSha256);
    expect(count).toBe(0);
  });

  it("active化後の応答喪失ではactive datasetとStorageを保持する", async () => {
    const testDataset = createBudgetTestDataset();
    testDatasets.push(testDataset);
    storagePaths.push(
      ...testDataset.builtImport.artifacts.map(
        (artifact) => artifact.storageObjectPath
      )
    );

    const responseLossClient = new Proxy(client, {
      get(target, property) {
        if (property === "rpc") {
          return async (
            functionName: string,
            args: Record<string, unknown>
          ) => {
            const response = await target.rpc(functionName, args);
            if (
              functionName === "activate_budget_dataset" &&
              response.error === null
            ) {
              return {
                data: null,
                error: { message: "simulated activation response loss" },
              };
            }
            return response;
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as SupabaseClient;

    await expect(
      applyPublicBudgetDataset(testDataset.dataset, responseLossClient)
    ).rejects.toThrow("active切替に失敗");

    const { data: persisted, error: persistedError } = await client
      .from("budget_datasets")
      .select("id, status")
      .eq("manifest_sha256", testDataset.dataset.manifestSha256)
      .single();
    expect(persistedError).toBeNull();
    expect(persisted?.status).toBe("active");
    if (persisted) {
      importedDatasetIds.push(persisted.id);
    }

    for (const artifact of testDataset.builtImport.artifacts) {
      const { data, error } = await client.storage
        .from("budget-datasets")
        .download(artifact.storageObjectPath);
      expect(error).toBeNull();
      expect(data?.size).toBeGreaterThan(0);
    }
  });
});
