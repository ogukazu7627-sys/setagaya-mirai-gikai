import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BUDGET_AI_CONSTRAINTS,
  EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN,
  EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
  FORBIDDEN_PUBLIC_BUDGET_COLUMNS,
  PUBLIC_BUDGET_PROGRAM_COLUMNS,
  PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
  buildBudgetAiContext,
  buildPublicBudgetReadModel,
  searchPublicBudgetPrograms,
  serializePublicBudgetItems,
  serializePublicBudgetPrograms,
  validatePublicBudgetProgramCsv,
  validatePublicBudgetReadModel,
  type PublicBudgetItem,
  type PublicBudgetReadModel,
} from "./public-budget";

type CsvRow = Record<string, string>;

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const CORE_HASHES = {
  programs:
    "6ae0a0fda94e2498be8749688cdab3427f3d1d54520b3e952152265672b81a27",
  sections:
    "5616dc3e29949fd8cf83128ea017b252f78587f8486d4091014d60ee7a1e2ad0",
  items:
    "a7edcf294bfd4256401ae396c63758f2fe28a0ffbd6fe26f3788fd35526b6822",
} as const;

let coreProgramsCsv: string;
let coreSectionsCsv: string;
let coreItemsCsv: string;
let publicProgramsCsv: string;
let publicItemsJson: string;
let corePrograms: CsvRow[];
let coreSections: CsvRow[];
let coreItems: CsvRow[];
let publicPrograms: CsvRow[];
let publicItems: PublicBudgetItem[];
let rebuiltModel: PublicBudgetReadModel;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseCsvRecords(csvText: string): CsvRow[] {
  return parse(csvText, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
  }) as CsvRow[];
}

beforeAll(async () => {
  [
    coreProgramsCsv,
    coreSectionsCsv,
    coreItemsCsv,
    publicProgramsCsv,
    publicItemsJson,
  ] = await Promise.all([
    fs.readFile(
      path.join(repoRoot, "processed", "core", "budget_programs.csv"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "core", "budget_sections.csv"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "processed", "core", "budget_items.csv"),
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
  ]);

  corePrograms = parseCsvRecords(coreProgramsCsv);
  coreSections = parseCsvRecords(coreSectionsCsv);
  coreItems = parseCsvRecords(coreItemsCsv);
  publicPrograms = parseCsvRecords(publicProgramsCsv);
  publicItems = JSON.parse(publicItemsJson) as PublicBudgetItem[];
  rebuiltModel = buildPublicBudgetReadModel(
    coreProgramsCsv,
    coreSectionsCsv,
    coreItemsCsv,
  );
});

describe("Phase 18 core data preservation", () => {
  it("コア3CSVのハッシュ・行数を変更しない", () => {
    expect(sha256(coreProgramsCsv)).toBe(CORE_HASHES.programs);
    expect(sha256(coreSectionsCsv)).toBe(CORE_HASHES.sections);
    expect(sha256(coreItemsCsv)).toBe(CORE_HASHES.items);
    expect(corePrograms).toHaveLength(1_170);
    expect(coreSections).toHaveLength(994);
    expect(coreItems).toHaveLength(190);
  });
});

describe("generated public budget data", () => {
  it("コアから公開成果物を決定的に再生成できる", () => {
    const basePublicProgramsCsv = serializePublicBudgetPrograms(
      rebuiltModel.programs,
    );
    const strippedPublicProgramsCsv = stringify(publicPrograms, {
      columns: [...PUBLIC_BUDGET_PROGRAM_COLUMNS],
      header: true,
      record_delimiter: "unix",
    });
    expect(basePublicProgramsCsv).toBe(strippedPublicProgramsCsv);
    expect(serializePublicBudgetItems(rebuiltModel.budgetItems)).toBe(
      publicItemsJson,
    );
    expect(() =>
      validatePublicBudgetProgramCsv(basePublicProgramsCsv),
    ).not.toThrow();
  });

  it("公開CSVは1,170行・許可21列だけで財源情報を含まない", () => {
    expect(publicPrograms).toHaveLength(1_170);
    expect(Object.keys(publicPrograms[0])).toEqual(
      PUBLIC_BUDGET_PROGRAM_COLUMNS_WITH_IDENTITY,
    );
    for (const forbiddenColumn of FORBIDDEN_PUBLIC_BUDGET_COLUMNS) {
      expect(Object.keys(publicPrograms[0])).not.toContain(
        forbiddenColumn,
      );
    }
    expect(Object.keys(publicPrograms[0])).not.toContain(
      "department_name",
    );
  });

  it("負数財源26行から財源値を公開モデルへ持ち込まない", () => {
    const negativeFundingRows = corePrograms.filter(
      (program) =>
        Number(program.general_revenue_thousand_yen) < 0,
    );
    const publicProgramsById = new Map(
      publicPrograms.map((program) => [program.program_id, program]),
    );

    expect(negativeFundingRows).toHaveLength(26);
    for (const coreProgram of negativeFundingRows) {
      const publicProgram = publicProgramsById.get(
        coreProgram.program_id,
      );
      expect(publicProgram).toBeDefined();
      expect(publicProgram?.amount_thousand_yen).toBe(
        coreProgram.amount_thousand_yen,
      );
      expect(publicProgram).not.toHaveProperty(
        "general_revenue_thousand_yen",
      );
      expect(publicProgram).not.toHaveProperty(
        "allocated_revenue_thousand_yen",
      );
    }
  });

  it("JSONは190目を保持し、事業と節を兄弟配列にする", () => {
    expect(publicItems).toHaveLength(190);
    expect(
      publicItems.flatMap((item) => item.programs),
    ).toHaveLength(1_170);
    expect(
      publicItems.flatMap((item) => item.sections),
    ).toHaveLength(994);

    for (const item of publicItems) {
      expect(item.dataAvailability.funding).toBe(
        "pending_revenue_phase",
      );
      expect(item.dataAvailability.programSectionMapping).toBe(
        "not_available",
      );
      expect(
        item.programs.every((program) => !("sections" in program)),
      ).toBe(true);
      expect(
        item.sections.every(
          (section) =>
            section.scope === "budget_item" &&
            !("programId" in section) &&
            !("programSectionId" in section),
        ),
      ).toBe(true);
    }
  });

  it("CSV行・PDFページ・derivedの出典参照を保持する", () => {
    for (const item of publicItems) {
      expect(
        item.sourceReferences.some(
          (sourceReference) =>
            sourceReference.sourceType === "derived",
        ),
      ).toBe(true);
      expect(
        item.programs.every(
          (program) =>
            program.sourceReference?.sourceType === "official_csv" &&
            program.sourceReference.sourceRowNumber > 0,
        ),
      ).toBe(true);
      expect(
        item.sections.every(
          (section) =>
            section.sourceReference?.sourceType === "official_pdf" &&
            section.sourceReference.pdfPage > 0 &&
            section.sourceReference.budgetBookPage > 0,
        ),
      ).toBe(true);
    }
  });

  it("会計別・全会計のprogram、item、section合計が一致する", () => {
    const validation = validatePublicBudgetReadModel({
      programs: rebuiltModel.programs,
      budgetItems: publicItems,
    });

    expect(validation.accountProgramTotalsThousandYen).toEqual(
      EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN,
    );
    expect(validation.accountItemTotalsThousandYen).toEqual(
      EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN,
    );
    expect(validation.accountSectionTotalsThousandYen).toEqual(
      EXPECTED_PUBLIC_ACCOUNT_TOTALS_THOUSAND_YEN,
    );
    expect(validation.programTotalAmountThousandYen).toBe(
      EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
    );
    expect(validation.itemTotalAmountThousandYen).toBe(
      EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
    );
    expect(validation.sectionTotalAmountThousandYen).toBe(
      EXPECTED_PUBLIC_BUDGET_TOTAL_THOUSAND_YEN,
    );
  });

  it("0円事業44件と0円項目10件を保持し、検索だけ既定除外する", () => {
    const zeroProgram = rebuiltModel.programs.find(
      (program) => program.is_zero_amount,
    );
    expect(zeroProgram).toBeDefined();
    expect(
      rebuiltModel.programs.filter(
        (program) => program.is_zero_amount,
      ),
    ).toHaveLength(44);
    expect(
      publicItems.filter(
        (item) => item.validationStatus === "ok_zero_amount",
      ),
    ).toHaveLength(10);
    expect(
      searchPublicBudgetPrograms(zeroProgram?.program_id ?? "", {
        programs: rebuiltModel.programs,
      }),
    ).toEqual([]);
    expect(
      searchPublicBudgetPrograms(zeroProgram?.program_id ?? "", {
        programs: rebuiltModel.programs,
        includeZeroAmount: true,
      }),
    ).toHaveLength(1);
  });

  it("回答可能コンテキストに安全制約を固定する", () => {
    const result = buildBudgetAiContext({
      query: "一般会計の議会費はいくらですか",
      programs: rebuiltModel.programs.slice(0, 3),
      budgetItems: publicItems.slice(0, 1),
    });

    expect(result.answerable).toBe(true);
    if (result.answerable) {
      expect(result.context.constraints).toEqual(BUDGET_AI_CONSTRAINTS);
    }
  });
});
