import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  PUBLIC_BUDGET_BUILD_INPUTS,
  PUBLIC_BUDGET_BUILD_OUTPUTS,
  PUBLIC_BUDGET_BUILD_PHASES,
  PUBLIC_BUDGET_PHASE_ARTIFACT_SEQUENCE,
} from "./public-budget-pipeline";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

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

async function hashFiles(
  repoRoot: string,
  relativePaths: readonly string[],
): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      relativePaths.map(async (relativePath) => [
        relativePath,
        sha256(await fs.readFile(path.join(repoRoot, relativePath))),
      ]),
    ),
  );
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
    PUBLIC_BUDGET_BUILD_INPUTS,
    "公開予算データ生成の入力ファイル",
  );
  const inputHashesBefore = await hashFiles(
    repoRoot,
    PUBLIC_BUDGET_BUILD_INPUTS,
  );

  console.log("Public budget dataset build started.");
  for (const [index, phase] of PUBLIC_BUDGET_BUILD_PHASES.entries()) {
    console.log(
      `\n[${index + 1}/${PUBLIC_BUDGET_BUILD_PHASES.length}] ` +
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
    PUBLIC_BUDGET_BUILD_OUTPUTS,
    "公開予算データ生成の最終出力ファイル",
  );
  await assertPublicManifestPass(repoRoot);

  const inputHashesAfter = await hashFiles(
    repoRoot,
    PUBLIC_BUDGET_BUILD_INPUTS,
  );
  for (const relativePath of PUBLIC_BUDGET_BUILD_INPUTS) {
    if (inputHashesBefore[relativePath] !== inputHashesAfter[relativePath]) {
      throw new Error(
        `公開予算データ生成が入力を変更しました: ${relativePath}`,
      );
    }
  }

  console.log("\nPublic budget dataset build: PASS");
  console.log("Core and configuration hash regression: PASS");
  const orderedOutputs = PUBLIC_BUDGET_PHASE_ARTIFACT_SEQUENCE;
  for (const [index, output] of orderedOutputs.entries()) {
    console.log(`${index + 1}. ${output}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
