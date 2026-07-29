import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildBudgetDatasetStoragePrefix,
  buildBudgetImportPayload,
} from "./build-budget-import-payload";
import { writePublicBudgetTestFixture } from "./public-budget-test-fixture";
import { readPublicBudgetDataset } from "./read-public-budget-files";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function readFixtureDataset() {
  const inputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "budget-import-payload-")
  );
  temporaryDirectories.push(inputDirectory);
  writePublicBudgetTestFixture(inputDirectory);
  return readPublicBudgetDataset({ inputDirectory });
}

describe("buildBudgetImportPayload", () => {
  it("公開7ファイルを決定的なStorageパスへ割り当てる", () => {
    const dataset = readFixtureDataset();
    const first = buildBudgetImportPayload(dataset);
    const second = buildBudgetImportPayload(dataset);
    const expectedPrefix = `2026/initial/${dataset.manifestSha256}`;

    expect(first).toEqual(second);
    expect(buildBudgetDatasetStoragePrefix(dataset)).toBe(expectedPrefix);
    expect(first.artifacts).toHaveLength(7);
    expect(
      first.artifacts.every((artifact) =>
        artifact.storageObjectPath.startsWith(`${expectedPrefix}/`)
      )
    ).toBe(true);
    expect(first.artifacts.map((artifact) => artifact.logicalFileName)).toEqual(
      [...first.artifacts.map((artifact) => artifact.logicalFileName)].sort()
    );
  });

  it("CSVとJSONの重複行を増やさず10テーブル用payloadへ正規化する", () => {
    const dataset = readFixtureDataset();
    const { payload } = buildBudgetImportPayload(dataset);

    expect(payload.budget_program_identities).toHaveLength(1);
    expect(payload.budget_programs).toHaveLength(1);
    expect(payload.budget_items).toHaveLength(1);
    expect(payload.budget_item_sections).toHaveLength(1);
    expect(payload.budget_revenue_items).toHaveLength(1);
    expect(payload.budget_revenue_sections).toHaveLength(1);
    expect(payload.budget_revenue_details).toHaveLength(1);
    expect(payload.budget_revenue_allocations).toHaveLength(1);
    expect(payload.budget_source_documents).toHaveLength(10);
    expect(payload.import_summary).toEqual({
      budget_item_section_count: 1,
      revenue_section_count: 1,
      source_document_count: 10,
    });
  });

  it("節をprogramへ結び付けずbudget_item_keyだけへ所属させる", () => {
    const dataset = readFixtureDataset();
    const { payload } = buildBudgetImportPayload(dataset);
    const section = payload.budget_item_sections[0];

    expect(section).toMatchObject({
      section_id: "section_test",
      budget_item_key: "2026_general_expenditure_01_01_01",
      amount_thousand_yen: 100,
      scope: "budget_item",
    });
    expect(section).not.toHaveProperty("program_id");
    expect(section).not.toHaveProperty("budget_program_identity_id");
  });

  it("allocationへ配分額を追加せずnullを保持する", () => {
    const dataset = readFixtureDataset();
    const { payload } = buildBudgetImportPayload(dataset);

    expect(payload.budget_revenue_allocations[0]).toMatchObject({
      allocation_amount_thousand_yen: null,
      amount_attribution_status: "not_available",
      target_budget_program_identity_id: "bpi_test",
    });
  });
});
