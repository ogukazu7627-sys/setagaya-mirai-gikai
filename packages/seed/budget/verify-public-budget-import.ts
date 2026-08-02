import { createHash } from "node:crypto";
import { createAdminClient } from "@mirai-gikai/supabase";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  budgetDatasetStorageBucket,
  buildBudgetImportPayload,
  buildBudgetDatasetStoragePrefix,
} from "./build-budget-import-payload";
import { assertSafeBudgetImportTarget } from "./budget-import-target";
import type { PublicBudgetDataset } from "./read-public-budget-files";

const validationResultSchema = z.strictObject({
  datasetId: z.string().uuid(),
  status: z.enum(["PASS", "FAIL"]),
  errors: z.array(z.unknown()),
  counts: z.record(z.string(), z.number()),
  totals: z.record(z.string(), z.number()),
  accountTotals: z.array(z.record(z.string(), z.unknown())),
});

const datasetRowSchema = z.strictObject({
  id: z.string().uuid(),
  fiscal_year: z.number(),
  budget_type: z.string(),
  status: z.enum(["staging", "active", "archived"]),
  validation_status: z.enum(["PENDING", "PASS", "FAIL"]),
  manifest_sha256: z.string(),
});

const pageSize = 1_000;

interface VerificationIssue {
  code: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface PersistedBudgetVerificationResult {
  status: "PASS" | "FAIL";
  datasetId?: string;
  manifestSha256: string;
  issues: VerificationIssue[];
  counts: Record<string, number>;
  totals: Record<string, number>;
  references: Record<string, number>;
  storage: {
    bucketPublic: boolean | null;
    objectCount: number;
    verifiedHashCount: number;
    anonDownloadDenied: boolean | null;
  };
  sameFiscalYearDatasetCount: number;
  activeDatasetCount: number;
}

type AdminClient = SupabaseClient;

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です`);
  }
  return value;
}

function check(
  issues: VerificationIssue[],
  code: string,
  message: string,
  expected: unknown,
  actual: unknown
): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    issues.push({ code, message, expected, actual });
  }
}

async function fetchRows(
  client: AdminClient,
  table: string,
  columns: string,
  datasetId: string
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .eq("dataset_id", datasetId)
      .range(offset, offset + pageSize - 1);
    if (error) {
      throw new Error(`${table} の検証取得に失敗しました: ${error.message}`);
    }
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < pageSize) {
      return rows;
    }
  }
}

function missingReferenceCount(
  rows: Record<string, unknown>[],
  field: string,
  targets: Set<string>
): number {
  return rows.filter((row) => {
    const value = row[field];
    return typeof value !== "string" || !targets.has(value);
  }).length;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export async function verifyPersistedPublicBudgetDataset(
  dataset: PublicBudgetDataset,
  client?: AdminClient
): Promise<PersistedBudgetVerificationResult> {
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

  const admin = client ?? (createAdminClient() as AdminClient);
  const issues: VerificationIssue[] = [];
  const { payload, artifacts } = buildBudgetImportPayload(dataset);

  const { data: sameFiscalYearRows, error: datasetListError } = await admin
    .from("budget_datasets")
    .select(
      "id,fiscal_year,budget_type,status,validation_status,manifest_sha256"
    )
    .eq("fiscal_year", dataset.manifest.fiscalYear)
    .eq("budget_type", dataset.manifest.budgetType);
  if (datasetListError) {
    throw new Error(
      `dataset一覧の確認に失敗しました: ${datasetListError.message}`
    );
  }
  const datasets = z.array(datasetRowSchema).parse(sameFiscalYearRows ?? []);
  const targetDatasets = datasets.filter(
    (row) => row.manifest_sha256 === dataset.manifestSha256
  );
  const activeDatasets = datasets.filter((row) => row.status === "active");
  const expectedDatasetCountValue = process.env.BUDGET_EXPECT_DATASET_COUNT;
  if (expectedDatasetCountValue !== undefined) {
    const expectedDatasetCount = Number(expectedDatasetCountValue);
    if (
      !Number.isSafeInteger(expectedDatasetCount) ||
      expectedDatasetCount < 0
    ) {
      throw new Error("BUDGET_EXPECT_DATASET_COUNT が有効な整数ではありません");
    }
    check(
      issues,
      "FISCAL_YEAR_DATASET_COUNT",
      "同年度・予算種別のdataset件数",
      expectedDatasetCount,
      datasets.length
    );
  }
  check(
    issues,
    "TARGET_DATASET_COUNT",
    "manifest hashに対応するdatasetは1件である必要があります",
    1,
    targetDatasets.length
  );
  check(
    issues,
    "ACTIVE_DATASET_COUNT",
    "同年度・予算種別のactive datasetは1件である必要があります",
    1,
    activeDatasets.length
  );

  const target = targetDatasets[0];
  if (!target) {
    return {
      status: "FAIL",
      manifestSha256: dataset.manifestSha256,
      issues,
      counts: {},
      totals: {},
      references: {},
      storage: {
        bucketPublic: null,
        objectCount: 0,
        verifiedHashCount: 0,
        anonDownloadDenied: null,
      },
      sameFiscalYearDatasetCount: datasets.length,
      activeDatasetCount: activeDatasets.length,
    };
  }

  check(
    issues,
    "DATASET_STATUS",
    "対象datasetはactiveである必要があります",
    "active",
    target.status
  );
  check(
    issues,
    "DATASET_VALIDATION",
    "対象datasetはPASSである必要があります",
    "PASS",
    target.validation_status
  );
  check(
    issues,
    "ACTIVE_DATASET_ID",
    "active datasetは対象manifestである必要があります",
    target.id,
    activeDatasets[0]?.id
  );

  const { data: validationData, error: validationError } = await admin.rpc(
    "validate_budget_dataset",
    { p_dataset_id: target.id }
  );
  if (validationError) {
    throw new Error(`DB検証RPCに失敗しました: ${validationError.message}`);
  }
  const validation = validationResultSchema.parse(validationData);
  check(
    issues,
    "DB_VALIDATION_STATUS",
    "DB検証RPCはPASSである必要があります",
    "PASS",
    validation.status
  );
  check(
    issues,
    "DB_VALIDATION_ERRORS",
    "DB検証エラーは0件である必要があります",
    0,
    validation.errors.length
  );

  const tableColumns = {
    budget_program_identities:
      "budget_program_identity_id,budget_item_key,amount_thousand_yen",
    budget_programs:
      "program_id,budget_program_identity_id,budget_item_key,amount_thousand_yen",
    budget_items: "budget_item_key,amount_thousand_yen",
    budget_item_sections: "section_id,budget_item_key,amount_thousand_yen",
    budget_revenue_items: "revenue_item_key,current_amount_thousand_yen",
    budget_revenue_sections:
      "revenue_section_id,revenue_item_key,current_amount_thousand_yen",
    budget_revenue_details:
      "revenue_detail_id,revenue_section_id,current_amount_thousand_yen",
    budget_revenue_allocations:
      "allocation_link_id,revenue_detail_id,target_budget_program_identity_id,target_budget_item_key,allocation_amount_thousand_yen,target_resolution_level",
    budget_source_documents:
      "source_file,source_type,storage_object_path,sha256",
  } as const;

  const entries = await Promise.all(
    Object.entries(tableColumns).map(async ([table, columns]) => [
      table,
      await fetchRows(admin, table, columns, target.id),
    ])
  );
  const rows = Object.fromEntries(entries) as Record<
    keyof typeof tableColumns,
    Record<string, unknown>[]
  >;

  const expectedCounts = {
    budget_program_identities: dataset.programIdentities.length,
    budget_programs: dataset.programs.length,
    budget_items: dataset.budgetItems.length,
    budget_item_sections: payload.budget_item_sections.length,
    budget_revenue_items: dataset.revenueItems.length,
    budget_revenue_sections: payload.budget_revenue_sections.length,
    budget_revenue_details: dataset.revenueDetails.length,
    budget_revenue_allocations: dataset.revenueAllocations.length,
    budget_source_documents: payload.budget_source_documents.length,
  };
  const counts = Object.fromEntries(
    Object.entries(rows).map(([table, tableRows]) => [table, tableRows.length])
  );
  for (const [table, expected] of Object.entries(expectedCounts)) {
    check(
      issues,
      `COUNT_${table.toUpperCase()}`,
      `${table}の件数`,
      expected,
      counts[table]
    );
  }

  const amount = (row: Record<string, unknown>, field: string) => {
    const value = row[field];
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
      throw new Error(`${field} が安全な整数ではありません`);
    }
    return value;
  };
  const totals = {
    expenditure: sum(
      rows.budget_items.map((row) => amount(row, "amount_thousand_yen"))
    ),
    revenue: sum(
      rows.budget_revenue_items.map((row) =>
        amount(row, "current_amount_thousand_yen")
      )
    ),
  };
  check(
    issues,
    "EXPENDITURE_TOTAL",
    "歳出合計",
    dataset.manifest.totals.expenditureTotalAmountThousandYen,
    totals.expenditure
  );
  check(
    issues,
    "REVENUE_TOTAL",
    "歳入合計",
    dataset.manifest.totals.revenueTotalAmountThousandYen,
    totals.revenue
  );

  const identityIds = new Set(
    rows.budget_program_identities.map((row) =>
      String(row.budget_program_identity_id)
    )
  );
  const budgetItemKeys = new Set(
    rows.budget_items.map((row) => String(row.budget_item_key))
  );
  const revenueItemKeys = new Set(
    rows.budget_revenue_items.map((row) => String(row.revenue_item_key))
  );
  const revenueSectionIds = new Set(
    rows.budget_revenue_sections.map((row) => String(row.revenue_section_id))
  );
  const revenueDetailIds = new Set(
    rows.budget_revenue_details.map((row) => String(row.revenue_detail_id))
  );
  const references = {
    programIdentityMissing: missingReferenceCount(
      rows.budget_programs,
      "budget_program_identity_id",
      identityIds
    ),
    programBudgetItemMissing: missingReferenceCount(
      rows.budget_programs,
      "budget_item_key",
      budgetItemKeys
    ),
    sectionBudgetItemMissing: missingReferenceCount(
      rows.budget_item_sections,
      "budget_item_key",
      budgetItemKeys
    ),
    revenueSectionItemMissing: missingReferenceCount(
      rows.budget_revenue_sections,
      "revenue_item_key",
      revenueItemKeys
    ),
    revenueDetailSectionMissing: missingReferenceCount(
      rows.budget_revenue_details,
      "revenue_section_id",
      revenueSectionIds
    ),
    allocationRevenueDetailMissing: missingReferenceCount(
      rows.budget_revenue_allocations,
      "revenue_detail_id",
      revenueDetailIds
    ),
    allocationIdentityMissing: missingReferenceCount(
      rows.budget_revenue_allocations,
      "target_budget_program_identity_id",
      identityIds
    ),
    allocationBudgetItemMissing: missingReferenceCount(
      rows.budget_revenue_allocations,
      "target_budget_item_key",
      budgetItemKeys
    ),
    allocationAmountNonNull: rows.budget_revenue_allocations.filter(
      (row) => row.allocation_amount_thousand_yen !== null
    ).length,
  };
  for (const [name, count] of Object.entries(references)) {
    check(
      issues,
      `REFERENCE_${name.toUpperCase()}`,
      `${name}は0件である必要があります`,
      0,
      count
    );
  }

  const { data: bucket, error: bucketError } = await admin.storage.getBucket(
    budgetDatasetStorageBucket
  );
  if (bucketError || !bucket) {
    throw new Error(
      `Storage bucketの確認に失敗しました: ${bucketError?.message}`
    );
  }
  check(
    issues,
    "STORAGE_BUCKET_PRIVATE",
    "Storage bucketは非公開である必要があります",
    false,
    bucket.public
  );
  const prefix = buildBudgetDatasetStoragePrefix(dataset);
  const { data: objects, error: listError } = await admin.storage
    .from(budgetDatasetStorageBucket)
    .list(prefix, { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (listError) {
    throw new Error(
      `Storage object一覧の確認に失敗しました: ${listError.message}`
    );
  }
  const actualNames = (objects ?? []).map((object) => object.name).sort();
  const expectedNames = artifacts
    .map((artifact) => artifact.logicalFileName)
    .sort();
  check(
    issues,
    "STORAGE_OBJECT_NAMES",
    "Storageには検証済み7ファイルだけが必要です",
    expectedNames,
    actualNames
  );

  let verifiedHashCount = 0;
  for (const artifact of artifacts) {
    const { data, error } = await admin.storage
      .from(budgetDatasetStorageBucket)
      .download(artifact.storageObjectPath);
    if (error || !data) {
      issues.push({
        code: "STORAGE_DOWNLOAD",
        message: `${artifact.logicalFileName}を取得できません`,
        expected: artifact.sha256,
        actual: error?.message,
      });
      continue;
    }
    const actualHash = createHash("sha256")
      .update(Buffer.from(await data.arrayBuffer()))
      .digest("hex");
    check(
      issues,
      "STORAGE_HASH",
      `${artifact.logicalFileName}のSHA-256`,
      artifact.sha256,
      actualHash
    );
    if (actualHash === artifact.sha256) {
      verifiedHashCount += 1;
    }
  }

  let anonDownloadDenied: boolean | null = null;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (anonKey) {
    const anon = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.storage
      .from(budgetDatasetStorageBucket)
      .download(artifacts[0].storageObjectPath);
    anonDownloadDenied = error !== null && data === null;
    check(
      issues,
      "STORAGE_ANON_DENIED",
      "anonからStorageを取得できないこと",
      true,
      anonDownloadDenied
    );
  } else if (process.env.BUDGET_IMPORT_ENVIRONMENT === "production") {
    issues.push({
      code: "STORAGE_ANON_KEY_MISSING",
      message: "本番検証にはSUPABASE_ANON_KEYが必要です",
    });
  }

  return {
    status: issues.length === 0 ? "PASS" : "FAIL",
    datasetId: target.id,
    manifestSha256: dataset.manifestSha256,
    issues,
    counts,
    totals,
    references,
    storage: {
      bucketPublic: bucket.public,
      objectCount: actualNames.length,
      verifiedHashCount,
      anonDownloadDenied,
    },
    sameFiscalYearDatasetCount: datasets.length,
    activeDatasetCount: activeDatasets.length,
  };
}
