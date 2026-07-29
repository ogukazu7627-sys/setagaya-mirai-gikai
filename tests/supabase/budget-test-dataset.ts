import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type BuiltBudgetImport,
  buildBudgetImportPayload,
} from "../../packages/seed/budget/build-budget-import-payload";
import { writePublicBudgetTestFixture } from "../../packages/seed/budget/public-budget-test-fixture";
import {
  type PublicBudgetDataset,
  readPublicBudgetDataset,
} from "../../packages/seed/budget/read-public-budget-files";
import type { Json } from "../../packages/supabase/types/supabase.types";

export interface BudgetTestDataset {
  inputDirectory: string;
  dataset: PublicBudgetDataset;
  builtImport: BuiltBudgetImport;
}

export function createBudgetTestDataset(): BudgetTestDataset {
  const inputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "budget-supabase-test-")
  );
  const fixture = writePublicBudgetTestFixture(inputDirectory);
  const manifestPath = fixture.actualFilePaths["public_dataset_manifest.json"];
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    generatedCommand: string;
  };
  manifest.generatedCommand = `test:${randomUUID()}`;
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  const dataset = readPublicBudgetDataset({ inputDirectory });
  return {
    inputDirectory,
    dataset,
    builtImport: buildBudgetImportPayload(dataset),
  };
}

export function cleanupBudgetTestDataset(testDataset: BudgetTestDataset): void {
  fs.rmSync(testDataset.inputDirectory, { recursive: true, force: true });
}

export function asJson(value: unknown): Json {
  return value as Json;
}

export function alternateManifestHash(seed = randomUUID()): string {
  return createHash("sha256").update(seed).digest("hex");
}
