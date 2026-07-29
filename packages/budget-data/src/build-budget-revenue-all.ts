import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  BUDGET_REVENUE_BUILD_INPUTS,
  BUDGET_REVENUE_BUILD_OUTPUTS,
  BUDGET_REVENUE_BUILD_PHASES,
  BUDGET_REVENUE_IMMUTABLE_EXPENDITURE_FILES,
  BUDGET_REVENUE_POSTFLIGHT_PHASE,
  BUDGET_REVENUE_PUBLIC_POSTFLIGHT_PHASE,
} from "./budget-revenue-pipeline";

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

async function sha256(filePath: string): Promise<string> {
  return createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");
}

async function hashFiles(
  repoRoot: string,
  relativePaths: readonly string[],
): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      relativePaths.map(async (relativePath) => [
        relativePath,
        await sha256(path.join(repoRoot, relativePath)),
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
            (signal ? `signal=${signal}` : `exit=${code ?? "unknown"}`),
        ),
      );
    });
  });
}

async function runPhase(
  repoRoot: string,
  packageRoot: string,
  phase: {
    label: string;
    script: string;
    outputs: readonly string[];
  },
  position: string,
): Promise<void> {
  console.log(`\n[${position}] ${phase.label}`);
  await runPackageScript(packageRoot, phase.script);
  await assertPathsExist(
    repoRoot,
    phase.outputs,
    `${phase.script}の出力ファイル`,
  );
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const packageRoot = path.resolve(import.meta.dirname, "..");

  await assertPathsExist(
    repoRoot,
    BUDGET_REVENUE_BUILD_INPUTS,
    "歳入データ生成の入力ファイル",
  );
  const expenditureHashesBefore = await hashFiles(
    repoRoot,
    BUDGET_REVENUE_IMMUTABLE_EXPENDITURE_FILES,
  );

  console.log("All-account revenue budget build started.");
  for (const [index, phase] of BUDGET_REVENUE_BUILD_PHASES.entries()) {
    await runPhase(
      repoRoot,
      packageRoot,
      phase,
      `${index + 1}/${BUDGET_REVENUE_BUILD_PHASES.length}`,
    );
  }
  await runPhase(
    repoRoot,
    packageRoot,
    BUDGET_REVENUE_POSTFLIGHT_PHASE,
    "postflight 1/2",
  );
  await runPhase(
    repoRoot,
    packageRoot,
    BUDGET_REVENUE_PUBLIC_POSTFLIGHT_PHASE,
    "postflight 2/2",
  );

  await assertPathsExist(
    repoRoot,
    BUDGET_REVENUE_BUILD_OUTPUTS,
    "歳入データ生成の最終出力ファイル",
  );
  const expenditureHashesAfter = await hashFiles(
    repoRoot,
    BUDGET_REVENUE_IMMUTABLE_EXPENDITURE_FILES,
  );
  for (const relativePath of BUDGET_REVENUE_IMMUTABLE_EXPENDITURE_FILES) {
    if (
      expenditureHashesBefore[relativePath] !==
      expenditureHashesAfter[relativePath]
    ) {
      throw new Error(
        `歳入build-allが歳出コアを変更しました: ${relativePath}`,
      );
    }
  }

  console.log("\nAll-account revenue budget build: PASS");
  console.log("Expenditure core hash regression: PASS");
  for (const output of BUDGET_REVENUE_BUILD_OUTPUTS) {
    console.log(`- ${output}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
