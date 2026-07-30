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

  it("同じ外部IDを持つ改訂版を共存させ、dataset単位でactiveを切り替える", async () => {
    const firstDataset = createBudgetTestDataset();
    const secondDataset = createBudgetTestDataset();
    testDatasets.push(firstDataset, secondDataset);

    expect(
      firstDataset.builtImport.payload.budget_programs[0]?.program_id
    ).toBe(secondDataset.builtImport.payload.budget_programs[0]?.program_id);
    expect(
      firstDataset.builtImport.payload.budget_program_identities[0]
        ?.budget_program_identity_id
    ).toBe(
      secondDataset.builtImport.payload.budget_program_identities[0]
        ?.budget_program_identity_id
    );
    expect(
      firstDataset.builtImport.payload.budget_items[0]?.budget_item_key
    ).toBe(secondDataset.builtImport.payload.budget_items[0]?.budget_item_key);

    const first = await importDataset(firstDataset);
    const { error: firstActivationError } = await client.rpc(
      "activate_budget_dataset",
      {
        p_dataset_id: first.datasetId,
      }
    );
    expect(firstActivationError).toBeNull();

    const second = await importDataset(secondDataset);
    expect(second.status).toBe("staging");

    const expectedCounts = new Map<string, number>([
      [
        "budget_program_identities",
        firstDataset.builtImport.payload.budget_program_identities.length,
      ],
      [
        "budget_programs",
        firstDataset.builtImport.payload.budget_programs.length,
      ],
      ["budget_items", firstDataset.builtImport.payload.budget_items.length],
      [
        "budget_item_sections",
        firstDataset.builtImport.payload.budget_item_sections.length,
      ],
      [
        "budget_revenue_items",
        firstDataset.builtImport.payload.budget_revenue_items.length,
      ],
      [
        "budget_revenue_sections",
        firstDataset.builtImport.payload.budget_revenue_sections.length,
      ],
      [
        "budget_revenue_details",
        firstDataset.builtImport.payload.budget_revenue_details.length,
      ],
      [
        "budget_revenue_allocations",
        firstDataset.builtImport.payload.budget_revenue_allocations.length,
      ],
      [
        "budget_source_documents",
        firstDataset.builtImport.payload.budget_source_documents.length,
      ],
    ]);
    for (const [tableName, expectedCount] of expectedCounts) {
      for (const datasetId of [first.datasetId, second.datasetId]) {
        const { count, error } = await client
          .from(tableName)
          .select("*", { count: "exact", head: true })
          .eq("dataset_id", datasetId);
        expect(error, `${tableName}:${datasetId}`).toBeNull();
        expect(count, `${tableName}:${datasetId}`).toBe(expectedCount);
      }
    }

    const { data: programs, error: programsError } = await client
      .from("budget_programs")
      .select("dataset_id, program_id, budget_program_identity_id")
      .in("dataset_id", [first.datasetId, second.datasetId]);
    expect(programsError).toBeNull();
    expect(programs).toEqual(
      expect.arrayContaining([
        {
          dataset_id: first.datasetId,
          program_id: "program_test",
          budget_program_identity_id: "bpi_test",
        },
        {
          dataset_id: second.datasetId,
          program_id: "program_test",
          budget_program_identity_id: "bpi_test",
        },
      ])
    );

    const { error: secondActivationError } = await client.rpc(
      "activate_budget_dataset",
      {
        p_dataset_id: second.datasetId,
      }
    );
    expect(secondActivationError).toBeNull();

    const { data, error: statusError } = await client
      .from("budget_datasets")
      .select("id, status")
      .in("id", [first.datasetId, second.datasetId]);
    expect(statusError).toBeNull();
    expect(data).toEqual(
      expect.arrayContaining([
        { id: first.datasetId, status: "archived" },
        { id: second.datasetId, status: "active" },
      ])
    );
    expect(data?.filter((dataset) => dataset.status === "active")).toHaveLength(
      1
    );
  });

  it("同一年度・予算種別を並行active化してもactiveは1件になる", async () => {
    const firstDataset = createBudgetTestDataset();
    const secondDataset = createBudgetTestDataset();
    testDatasets.push(firstDataset, secondDataset);
    const first = await importDataset(firstDataset);
    const second = await importDataset(secondDataset);

    const activationResults = await Promise.all([
      client.rpc("activate_budget_dataset", {
        p_dataset_id: first.datasetId,
      }),
      client.rpc("activate_budget_dataset", {
        p_dataset_id: second.datasetId,
      }),
    ]);
    expect(activationResults.every((result) => result.error === null)).toBe(
      true
    );

    const { data, error } = await client
      .from("budget_datasets")
      .select("id, status")
      .in("id", [first.datasetId, second.datasetId]);

    expect(error).toBeNull();
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "archived" }),
        expect.objectContaining({ status: "active" }),
      ])
    );
    expect(data?.filter((dataset) => dataset.status === "active")).toHaveLength(
      1
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
