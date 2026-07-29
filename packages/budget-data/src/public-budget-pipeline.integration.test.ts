import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BUDGET_COMPLETE_BUILD_OUTPUTS,
  BUDGET_COMPLETE_BUILD_PHASES,
} from "./budget-complete-pipeline";
import {
  PUBLIC_BUDGET_PROGRAM_COLUMNS,
  PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
} from "./public-budget";
import {
  PUBLIC_BUDGET_BUILD_PHASES,
  PUBLIC_BUDGET_PHASE_ARTIFACT_SEQUENCE,
  PUBLIC_BUDGET_PRODUCTION_FILES,
} from "./public-budget-pipeline";
import type { PublicDatasetManifest } from "./public-dataset-manifest";

type CsvRow = Record<string, string>;

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const EXPECTED_CORE_HASHES = {
  "processed/budget_programs.csv":
    "6ae0a0fda94e2498be8749688cdab3427f3d1d54520b3e952152265672b81a27",
  "processed/budget_sections.csv":
    "5616dc3e29949fd8cf83128ea017b252f78587f8486d4091014d60ee7a1e2ad0",
  "processed/budget_items.csv":
    "a7edcf294bfd4256401ae396c63758f2fe28a0ffbd6fe26f3788fd35526b6822",
} as const;
const EXPECTED_PUBLIC_REVENUE_HASHES = {
  "processed/public/public_budget_revenue_details.csv":
    "80a44ea866e616c822a61818e7f4cdaabea18bed5cebf51d4e4a259c1417be0e",
  "processed/public/public_budget_revenue_items.json":
    "b89d0d0181931318ae6fd9f257bd2242e28c791d4a3a321cd7cdb1d241d29f81",
  "processed/public/public_budget_revenue_allocations.json":
    "cb1a35734936f89ce3be59de27f9f8b7b4be6b236298ff68a38b501f4c92fb1c",
} as const;
const EXPECTED_PUBLIC_MANIFEST_HASH =
  "dfe9e96084c67cad4bdbb80a0c44754f57cbffd7c686ae4bd2616aa172e9b1e7";

let identityRows: CsvRow[];
let programRows: CsvRow[];
let revenueDetailRows: CsvRow[];
let budgetItems: Array<Record<string, unknown>>;
let revenueItems: Array<Record<string, unknown>>;
let allocations: Array<Record<string, unknown>>;
let manifest: PublicDatasetManifest;
let manifestBytes: Buffer;

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseCsv(csvText: string): CsvRow[] {
  return parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as CsvRow[];
}

beforeAll(async () => {
  const [
    identitiesCsv,
    programsCsv,
    budgetItemsJson,
    revenueDetailsCsv,
    revenueItemsJson,
    allocationsJson,
    publicManifestJson,
  ] = await Promise.all([
    fs.readFile(
      path.join(
        repoRoot,
        "processed/public/public_budget_program_identities.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed/public/public_budget_programs.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed/public/public_budget_items.json"),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed/public/public_budget_revenue_details.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed/public/public_budget_revenue_items.json",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed/public/public_budget_revenue_allocations.json",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed/public/public_dataset_manifest.json",
      ),
    ),
  ]);
  identityRows = parseCsv(identitiesCsv);
  programRows = parseCsv(programsCsv);
  budgetItems = JSON.parse(budgetItemsJson) as Array<
    Record<string, unknown>
  >;
  revenueDetailRows = parseCsv(revenueDetailsCsv);
  revenueItems = JSON.parse(revenueItemsJson) as Array<
    Record<string, unknown>
  >;
  allocations = JSON.parse(allocationsJson) as Array<
    Record<string, unknown>
  >;
  manifestBytes = publicManifestJson;
  manifest = JSON.parse(publicManifestJson.toString("utf8"));
});

describe("Phase 32-C public build pipeline", () => {
  it("公開7成果物を指定順に生成し、統合build-allへ接続する", async () => {
    expect(PUBLIC_BUDGET_BUILD_PHASES.map((phase) => phase.script)).toEqual([
      "build:public",
      "build:public-program-identities",
      "build:public-revenue",
      "build:public-manifest",
    ]);
    expect(PUBLIC_BUDGET_PHASE_ARTIFACT_SEQUENCE).toEqual([
      "processed/public/public_budget_programs.csv",
      "processed/public/public_budget_items.json",
      "processed/public/public_budget_program_identities.csv",
      "processed/public/public_budget_revenue_details.csv",
      "processed/public/public_budget_revenue_items.json",
      "processed/public/public_budget_revenue_allocations.json",
      "processed/public/public_dataset_manifest.json",
    ]);
    expect(BUDGET_COMPLETE_BUILD_PHASES.map((phase) => phase.script)).toEqual([
      "build:programs",
      "build:raw-sections:general",
      "build:raw-sections:special",
      "build:sections",
      "build:items",
      "validate:all",
      "build:revenue-all",
    ]);
    expect(BUDGET_COMPLETE_BUILD_OUTPUTS).toEqual(
      expect.arrayContaining([
        ...PUBLIC_BUDGET_PRODUCTION_FILES,
        "processed/public/public_dataset_manifest.json",
      ]),
    );

    const rootPackage = JSON.parse(
      await fs.readFile(path.join(repoRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(rootPackage.scripts["budget:public"]).toContain(
      "build:public-all",
    );
    expect(rootPackage.scripts["budget:build-all"]).toContain(
      "build:complete",
    );
    expect(rootPackage.scripts).toHaveProperty(
      "budget:public:program-identities",
    );
    expect(rootPackage.scripts).toHaveProperty("budget:public:manifest");
  });

  it("公開identityとprogram・allocationの参照を全件解決する", () => {
    expect(identityRows).toHaveLength(1_156);
    const identityIds = new Set(
      identityRows.map((row) => row.budget_program_identity_id),
    );
    expect(identityIds.size).toBe(identityRows.length);
    expect(
      identityRows.reduce(
        (total, row) => total + Number(row.amount_thousand_yen),
        0,
      ),
    ).toBe(621_033_664);
    expect(
      programRows.filter(
        (row) => !identityIds.has(row.budget_program_identity_id),
      ),
    ).toHaveLength(0);
    expect(
      allocations.filter(
        (allocation) =>
          !identityIds.has(
            String(allocation.targetBudgetProgramIdentityId),
          ),
      ),
    ).toHaveLength(0);
  });

  it("公開manifestが6ファイルのhash・件数・検証値を保持する", async () => {
    expect(manifest.publicFiles).toHaveLength(6);
    for (const file of manifest.publicFiles) {
      const bytes = await fs.readFile(path.join(repoRoot, file.path));
      expect(file.sha256).toBe(sha256(bytes));
      if (file.format === "csv") {
        const table = parse(bytes.toString("utf8"), {
          bom: true,
          relax_column_count: false,
          skip_empty_lines: true,
        }) as string[][];
        expect(file.rowCount).toBe(table.length - 1);
        expect(file.columnCount).toBe(table[0]?.length);
      } else {
        expect(file.itemCount).toBe(
          (JSON.parse(bytes.toString("utf8")) as unknown[]).length,
        );
      }
    }
    expect(manifest.totals).toEqual({
      expenditureTotalAmountThousandYen: 621_033_664,
      revenueTotalAmountThousandYen: 621_033_664,
    });
    expect(manifest.counts).toMatchObject({
      publicBudgetRevenueAllocationCount: 1_948,
      exactGroupAllocationCount: 1_909,
      publicIdentityAllocationCount: 39,
      allocationAmountNonNullCount: 0,
    });
    expect(manifest.validation).toEqual({
      status: "PASS",
      errors: [],
    });
    expect(sha256(manifestBytes)).toBe(EXPECTED_PUBLIC_MANIFEST_HASH);
  });

  it("既存コアと公開歳入3ファイルのhash・件数を維持する", async () => {
    for (const [relativePath, expectedHash] of Object.entries(
      EXPECTED_CORE_HASHES,
    )) {
      expect(
        sha256(await fs.readFile(path.join(repoRoot, relativePath))),
      ).toBe(expectedHash);
    }
    for (const [relativePath, expectedHash] of Object.entries(
      EXPECTED_PUBLIC_REVENUE_HASHES,
    )) {
      expect(
        sha256(await fs.readFile(path.join(repoRoot, relativePath))),
      ).toBe(expectedHash);
    }
    expect(revenueDetailRows).toHaveLength(2_192);
    expect(revenueItems).toHaveLength(175);
    expect(allocations).toHaveLength(1_948);
    expect(budgetItems).toHaveLength(190);
  });

  it("public programsの既存20列を変えずidentity列だけを末尾に保つ", () => {
    expect(Object.keys(programRows[0] ?? {})).toEqual(
      PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
    );
    const strippedCsv = stringify(programRows, {
      columns: [...PUBLIC_BUDGET_PROGRAM_COLUMNS],
      header: true,
      record_delimiter: "unix",
    });
    expect(sha256(strippedCsv)).toBe(
      "63e0ee7f683cad3eb14230a3da0522a6380b20db0c178cf6f28431369fc1e925",
    );
  });
});
