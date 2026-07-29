import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { beforeAll, describe, expect, it } from "vitest";
import {
  EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN,
  PUBLIC_BUDGET_PROGRAM_COLUMNS,
  PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
} from "./public-budget";
import {
  EXPECTED_PUBLIC_BUDGET_PROGRAM_IDENTITY_ROW_COUNT,
  EXPECTED_PUBLIC_IDENTITY_RESOLUTION_ALLOCATION_COUNT,
  EXPECTED_PUBLIC_MULTIPLE_GROUP_IDENTITY_COUNT,
  PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS,
  type PublicBudgetProgramIdentityBuildResult,
  buildPublicBudgetProgramIdentities,
  serializePublicBudgetProgramIdentities,
  serializePublicRevenueAllocationReferencesFromCoreCsv,
  validatePublicBudgetProgramIdentityCsv,
  validatePublicBudgetProgramIdentityExtension,
} from "./public-budget-program-identities";

type CsvRow = Record<string, string>;

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const INPUT_HASHES = {
  identities:
    "ba33c037a9c77ccac6673cac84499542571aea3bc9582088d0af2d01c171ded3",
  members:
    "86696d86c17d90d7faaeda934b9b03b3264d8376623305d2be599d0a05c6c9af",
  groups:
    "09a666931d3deb6eb33be727eac635b32381cd85826c4a232a4c3ce4801cf59f",
  programs:
    "6ae0a0fda94e2498be8749688cdab3427f3d1d54520b3e952152265672b81a27",
  items:
    "a7edcf294bfd4256401ae396c63758f2fe28a0ffbd6fe26f3788fd35526b6822",
  publicProgramsBeforeIdentity:
    "63e0ee7f683cad3eb14230a3da0522a6380b20db0c178cf6f28431369fc1e925",
  publicItems:
    "01790675b33a28a9b1bb692052012136e5f99de373811600d4d9446ea23a7625",
  publicRevenueAllocations:
    "cb1a35734936f89ce3be59de27f9f8b7b4be6b236298ff68a38b501f4c92fb1c",
  revenueAllocations:
    "002e2d6dd857e20a88806145cc8c7e61fa35642bec43ac4c81982d4d1f7ab022",
  departmentMap:
    "4951ea3aac3c98635d9607e508a7903e2b7188c3e4f8f1cfe696f13757b58ef4",
} as const;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseCsv(csvText: string): CsvRow[] {
  return parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as CsvRow[];
}

describe("Phase 32-A 実データ回帰", () => {
  let identitiesCsv: string;
  let membersCsv: string;
  let groupsCsv: string;
  let programsCsv: string;
  let itemsCsv: string;
  let publicProgramsCsv: string;
  let publicItemsJson: string;
  let publicAllocationsJson: string;
  let revenueAllocationsCsv: string;
  let departmentMapCsv: string;
  let publicIdentitiesCsv: string;
  let result: PublicBudgetProgramIdentityBuildResult;

  beforeAll(async () => {
    [
      identitiesCsv,
      membersCsv,
      groupsCsv,
      programsCsv,
      itemsCsv,
      publicProgramsCsv,
      publicItemsJson,
      publicAllocationsJson,
      revenueAllocationsCsv,
      departmentMapCsv,
      publicIdentitiesCsv,
    ] = await Promise.all([
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_program_identities.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_program_identity_members.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_program_groups.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "processed", "budget_programs.csv"),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "processed", "budget_items.csv"),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "public",
          "public_budget_programs.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "public",
          "public_budget_items.json",
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
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "budget_revenue_allocations.csv",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "config", "department_name_map.csv"),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "processed",
          "public",
          "public_budget_program_identities.csv",
        ),
        "utf8",
      ),
    ]);
    result = buildPublicBudgetProgramIdentities({
      identitiesCsv,
      identityMembersCsv: membersCsv,
      programGroupsCsv: groupsCsv,
      programsCsv,
      itemsCsv,
      publicProgramsCsv,
      publicRevenueAllocationsJson: publicAllocationsJson,
      departmentMapCsv,
    });
  });

  it("非公開1,156 identityを全件公開し、金額と会計境界を維持する", () => {
    expect(result.validation).toMatchObject({
      identityRowCount:
        EXPECTED_PUBLIC_BUDGET_PROGRAM_IDENTITY_ROW_COUNT,
      uniqueIdentityIdCount:
        EXPECTED_PUBLIC_BUDGET_PROGRAM_IDENTITY_ROW_COUNT,
      groupRowCount: 1_166,
      uniqueMemberGroupIdCount: 1_166,
      programRowCount: 1_170,
      publicProgramRowCount: 1_170,
      allocationRowCount: 1_948,
      multipleGroupIdentityCount:
        EXPECTED_PUBLIC_MULTIPLE_GROUP_IDENTITY_COUNT,
      publicIdentityResolutionAllocationCount:
        EXPECTED_PUBLIC_IDENTITY_RESOLUTION_ALLOCATION_COUNT,
      totalAmountThousandYen: 621_033_664,
      accountTotalsThousandYen:
        EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN,
      isPass: true,
    });
    const privateIds = new Set(
      parseCsv(identitiesCsv).map(
        (identity) => identity.budget_program_identity_id,
      ),
    );
    expect(
      new Set(
        result.identities.map(
          (identity) => identity.budget_program_identity_id,
        ),
      ),
    ).toEqual(privateIds);
  });

  it("歳入1,948関係とpublic_identity 39件を公開identityへ接続する", () => {
    const publicIdentityIds = new Set(
      result.identities.map(
        (identity) => identity.budget_program_identity_id,
      ),
    );
    const allocations = JSON.parse(publicAllocationsJson) as Array<{
      targetBudgetProgramIdentityId: string;
      targetResolutionLevel: string;
    }>;
    expect(
      allocations.every((allocation) =>
        publicIdentityIds.has(
          allocation.targetBudgetProgramIdentityId,
        ),
      ),
    ).toBe(true);
    expect(
      allocations.filter(
        (allocation) =>
          allocation.targetResolutionLevel === "public_identity",
      ),
    ).toHaveLength(39);
    expect(
      result.identities.filter(
        (identity) => identity.has_public_identity_resolution,
      ),
    ).toHaveLength(7);
  });

  it("公開identityは許可21列だけで内部情報を含まない", () => {
    const rows = parseCsv(publicIdentitiesCsv);
    expect(rows).toHaveLength(1_156);
    expect(Object.keys(rows[0])).toEqual(
      PUBLIC_BUDGET_PROGRAM_IDENTITY_COLUMNS,
    );
    expect(Object.keys(rows[0])).not.toContain("department_name");
    expect(Object.keys(rows[0])).not.toContain(
      "normalized_department_name",
    );
    expect(Object.keys(rows[0])).not.toContain(
      "candidate_budget_book_pages",
    );
    expect(Object.keys(rows[0])).not.toContain(
      "candidate_budget_program_group_ids",
    );
    expect(
      rows.every(
        (identity) =>
          !identity.department_display_name.includes("＊") &&
          identity.source_type === "derived_public",
      ),
    ).toBe(true);
  });

  it("public programsは既存20列を変えずidentity列だけを末尾追加する", () => {
    const publicRows = parseCsv(publicProgramsCsv);
    const strippedCsv = stringify(publicRows, {
      columns: [...PUBLIC_BUDGET_PROGRAM_COLUMNS],
      header: true,
      record_delimiter: "unix",
    });
    expect(Object.keys(publicRows[0])).toEqual(
      PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
    );
    expect(sha256(strippedCsv)).toBe(
      INPUT_HASHES.publicProgramsBeforeIdentity,
    );
    expect(() =>
      validatePublicBudgetProgramIdentityExtension(
        strippedCsv,
        publicProgramsCsv,
        new Set(
          result.identities.map(
            (identity) => identity.budget_program_identity_id,
          ),
        ),
      ),
    ).not.toThrow();
  });

  it("公開2成果物を同一内容で再生成できる", () => {
    expect(serializePublicBudgetProgramIdentities(result.identities)).toBe(
      publicIdentitiesCsv,
    );
    expect(result.publicProgramsCsv).toBe(publicProgramsCsv);
    expect(() =>
      validatePublicBudgetProgramIdentityCsv(
        publicIdentitiesCsv,
        result.identities,
      ),
    ).not.toThrow();
  });

  it("公開allocation未生成でもコアallocationから同じidentity参照を再構築できる", () => {
    const rebuilt = buildPublicBudgetProgramIdentities({
      identitiesCsv,
      identityMembersCsv: membersCsv,
      programGroupsCsv: groupsCsv,
      programsCsv,
      itemsCsv,
      publicProgramsCsv,
      publicRevenueAllocationsJson:
        serializePublicRevenueAllocationReferencesFromCoreCsv(
          revenueAllocationsCsv,
        ),
      departmentMapCsv,
    });

    expect(rebuilt.identities).toEqual(result.identities);
    expect(rebuilt.publicProgramsCsv).toBe(result.publicProgramsCsv);
    expect(rebuilt.validation.allocationRowCount).toBe(1_948);
    expect(
      rebuilt.validation.publicIdentityResolutionAllocationCount,
    ).toBe(39);
  });

  it("コア・既存公開JSON・部署設定の固定ハッシュを維持する", () => {
    expect(sha256(identitiesCsv)).toBe(INPUT_HASHES.identities);
    expect(sha256(membersCsv)).toBe(INPUT_HASHES.members);
    expect(sha256(groupsCsv)).toBe(INPUT_HASHES.groups);
    expect(sha256(programsCsv)).toBe(INPUT_HASHES.programs);
    expect(sha256(itemsCsv)).toBe(INPUT_HASHES.items);
    expect(sha256(publicItemsJson)).toBe(INPUT_HASHES.publicItems);
    expect(sha256(publicAllocationsJson)).toBe(
      INPUT_HASHES.publicRevenueAllocations,
    );
    expect(sha256(revenueAllocationsCsv)).toBe(
      INPUT_HASHES.revenueAllocations,
    );
    expect(sha256(departmentMapCsv)).toBe(
      INPUT_HASHES.departmentMap,
    );
  });
});
