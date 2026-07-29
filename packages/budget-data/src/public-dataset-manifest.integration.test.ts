import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildPublicDatasetManifest,
  type BuildPublicDatasetManifestInput,
  PUBLIC_DATASET_FILE_DEFINITIONS,
  serializePublicDatasetManifest,
  validatePublicDatasetManifestJson,
} from "./public-dataset-manifest";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

let input: BuildPublicDatasetManifestInput;
let formalManifestJson: string;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function read(relativePath: string): Promise<Buffer> {
  return fs.readFile(path.join(repoRoot, relativePath));
}

beforeAll(async () => {
  const [
    publicBudgetProgramIdentitiesCsv,
    publicBudgetProgramsCsv,
    publicBudgetItemsJson,
    publicBudgetRevenueDetailsCsv,
    publicBudgetRevenueItemsJson,
    publicBudgetRevenueAllocationsJson,
    datasetManifestJson,
    budgetItemsCsv,
    budgetProgramsCsv,
    budgetRevenueItemsCsv,
    budgetRevenueDetailsCsv,
    budgetRevenueAllocationsCsv,
    manifestJson,
  ] = await Promise.all([
    read("processed/public/public_budget_program_identities.csv"),
    read("processed/public/public_budget_programs.csv"),
    read("processed/public/public_budget_items.json"),
    read("processed/public/public_budget_revenue_details.csv"),
    read("processed/public/public_budget_revenue_items.json"),
    read("processed/public/public_budget_revenue_allocations.json"),
    read("processed/validation/dataset_manifest.json"),
    read("processed/core/budget_items.csv"),
    read("processed/core/budget_programs.csv"),
    read("processed/core/budget_revenue_items.csv"),
    read("processed/core/budget_revenue_details.csv"),
    read("processed/core/budget_revenue_allocations.csv"),
    read("processed/public/public_dataset_manifest.json"),
  ]);
  input = {
    publicFiles: {
      publicBudgetProgramIdentitiesCsv,
      publicBudgetProgramsCsv,
      publicBudgetItemsJson,
      publicBudgetRevenueDetailsCsv,
      publicBudgetRevenueItemsJson,
      publicBudgetRevenueAllocationsJson,
    },
    validationSources: {
      datasetManifestJson,
      budgetItemsCsv,
      budgetProgramsCsv,
      budgetRevenueItemsCsv,
      budgetRevenueDetailsCsv,
      budgetRevenueAllocationsCsv,
    },
  };
  formalManifestJson = manifestJson.toString("utf8");
});

describe("Phase 32-B public dataset manifest", () => {
  it("公開6ファイルを固定順・固定role・実ファイルhashで管理する", () => {
    const manifest = buildPublicDatasetManifest(input);

    expect(manifest.publicFiles).toHaveLength(6);
    expect(
      manifest.publicFiles.map(
        ({ path: filePath, format, role, requiredForProduction }) => ({
          path: filePath,
          format,
          role,
          requiredForProduction,
        }),
      ),
    ).toEqual(
      PUBLIC_DATASET_FILE_DEFINITIONS.map((definition) => ({
        path: definition.path,
        format: definition.format,
        role: definition.role,
        requiredForProduction: true,
      })),
    );
    for (const [index, definition] of
      PUBLIC_DATASET_FILE_DEFINITIONS.entries()) {
      const bytes = input.publicFiles[definition.key];
      expect(bytes).not.toBeNull();
      expect(manifest.publicFiles[index]?.sha256).toBe(
        sha256(bytes as Uint8Array),
      );
    }
    expect(
      manifest.publicFiles.some(
        (file) =>
          file.path ===
          ("processed/public/public_dataset_manifest.json" as string),
      ),
    ).toBe(false);
  });

  it("件数・歳入歳出合計・会計別合計・0円件数を固定する", () => {
    const manifest = buildPublicDatasetManifest(input);

    expect(manifest.totals).toEqual({
      expenditureTotalAmountThousandYen: 621_033_664,
      revenueTotalAmountThousandYen: 621_033_664,
    });
    expect(manifest.accountTotals).toEqual([
      {
        account_code: "general",
        account_name: "一般会計",
        expenditure_amount_thousand_yen: 431_353_010,
        revenue_amount_thousand_yen: 431_353_010,
      },
      {
        account_code: "national_health_insurance",
        account_name: "国民健康保険事業会計",
        expenditure_amount_thousand_yen: 84_206_905,
        revenue_amount_thousand_yen: 84_206_905,
      },
      {
        account_code: "latter_stage_elderly_healthcare",
        account_name: "後期高齢者医療会計",
        expenditure_amount_thousand_yen: 29_414_796,
        revenue_amount_thousand_yen: 29_414_796,
      },
      {
        account_code: "long_term_care_insurance",
        account_name: "介護保険事業会計",
        expenditure_amount_thousand_yen: 76_058_953,
        revenue_amount_thousand_yen: 76_058_953,
      },
      {
        account_code: "school_lunch_fee",
        account_name: "学校給食費会計",
        expenditure_amount_thousand_yen: 0,
        revenue_amount_thousand_yen: 0,
      },
    ]);
    expect(manifest.counts).toEqual({
      publicBudgetProgramIdentityCount: 1_156,
      publicBudgetProgramCount: 1_170,
      publicBudgetItemCount: 190,
      publicBudgetRevenueDetailCount: 2_192,
      publicBudgetRevenueItemCount: 175,
      publicBudgetRevenueAllocationCount: 1_948,
      exactGroupAllocationCount: 1_909,
      publicIdentityAllocationCount: 39,
      allocationAmountNonNullCount: 0,
      zeroAmountRevenueDetailCount: 226,
      zeroAmountRevenueItemCount: 9,
      zeroAmountProgramIdentityCount: 43,
    });
    expect(manifest.validation).toEqual({
      status: "PASS",
      errors: [],
    });
  });

  it("CSVの行列数とJSONのitem数を実測する", () => {
    const manifest = buildPublicDatasetManifest(input);

    expect(manifest.publicFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "processed/public/public_budget_program_identities.csv",
          rowCount: 1_156,
          columnCount: 21,
        }),
        expect.objectContaining({
          path: "processed/public/public_budget_programs.csv",
          rowCount: 1_170,
          columnCount: 21,
        }),
        expect.objectContaining({
          path: "processed/public/public_budget_items.json",
          itemCount: 190,
        }),
        expect.objectContaining({
          path: "processed/public/public_budget_revenue_details.csv",
          rowCount: 2_192,
          columnCount: 26,
        }),
        expect.objectContaining({
          path: "processed/public/public_budget_revenue_items.json",
          itemCount: 175,
        }),
        expect.objectContaining({
          path: "processed/public/public_budget_revenue_allocations.json",
          itemCount: 1_948,
        }),
      ]),
    );
  });

  it("正式manifestを同じ内容・キー順・hashで再生成できる", () => {
    const first = serializePublicDatasetManifest(
      buildPublicDatasetManifest(input),
    );
    const second = serializePublicDatasetManifest(
      buildPublicDatasetManifest(input),
    );

    expect(first).toBe(second);
    expect(sha256(Buffer.from(first, "utf8"))).toBe(
      sha256(Buffer.from(second, "utf8")),
    );
    expect(first).toBe(formalManifestJson);
    expect(first).not.toContain("generated_at");
    expect(first).not.toContain(
      '"path": "processed/public/public_dataset_manifest.json"',
    );
    validatePublicDatasetManifestJson(first, buildPublicDatasetManifest(input));
  });

  it("allocationへ金額を入れるとFAILとして記録する", () => {
    const allocations = JSON.parse(
      new TextDecoder().decode(
        input.publicFiles.publicBudgetRevenueAllocationsJson as Uint8Array,
      ),
    ) as Array<Record<string, unknown>>;
    allocations[0] = {
      ...allocations[0],
      allocationAmountThousandYen: 1,
    };
    const manifest = buildPublicDatasetManifest({
      ...input,
      publicFiles: {
        ...input.publicFiles,
        publicBudgetRevenueAllocationsJson: Buffer.from(
          `${JSON.stringify(allocations, null, 2)}\n`,
          "utf8",
        ),
      },
    });

    expect(manifest.validation.status).toBe("FAIL");
    expect(
      manifest.validation.errors.map((error) => error.errorCode),
    ).toContain("ALLOCATION_AMOUNT_NOT_NULL");
    expect(manifest.counts.allocationAmountNonNullCount).toBe(1);
  });

  it("公開必須ファイルが欠けるとFAILのmanifestを構築する", () => {
    const manifest = buildPublicDatasetManifest({
      ...input,
      publicFiles: {
        ...input.publicFiles,
        publicBudgetProgramIdentitiesCsv: null,
      },
    });

    expect(manifest.validation.status).toBe("FAIL");
    expect(
      manifest.validation.errors.map((error) => error.errorCode),
    ).toContain("PUBLIC_FILE_MISSING");
    expect(manifest.publicFiles[0]).toEqual(
      expect.objectContaining({
        path: "processed/public/public_budget_program_identities.csv",
        sha256: "",
        rowCount: 0,
        columnCount: 0,
        requiredForProduction: true,
      }),
    );
  });
});
