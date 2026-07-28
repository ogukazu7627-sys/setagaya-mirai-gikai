import { spawnSync } from "node:child_process";
import path from "node:path";

function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} が失敗しました: ` +
        `exit=${result.status ?? "unknown"}`,
    );
  }
}

function main(): void {
  const packageRoot = path.resolve(import.meta.dirname, "..");
  const venvPath = path.join(packageRoot, ".venv");
  const python = process.env.BUDGET_PYTHON?.trim() || "python3";
  const venvPython =
    process.platform === "win32"
      ? path.join(venvPath, "Scripts", "python.exe")
      : path.join(venvPath, "bin", "python3");

  run(python, ["-m", "venv", venvPath], packageRoot);
  run(
    venvPython,
    [
      "-m",
      "pip",
      "install",
      "--requirement",
      path.join(packageRoot, "requirements-pdf.txt"),
    ],
    packageRoot,
  );
  console.log(`Budget PDF Python environment: ${venvPath}`);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
