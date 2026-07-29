import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import {
  BUDGET_COMPLETE_BUILD_INPUTS,
  BUDGET_COMPLETE_BUILD_OUTPUTS,
  BUDGET_COMPLETE_BUILD_PHASES,
  BUDGET_COMPLETE_VALIDATION_ERROR_FILES,
} from "./budget-complete-pipeline";

async function assertPathsExist(
  repoRoot: string,
  relativePaths: readonly string[],
  description: string,
): Promise<void> {
  const missingPaths: string[] = [];
  for (const relativePath of relativePaths) {
    try {
      await fs.access(path.join(repoRoot, relativePath));
    } catch {
      missingPaths.push(relativePath);
    }
  }
  if (missingPaths.length > 0) {
    throw new Error(
      `${description}が見つかりません: ${missingPaths.join(", ")}`,
    );
  }
}

function runPackageScript(
  packageRoot: string,
  script: string,
): Promise<void> {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  return new Promise((resolve, reject) => {
    const child = spawn(command, ["run", script], {
      cwd: packageRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${script}が失敗しました: ` +
            (signal
              ? `signal=${signal}`
              : `exit=${code ?? "unknown"}`),
        ),
      );
    });
  });
}

async function assertValidationErrorsEmpty(
  repoRoot: string,
): Promise<void> {
  for (const relativePath of BUDGET_COMPLETE_VALIDATION_ERROR_FILES) {
    const records = parse(
      await fs.readFile(path.join(repoRoot, relativePath), "utf8"),
      {
        bom: true,
        relax_column_count: false,
        skip_empty_lines: true,
      },
    ) as string[][];
    if (records.length !== 1) {
      throw new Error(
        `${relativePath}に${records.length - 1}件のエラーがあります。`,
      );
    }
  }
}

async function assertPublicManifestPass(repoRoot: string): Promise<void> {
  const manifestPath = path.join(
    repoRoot,
    "processed",
    "public",
    "public_dataset_manifest.json",
  );
  const parsed: unknown = JSON.parse(
    await fs.readFile(manifestPath, "utf8"),
  );
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(
      "public_dataset_manifest.jsonがオブジェクトではありません。",
    );
  }
  const manifest = parsed as Record<string, unknown>;
  const validation = manifest.validation;
  if (
    typeof validation !== "object" ||
    validation === null ||
    (validation as Record<string, unknown>).status !== "PASS"
  ) {
    throw new Error(
      "public_dataset_manifest.jsonのvalidation.statusがPASSではありません。",
    );
  }
  if (
    !Array.isArray(manifest.publicFiles) ||
    manifest.publicFiles.length !== 6
  ) {
    throw new Error(
      "public_dataset_manifest.jsonのpublicFilesが6件ではありません。",
    );
  }
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const packageRoot = path.resolve(import.meta.dirname, "..");
  await assertPathsExist(
    repoRoot,
    BUDGET_COMPLETE_BUILD_INPUTS,
    "統合予算データ生成の入力ファイル",
  );

  console.log("Complete expenditure and revenue budget build started.");
  for (const [index, phase] of BUDGET_COMPLETE_BUILD_PHASES.entries()) {
    console.log(
      `\n[${index + 1}/${BUDGET_COMPLETE_BUILD_PHASES.length}] ` +
        phase.label,
    );
    await runPackageScript(packageRoot, phase.script);
    await assertPathsExist(
      repoRoot,
      phase.outputs,
      `${phase.script}の出力ファイル`,
    );
  }

  await assertPathsExist(
    repoRoot,
    BUDGET_COMPLETE_BUILD_OUTPUTS,
    "統合予算データ生成の最終出力ファイル",
  );
  await assertValidationErrorsEmpty(repoRoot);
  await assertPublicManifestPass(repoRoot);

  console.log("\nComplete expenditure and revenue budget build: PASS");
  console.log("Core, allocation, and public validation: PASS");
  for (const output of BUDGET_COMPLETE_BUILD_OUTPUTS) {
    console.log(`- ${output}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
