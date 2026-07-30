import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runBudgetImportCli } from "./import-public-budget-cli";
import {
  publicBudgetTestExpectations,
  writePublicBudgetTestFixture,
} from "./public-budget-test-fixture";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function createFixture() {
  const inputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "budget-import-cli-")
  );
  temporaryDirectories.push(inputDirectory);
  return writePublicBudgetTestFixture(inputDirectory);
}

describe("runBudgetImportCli", () => {
  it("オプション未指定ではdry-runとなり書き込まない", async () => {
    const fixture = createFixture();
    const applyDataset = vi.fn();
    const stdout: string[] = [];

    const exitCode = await runBudgetImportCli(
      ["--input-dir", fixture.inputDirectory],
      {
        expectations: publicBudgetTestExpectations,
        applyDataset,
        stdout: (message) => stdout.push(message),
      }
    );

    expect(exitCode).toBe(0);
    expect(applyDataset).not.toHaveBeenCalled();
    expect(stdout.some((line) => line.includes("dry-run completed"))).toBe(
      true
    );
  });

  it("--applyではmanifest検証後にだけ投入処理を呼ぶ", async () => {
    const fixture = createFixture();
    const applyDataset = vi.fn().mockResolvedValue({
      datasetId: "11111111-1111-4111-8111-111111111111",
      alreadyImported: false,
      validation: {
        datasetId: "11111111-1111-4111-8111-111111111111",
        status: "PASS",
        errors: [],
        counts: {},
        totals: {},
        accountTotals: [],
      },
    });

    const exitCode = await runBudgetImportCli(
      ["--input-dir", fixture.inputDirectory, "--apply"],
      {
        expectations: publicBudgetTestExpectations,
        applyDataset,
      }
    );

    expect(exitCode).toBe(0);
    expect(applyDataset).toHaveBeenCalledTimes(1);
  });

  it("manifestとの不一致があればapplyを呼ばず非0にする", async () => {
    const fixture = createFixture();
    const applyDataset = vi.fn();
    fs.appendFileSync(
      fixture.actualFilePaths["public_budget_programs.csv"],
      "\n",
      "utf8"
    );

    const exitCode = await runBudgetImportCli(
      ["--input-dir", fixture.inputDirectory, "--apply"],
      {
        expectations: publicBudgetTestExpectations,
        applyDataset,
        stderr: () => undefined,
      }
    );

    expect(exitCode).toBe(1);
    expect(applyDataset).not.toHaveBeenCalled();
  });

  it("--dry-runと--applyの同時指定を拒否する", async () => {
    const fixture = createFixture();
    const exitCode = await runBudgetImportCli(
      ["--input-dir", fixture.inputDirectory, "--dry-run", "--apply"],
      { stderr: () => undefined }
    );

    expect(exitCode).toBe(1);
  });

  it("投入処理の失敗を非0で返す", async () => {
    const fixture = createFixture();
    const exitCode = await runBudgetImportCli(
      ["--input-dir", fixture.inputDirectory, "--apply"],
      {
        expectations: publicBudgetTestExpectations,
        applyDataset: async () => {
          throw new Error("database unavailable");
        },
        stderr: () => undefined,
      }
    );

    expect(exitCode).toBe(1);
  });
});
