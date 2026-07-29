import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
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
const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "../..");

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
  it("CLIからSupabase clientとPostgRESTを経由して投入する", async () => {
    const testDataset = createBudgetTestDataset();
    testDatasets.push(testDataset);
    storagePaths.push(
      ...testDataset.builtImport.artifacts.map(
        (artifact) => artifact.storageObjectPath
      )
    );
    const { stdout, stderr } = await execFileAsync(
      path.join(repositoryRoot, "packages/seed/node_modules/.bin/tsx"),
      [
        path.join(
          repositoryRoot,
          "tests/supabase/helpers/run-budget-import-cli-fixture.ts"
        ),
        "--input-dir",
        testDataset.inputDirectory,
        "--apply",
      ],
      {
        cwd: repositoryRoot,
        env: process.env,
      }
    );

    expect(stderr).toBe("");
    expect(stdout).toContain("DB validation=PASS");
    const { data, error } = await client
      .from("budget_datasets")
      .select("id, status")
      .eq("manifest_sha256", testDataset.dataset.manifestSha256)
      .single();
    expect(error).toBeNull();
    expect(data?.status).toBe("active");
    if (data) {
      importedDatasetIds.push(data.id);
    }
  });

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

  it("import結果が通信上不明な場合はhash単位のStorageを保持する", async () => {
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
          return async (functionName: string) => {
            if (functionName === "import_budget_dataset") {
              return {
                data: null,
                error: { message: "simulated import response loss" },
              };
            }
            throw new Error(`unexpected RPC: ${functionName}`);
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as SupabaseClient;

    await expect(
      applyPublicBudgetDataset(testDataset.dataset, responseLossClient)
    ).rejects.toThrow("再実行用に保持しました");

    const { count } = await client
      .from("budget_datasets")
      .select("*", { count: "exact", head: true })
      .eq("manifest_sha256", testDataset.dataset.manifestSha256);
    expect(count).toBe(0);
    for (const artifact of testDataset.builtImport.artifacts) {
      const { data, error } = await client.storage
        .from("budget-datasets")
        .download(artifact.storageObjectPath);
      expect(error).toBeNull();
      expect(data?.size).toBeGreaterThan(0);
    }
  });

  it("読込後に原ファイルが変わっても検証済みバイト列だけを保存する", async () => {
    const testDataset = createBudgetTestDataset();
    testDatasets.push(testDataset);
    storagePaths.push(
      ...testDataset.builtImport.artifacts.map(
        (artifact) => artifact.storageObjectPath
      )
    );
    const programArtifact = testDataset.builtImport.artifacts.find(
      (artifact) => artifact.logicalFileName === "public_budget_programs.csv"
    );
    if (!programArtifact) {
      throw new Error("program artifact is missing");
    }
    fs.appendFileSync(programArtifact.filePath, "\nchanged", "utf8");

    const result = await applyPublicBudgetDataset(testDataset.dataset, client);
    importedDatasetIds.push(result.datasetId);
    const { data, error } = await client.storage
      .from("budget-datasets")
      .download(programArtifact.storageObjectPath);
    expect(error).toBeNull();
    const storedContent = Buffer.from(await data?.arrayBuffer());
    expect(createHash("sha256").update(storedContent).digest("hex")).toBe(
      programArtifact.sha256
    );
    expect(storedContent).toEqual(programArtifact.content);
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
