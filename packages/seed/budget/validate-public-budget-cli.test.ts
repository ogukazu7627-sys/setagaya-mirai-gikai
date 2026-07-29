import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  publicBudgetTestExpectations,
  writePublicBudgetTestFixture,
} from "./public-budget-test-fixture";
import { runPublicBudgetValidationCli } from "./validate-public-budget-cli";

const temporaryDirectories: string[] = [];

function makeTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "public-budget-cli-")
  );
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("runPublicBudgetValidationCli", () => {
  it("正常データで終了コード0とPASSレポートを返す", () => {
    const fixture = writePublicBudgetTestFixture(makeTemporaryDirectory());
    const reportPath = path.join(makeTemporaryDirectory(), "report.md");
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = runPublicBudgetValidationCli(
      [
        "--",
        "--input-dir",
        fixture.inputDirectory,
        "--report-path",
        reportPath,
      ],
      {
        expectations: publicBudgetTestExpectations,
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      }
    );

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(stdout).toContain("[budget:web:validate] PASS");
    expect(fs.readFileSync(reportPath, "utf8")).toContain(
      "- 最終判定: **PASS**"
    );
  });

  it("不一致があれば終了コード1とFAILレポートを返す", () => {
    const fixture = writePublicBudgetTestFixture(makeTemporaryDirectory());
    const reportPath = path.join(makeTemporaryDirectory(), "report.md");
    fs.appendFileSync(
      fixture.actualFilePaths["public_budget_programs.csv"],
      "\n",
      "utf8"
    );

    const exitCode = runPublicBudgetValidationCli(
      ["--input-dir", fixture.inputDirectory, "--report-path", reportPath],
      {
        expectations: publicBudgetTestExpectations,
        stdout: () => undefined,
        stderr: () => undefined,
      }
    );

    expect(exitCode).toBe(1);
    const report = fs.readFileSync(reportPath, "utf8");
    expect(report).toContain("- 最終判定: **FAIL**");
    expect(report).toContain("FILE_HASH_MISMATCH");
  });

  it("--input-dirがなければ終了コード1にする", () => {
    const stderr: string[] = [];

    const exitCode = runPublicBudgetValidationCli([], {
      stdout: () => undefined,
      stderr: (message) => stderr.push(message),
    });

    expect(exitCode).toBe(1);
    expect(stderr[0]).toContain("--input-dir は必須です");
  });
});
