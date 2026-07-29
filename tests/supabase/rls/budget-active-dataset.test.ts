import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asJson,
  type BudgetTestDataset,
  cleanupBudgetTestDataset,
  createBudgetTestDataset,
} from "../budget-test-dataset";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  getAnonClient,
  getAuthenticatedClient,
} from "../utils";

const admin = adminClient as SupabaseClient;
const anon = getAnonClient() as SupabaseClient;

describe("budget dataset RLS", () => {
  let activeDataset: BudgetTestDataset;
  let stagingDataset: BudgetTestDataset;
  let activeDatasetId: string;
  let stagingDatasetId: string;
  let userId: string;
  let email: string;
  const password = "test-password-123";
  const storagePath = `rls/${crypto.randomUUID()}/test.json`;
  const serviceStoragePath = `rls/${crypto.randomUUID()}/service.json`;

  beforeAll(async () => {
    activeDataset = createBudgetTestDataset();
    stagingDataset = createBudgetTestDataset();
    const { data: activeImport, error: activeImportError } = await admin.rpc(
      "import_budget_dataset",
      { p_payload: asJson(activeDataset.builtImport.payload) }
    );
    if (activeImportError) {
      throw activeImportError;
    }
    activeDatasetId = (activeImport as { datasetId: string }).datasetId;
    const { error: activationError } = await admin.rpc(
      "activate_budget_dataset",
      { p_dataset_id: activeDatasetId }
    );
    if (activationError) {
      throw activationError;
    }

    const { data: stagingImport, error: stagingImportError } = await admin.rpc(
      "import_budget_dataset",
      { p_payload: asJson(stagingDataset.builtImport.payload) }
    );
    if (stagingImportError) {
      throw stagingImportError;
    }
    stagingDatasetId = (stagingImport as { datasetId: string }).datasetId;

    email = `budget-rls-${Date.now()}@example.com`;
    const user = await createTestUser(email, password);
    userId = user.id;
    const { error: storageError } = await admin.storage
      .from("budget-datasets")
      .upload(storagePath, JSON.stringify({ test: true }));
    if (storageError) {
      throw storageError;
    }
  });

  afterAll(async () => {
    await admin
      .from("budget_datasets")
      .delete()
      .in("id", [activeDatasetId, stagingDatasetId]);
    await admin.storage.from("budget-datasets").remove([storagePath]);
    await cleanupTestUser(userId);
    cleanupBudgetTestDataset(activeDataset);
    cleanupBudgetTestDataset(stagingDataset);
  });

  it("anonはactive datasetだけSELECTできる", async () => {
    const { data: active, error: activeError } = await anon
      .from("budget_program_identities")
      .select("budget_program_identity_id")
      .eq("dataset_id", activeDatasetId);
    const { data: staging, error: stagingError } = await anon
      .from("budget_program_identities")
      .select("budget_program_identity_id")
      .eq("dataset_id", stagingDatasetId);

    expect(activeError).toBeNull();
    expect(active).toHaveLength(1);
    expect(stagingError).toBeNull();
    expect(staging).toEqual([]);
  });

  it("authenticatedもactive datasetだけSELECTできる", async () => {
    const authenticated = (await getAuthenticatedClient(
      email,
      password
    )) as SupabaseClient;
    const { data: active, error: activeError } = await authenticated
      .from("budget_revenue_details")
      .select("revenue_detail_id")
      .eq("dataset_id", activeDatasetId);
    const { data: staging, error: stagingError } = await authenticated
      .from("budget_revenue_details")
      .select("revenue_detail_id")
      .eq("dataset_id", stagingDatasetId);

    expect(activeError).toBeNull();
    expect(active).toHaveLength(1);
    expect(stagingError).toBeNull();
    expect(staging).toEqual([]);
  });

  it("anon/authenticatedからの書き込みと全管理RPCを拒否する", async () => {
    const authenticated = (await getAuthenticatedClient(
      email,
      password
    )) as SupabaseClient;
    const insertRow = {
      fiscal_year: 2026,
      budget_type: "initial_budget",
      schema_version: "public-budget-v1",
      currency_unit: "thousand_yen",
      status: "staging",
      manifest_json: {},
      manifest_sha256: "a".repeat(64),
      import_summary_json: {},
      validation_status: "PENDING",
    };
    const { error: anonInsertError } = await anon
      .from("budget_datasets")
      .insert(insertRow);
    const { error: authenticatedInsertError } = await authenticated
      .from("budget_datasets")
      .insert({ ...insertRow, manifest_sha256: "b".repeat(64) });
    const deniedRpcCalls = await Promise.all(
      [anon, authenticated].flatMap((roleClient) => [
        roleClient.rpc("import_budget_dataset", { p_payload: {} }),
        roleClient.rpc("validate_budget_dataset", {
          p_dataset_id: activeDatasetId,
        }),
        roleClient.rpc("activate_budget_dataset", {
          p_dataset_id: activeDatasetId,
        }),
      ])
    );

    expect(anonInsertError).not.toBeNull();
    expect(authenticatedInsertError).not.toBeNull();
    expect(deniedRpcCalls.every((result) => result.error !== null)).toBe(true);

    const { error: serviceValidationError } = await admin.rpc(
      "validate_budget_dataset",
      { p_dataset_id: activeDatasetId }
    );
    const { error: serviceActivationError } = await admin.rpc(
      "activate_budget_dataset",
      { p_dataset_id: activeDatasetId }
    );
    expect(serviceValidationError).toBeNull();
    expect(serviceActivationError).toBeNull();
  });

  it("budget-datasets bucketは非公開でservice roleだけが操作できる", async () => {
    const authenticated = (await getAuthenticatedClient(
      email,
      password
    )) as SupabaseClient;
    const { data: bucket, error: bucketError } =
      await admin.storage.getBucket("budget-datasets");
    expect(bucketError).toBeNull();
    expect(bucket?.public).toBe(false);

    for (const [roleName, roleClient] of [
      ["anon", anon],
      ["authenticated", authenticated],
    ] as const) {
      const roleBucket = roleClient.storage.from("budget-datasets");
      const { data: listed, error: listError } = await roleBucket.list(
        storagePath.split("/").slice(0, -1).join("/")
      );
      const { error: downloadError } = await roleBucket.download(storagePath);
      const { error: uploadError } = await roleBucket.upload(
        `${storagePath}.${roleName}`,
        "{}"
      );
      const { error: updateError } = await roleBucket.update(storagePath, "{}");
      const { data: removed, error: removeError } = await roleBucket.remove([
        storagePath,
      ]);

      expect(
        listError !== null || listed?.length === 0,
        `${roleName}:list`
      ).toBe(true);
      expect(downloadError, `${roleName}:download`).not.toBeNull();
      expect(uploadError, `${roleName}:upload`).not.toBeNull();
      expect(updateError, `${roleName}:update`).not.toBeNull();
      expect(
        removeError !== null || removed?.length === 0,
        `${roleName}:remove`
      ).toBe(true);
    }

    const serviceBucket = admin.storage.from("budget-datasets");
    const { error: serviceUploadError } = await serviceBucket.upload(
      serviceStoragePath,
      JSON.stringify({ version: 1 })
    );
    const { error: serviceUpdateError } = await serviceBucket.update(
      serviceStoragePath,
      JSON.stringify({ version: 2 })
    );
    const { data: serviceDownload, error: serviceDownloadError } =
      await serviceBucket.download(serviceStoragePath);
    const { error: protectedObjectError } =
      await serviceBucket.download(storagePath);
    const { error: serviceRemoveError } = await serviceBucket.remove([
      serviceStoragePath,
    ]);

    expect(serviceUploadError).toBeNull();
    expect(serviceUpdateError).toBeNull();
    expect(serviceDownloadError).toBeNull();
    expect(await serviceDownload?.text()).toContain('"version":2');
    expect(protectedObjectError).toBeNull();
    expect(serviceRemoveError).toBeNull();
  });
});
