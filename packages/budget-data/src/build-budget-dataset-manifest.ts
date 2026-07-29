import fs from "node:fs/promises";
import path from "node:path";
import { parseBudgetAccountsConfig } from "./budget-accounts";
import {
  buildBudgetDatasetManifest,
  serializeBudgetDatasetManifest,
} from "./budget-dataset-manifest";

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const configPath = path.join(
    repoRoot,
    "config",
    "budget-accounts.json",
  );
  const outputPath = path.join(
    repoRoot,
    "processed", "validation", "dataset_manifest.json",
  );
  const config = parseBudgetAccountsConfig(
    await fs.readFile(configPath, "utf8"),
  );
  const manifest = await buildBudgetDatasetManifest(repoRoot, config);
  const output = serializeBudgetDatasetManifest(manifest);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryOutputPath = `${outputPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryOutputPath, output, "utf8");
  await fs.rename(temporaryOutputPath, outputPath);

  console.log(`Schema version: ${manifest.schema_version}`);
  console.log(
    `Overall total: ` +
      manifest.overall_total_amount_thousand_yen.toLocaleString("en-US"),
  );
  if (!manifest.revenue) {
    throw new Error("dataset manifestにrevenueセクションがありません。");
  }
  console.log(
    `Revenue total: ` +
      manifest.revenue.overall_total_amount_thousand_yen.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `Revenue allocations: ` +
      manifest.revenue.allocation_relation_count.toLocaleString(
        "en-US",
      ),
  );
  console.log("Revenue validation: PASS");
  console.log(`Output: ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
