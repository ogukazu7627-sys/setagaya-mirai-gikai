import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function localPythonPath(packageRoot: string): string {
  return process.platform === "win32"
    ? path.join(packageRoot, ".venv", "Scripts", "python.exe")
    : path.join(packageRoot, ".venv", "bin", "python3");
}

function supportsPdfExtraction(command: string): boolean {
  const result = spawnSync(
    command,
    ["-c", "import pdfplumber"],
    { stdio: "ignore" },
  );
  return result.status === 0;
}

function findPython(packageRoot: string): string {
  const configuredPython = process.env.BUDGET_PYTHON?.trim();
  const localPython = localPythonPath(packageRoot);
  const candidates = [
    configuredPython,
    fs.existsSync(localPython) ? localPython : undefined,
    "python3",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (supportsPdfExtraction(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "pdfplumberを利用できるPythonがありません。" +
      "`pnpm budget:setup`を実行するか、" +
      "`BUDGET_PYTHON`を指定してください。",
  );
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    throw new Error("実行するPythonスクリプトまたは引数がありません。");
  }

  const packageRoot = path.resolve(import.meta.dirname, "..");
  const python = findPython(packageRoot);
  const result = spawnSync(python, args, {
    cwd: packageRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
