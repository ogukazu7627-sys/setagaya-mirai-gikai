import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  BUDGET_BUILD_INPUTS,
  BUDGET_BUILD_OUTPUTS,
  BUDGET_BUILD_PHASES,
} from "./budget-pipeline";

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
            (signal ? `signal=${signal}` : `exit=${code ?? "unknown"}`),
        ),
      );
    });
  });
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const packageRoot = path.resolve(import.meta.dirname, "..");

  await assertPathsExist(
    repoRoot,
    BUDGET_BUILD_INPUTS,
    "予算データ生成の入力ファイル",
  );

  console.log("All-account budget build started.");
  for (const [index, phase] of BUDGET_BUILD_PHASES.entries()) {
    console.log(
      `\n[${index + 1}/${BUDGET_BUILD_PHASES.length}] ${phase.label}`,
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
    BUDGET_BUILD_OUTPUTS,
    "予算データ生成の最終出力ファイル",
  );
  console.log("\nAll-account budget build: PASS");
  for (const output of BUDGET_BUILD_OUTPUTS) {
    console.log(`- ${output}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
