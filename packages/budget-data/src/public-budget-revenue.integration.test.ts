import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BUDGET_REVENUE_AI_CONSTRAINTS,
  EXPECTED_PUBLIC_BUDGET_REVENUE_ACCOUNT_TOTALS,
  FORBIDDEN_PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS,
  PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS,
  buildBudgetRevenueAiContext,
  buildPublicBudgetRevenueReadModel,
  searchPublicBudgetRevenues,
  serializePublicBudgetRevenueAllocations,
  serializePublicBudgetRevenueDetails,
  serializePublicBudgetRevenueItems,
  validatePublicBudgetRevenueDetailCsv,
  validatePublicBudgetRevenueReadModel,
  type PublicBudgetRevenueAllocation,
  type PublicBudgetRevenueItem,
  type PublicBudgetRevenueReadModel,
} from "./public-budget-revenue";

type CsvRow = Record<string, string>;

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const CORE_HASHES = {
  details:
    "15fe8f1649f9384c8481c477a473c629e1e7f46ec2a0b9500e8fc39baf745477",
  sections:
    "dfe1866632e7288847593b1914cb7f1169081acd1dc4907b0b71fa5a01dd88a4",
  items:
    "6abbfc3e09e33d85f15de886e0d283edffe8309c9d8f9092b6daeee2cc63f1fe",
  allocations:
    "002e2d6dd857e20a88806145cc8c7e61fa35642bec43ac4c81982d4d1f7ab022",
  groups:
    "09a666931d3deb6eb33be727eac635b32381cd85826c4a232a4c3ce4801cf59f",
  departmentMap:
    "4951ea3aac3c98635d9607e508a7903e2b7188c3e4f8f1cfe696f13757b58ef4",
} as const;

let coreDetailsCsv: string;
let coreSectionsCsv: string;
let coreItemsCsv: string;
let coreAllocationsCsv: string;
let coreGroupsCsv: string;
let departmentMapCsv: string;
let publicDetailsCsv: string;
let publicItemsJson: string;
let publicAllocationsJson: string;
let rebuiltModel: PublicBudgetRevenueReadModel;
let publicDetails: CsvRow[];
let publicItems: PublicBudgetRevenueItem[];
let publicAllocations: PublicBudgetRevenueAllocation[];

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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
  [
    coreDetailsCsv,
    coreSectionsCsv,
    coreItemsCsv,
    coreAllocationsCsv,
    coreGroupsCsv,
    departmentMapCsv,
    publicDetailsCsv,
    publicItemsJson,
    publicAllocationsJson,
  ] = await Promise.all([
    fs.readFile(
      path.join(
        repoRoot,
        "processed", "core", "budget_revenue_details.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed", "core", "budget_revenue_sections.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed", "core", "budget_revenue_items.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed", "core", "budget_revenue_allocations.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed", "core", "budget_program_groups.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "config",
        "department_name_map.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed",
        "public",
        "public_budget_revenue_details.csv",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed",
        "public",
        "public_budget_revenue_items.json",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "processed",
        "public",
        "public_budget_revenue_allocations.json",
      ),
      "utf8",
    ),
  ]);
  rebuiltModel = buildPublicBudgetRevenueReadModel(
    coreDetailsCsv,
    coreSectionsCsv,
    coreItemsCsv,
    coreAllocationsCsv,
    coreGroupsCsv,
    departmentMapCsv,
  );
  publicDetails = parseCsv(publicDetailsCsv);
  publicItems = JSON.parse(
    publicItemsJson,
  ) as PublicBudgetRevenueItem[];
  publicAllocations = JSON.parse(
    publicAllocationsJson,
  ) as PublicBudgetRevenueAllocation[];
});

describe("Phase 31 core preservation", () => {
  it("入力6ファイルの固定ハッシュを変更しない", () => {
    expect(sha256(coreDetailsCsv)).toBe(CORE_HASHES.details);
    expect(sha256(coreSectionsCsv)).toBe(CORE_HASHES.sections);
    expect(sha256(coreItemsCsv)).toBe(CORE_HASHES.items);
    expect(sha256(coreAllocationsCsv)).toBe(
      CORE_HASHES.allocations,
    );
    expect(sha256(coreGroupsCsv)).toBe(CORE_HASHES.groups);
    expect(sha256(departmentMapCsv)).toBe(
      CORE_HASHES.departmentMap,
    );
  });
});

describe("generated public budget revenue data", () => {
  it("コアから公開3成果物を決定的に再生成できる", () => {
    expect(
      serializePublicBudgetRevenueDetails(rebuiltModel.details),
    ).toBe(publicDetailsCsv);
    expect(
      serializePublicBudgetRevenueItems(rebuiltModel.revenueItems),
    ).toBe(publicItemsJson);
    expect(
      serializePublicBudgetRevenueAllocations(
        rebuiltModel.allocations,
      ),
    ).toBe(publicAllocationsJson);
    expect(() =>
      validatePublicBudgetRevenueDetailCsv(publicDetailsCsv),
    ).not.toThrow();
  });

  it("detailsは2,192行・許可26列で内部部署名と非公開列を含まない", () => {
    expect(publicDetails).toHaveLength(2_192);
    expect(Object.keys(publicDetails[0])).toEqual(
      PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS,
    );
    for (const forbidden of FORBIDDEN_PUBLIC_BUDGET_REVENUE_DETAIL_COLUMNS) {
      expect(Object.keys(publicDetails[0])).not.toContain(forbidden);
    }
    expect(
      publicDetails.every(
        (detail) =>
          detail.department_display_name.length > 0 &&
          !detail.department_display_name.includes("＊"),
      ),
    ).toBe(true);
  });

  it("itemsは175件で650節・2,192細節を兄弟配列に保持する", () => {
    expect(publicItems).toHaveLength(175);
    expect(
      publicItems.flatMap((item) => item.sections),
    ).toHaveLength(650);
    expect(
      publicItems.flatMap((item) => item.details),
    ).toHaveLength(2_192);
    expect(
      publicItems.every(
        (item) =>
          item.sections.every(
            (section) => !("details" in section),
          ) &&
          item.details.every(
            (detail) => !("allocations" in detail),
          ),
      ),
    ).toBe(true);
  });

  it("一般会計と特別会計で表示分類を分ける", () => {
    const generalItems = publicItems.filter(
      (item) => item.accountCode === "general",
    );
    const specialItems = publicItems.filter(
      (item) => item.accountCode !== "general",
    );

    expect(
      generalItems.every(
        (item) =>
          item.revenueSourceDisplay.mode ===
            "general_and_specific" &&
          item.revenueSourceDisplay.entries
            .map((entry) => entry.label)
            .join(",") === "一般財源,特定財源",
      ),
    ).toBe(true);
    expect(
      specialItems.every(
        (item) =>
          item.revenueSourceDisplay.mode ===
            "source_categories" &&
          item.revenueSourceDisplay.entries.every(
            (entry) =>
              entry.label !== "一般財源" &&
              entry.label !== "特定財源",
          ),
      ),
    ).toBe(true);
    expect(
      specialItems.some((item) =>
        item.revenueSourceDisplay.entries.some(
          (entry) => entry.label === "国民健康保険料",
        ),
      ),
    ).toBe(true);
  });

  it("1,948関係に配分額を持たず39件のpublic_identityを保持する", () => {
    expect(publicAllocations).toHaveLength(1_948);
    expect(
      publicAllocations.filter(
        (allocation) =>
          allocation.targetResolutionLevel === "exact_group",
      ),
    ).toHaveLength(1_909);
    const publicIdentityRows = publicAllocations.filter(
      (allocation) =>
        allocation.targetResolutionLevel === "public_identity",
    );
    expect(publicIdentityRows).toHaveLength(39);
    expect(
      publicAllocations.every(
        (allocation) =>
          allocation.allocationAmountThousandYen === null &&
          allocation.amountAttributionStatus === "not_available" &&
          !("currentAmountThousandYen" in allocation) &&
          !("sourceRevenueAmountThousandYen" in allocation),
      ),
    ).toBe(true);
    expect(
      publicIdentityRows.every(
        (allocation) =>
          allocation.targetBudgetProgramGroupId === null &&
          allocation.targetBudgetProgramIdentityId.length > 0,
      ),
    ).toBe(true);
  });

  it("公開details・items・sectionsの金額と会計別合計が一致する", () => {
    const validation = validatePublicBudgetRevenueReadModel({
      details: rebuiltModel.details,
      revenueItems: publicItems,
      allocations: publicAllocations,
    });

    expect(validation.detailCurrentTotalThousandYen).toBe(
      621_033_664,
    );
    expect(validation.itemCurrentTotalThousandYen).toBe(
      621_033_664,
    );
    expect(validation.sectionCurrentTotalThousandYen).toBe(
      621_033_664,
    );
    expect(validation.accountDetailTotalsThousandYen).toEqual(
      EXPECTED_PUBLIC_BUDGET_REVENUE_ACCOUNT_TOTALS,
    );
    expect(validation.accountItemTotalsThousandYen).toEqual(
      EXPECTED_PUBLIC_BUDGET_REVENUE_ACCOUNT_TOTALS,
    );
    expect(validation.blankDepartmentDisplayNameCount).toBe(0);
  });

  it("0円226細節を保持し検索では既定除外・明示指定で復元する", () => {
    const zeroDetail = rebuiltModel.details.find(
      (detail) => detail.is_zero_amount,
    );
    expect(zeroDetail).toBeDefined();
    expect(
      rebuiltModel.details.filter(
        (detail) => detail.is_zero_amount,
      ),
    ).toHaveLength(226);
    expect(
      searchPublicBudgetRevenues(
        zeroDetail?.revenue_detail_id ?? "",
        { details: rebuiltModel.details },
      ),
    ).toEqual([]);
    expect(
      searchPublicBudgetRevenues(
        zeroDetail?.revenue_detail_id ?? "",
        {
          details: rebuiltModel.details,
          includeZeroAmount: true,
        },
      ),
    ).toHaveLength(1);
  });

  it("回答可能コンテキストへ4つの安全制約を必ず含める", () => {
    const result = buildBudgetRevenueAiContext({
      query: "一般会計の特定財源を教えてください",
      revenueDetails: rebuiltModel.details.slice(0, 2),
      revenueItems: publicItems.slice(0, 1),
      allocations: publicAllocations.slice(0, 1),
    });

    expect(result.answerable).toBe(true);
    if (result.answerable) {
      expect(result.context.constraints).toEqual(
        BUDGET_REVENUE_AI_CONSTRAINTS,
      );
    }
  });
});
