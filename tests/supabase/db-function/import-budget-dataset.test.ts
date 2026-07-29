import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import {
  asJson,
  type BudgetTestDataset,
  cleanupBudgetTestDataset,
  createBudgetTestDataset,
} from "../budget-test-dataset";
import { adminClient } from "../utils";

const client = adminClient as SupabaseClient;
const testDatasets: BudgetTestDataset[] = [];
const importedDatasetIds: string[] = [];

afterEach(async () => {
  if (importedDatasetIds.length > 0) {
    await client
      .from("budget_datasets")
      .delete()
      .in("id", importedDatasetIds.splice(0));
  }
  for (const dataset of testDatasets.splice(0)) {
    cleanupBudgetTestDataset(dataset);
  }
});

async function importDataset(testDataset: BudgetTestDataset) {
  const { data, error } = await client.rpc("import_budget_dataset", {
    p_payload: asJson(testDataset.builtImport.payload),
  });
  if (error) {
    throw error;
  }
  const result = data as {
    datasetId: string;
    status: "staging" | "active" | "archived";
    alreadyImported: boolean;
  };
  if (!importedDatasetIds.includes(result.datasetId)) {
    importedDatasetIds.push(result.datasetId);
  }
  return result;
}

describe("budget dataset RPC", () => {
  it("stagingへ一括投入し、検証後にactiveへ切り替える", async () => {
    const testDataset = createBudgetTestDataset();
    testDatasets.push(testDataset);

    const imported = await importDataset(testDataset);
    expect(imported).toMatchObject({
      status: "staging",
      alreadyImported: false,
    });

    const { data: validation, error: validationError } = await client.rpc(
      "validate_budget_dataset",
      { p_dataset_id: imported.datasetId }
    );
    expect(validationError).toBeNull();
    expect(validation).toMatchObject({
      datasetId: imported.datasetId,
      status: "PASS",
      counts: {
        budgetProgramIdentityCount: 1,
        budgetProgramCount: 1,
        budgetItemCount: 1,
        budgetItemSectionCount: 1,
        budgetRevenueItemCount: 1,
        budgetRevenueSectionCount: 1,
        budgetRevenueDetailCount: 1,
        budgetRevenueAllocationCount: 1,
      },
      totals: {
        budgetItemAmountThousandYen: 100,
        budgetItemSectionAmountThousandYen: 100,
        revenueItemAmountThousandYen: 100,
        revenueSectionAmountThousandYen: 100,
        revenueDetailAmountThousandYen: 100,
      },
    });

    const { data: activated, error: activationError } = await client.rpc(
      "activate_budget_dataset",
      { p_dataset_id: imported.datasetId }
    );
    expect(activationError).toBeNull();
    expect(activated).toMatchObject({
      datasetId: imported.datasetId,
      status: "active",
      alreadyActive: false,
    });
  });

  it("同じmanifestの再実行で行を重複させない", async () => {
    const testDataset = createBudgetTestDataset();
    testDatasets.push(testDataset);
    const first = await importDataset(testDataset);
    await client.rpc("activate_budget_dataset", {
      p_dataset_id: first.datasetId,
    });

    const second = await importDataset(testDataset);
    expect(second).toEqual({
      datasetId: first.datasetId,
      status: "active",
      alreadyImported: true,
    });

    const { count } = await client
      .from("budget_programs")
      .select("*", { count: "exact", head: true })
      .eq("dataset_id", first.datasetId);
    expect(count).toBe(1);
  });

  it("新しいactive化と旧datasetのarchived化を同時に行う", async () => {
    const firstDataset = createBudgetTestDataset();
    const secondDataset = createBudgetTestDataset();
    testDatasets.push(firstDataset, secondDataset);
    const first = await importDataset(firstDataset);
    await client.rpc("activate_budget_dataset", {
      p_dataset_id: first.datasetId,
    });
    const second = await importDataset(secondDataset);
    await client.rpc("activate_budget_dataset", {
      p_dataset_id: second.datasetId,
    });

    const { data } = await client
      .from("budget_datasets")
      .select("id, status")
      .in("id", [first.datasetId, second.datasetId])
      .order("status");

    expect(data).toEqual(
      expect.arrayContaining([
        { id: first.datasetId, status: "archived" },
        { id: second.datasetId, status: "active" },
      ])
    );
  });

  it("金額検証に失敗した場合はトランザクション全体を戻す", async () => {
    const testDataset = createBudgetTestDataset();
    testDatasets.push(testDataset);
    testDataset.builtImport.payload.budget_programs[0] = {
      ...testDataset.builtImport.payload.budget_programs[0],
      amount_thousand_yen: 99,
    };

    const { error } = await client.rpc("import_budget_dataset", {
      p_payload: asJson(testDataset.builtImport.payload),
    });
    expect(error).not.toBeNull();

    const { count } = await client
      .from("budget_datasets")
      .select("*", { count: "exact", head: true })
      .eq("manifest_sha256", testDataset.builtImport.payload.manifest_sha256);
    expect(count).toBe(0);
  });

  it("外部キー不一致の場合はトランザクション全体を戻す", async () => {
    const testDataset = createBudgetTestDataset();
    testDatasets.push(testDataset);
    testDataset.builtImport.payload.budget_programs[0] = {
      ...testDataset.builtImport.payload.budget_programs[0],
      budget_program_identity_id: "missing_identity",
    };

    const { error } = await client.rpc("import_budget_dataset", {
      p_payload: asJson(testDataset.builtImport.payload),
    });
    expect(error).not.toBeNull();

    const { count } = await client
      .from("budget_datasets")
      .select("*", { count: "exact", head: true })
      .eq("manifest_sha256", testDataset.builtImport.payload.manifest_sha256);
    expect(count).toBe(0);
  });
});
