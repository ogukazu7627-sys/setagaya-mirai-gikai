import { describe, expect, it } from "vitest";
import { runBudgetTopicCandidateCli } from "./generate-budget-topic-candidates-cli";

describe("runBudgetTopicCandidateCli", () => {
  it("--helpでは入力を読まず正常終了する", async () => {
    const stdout: string[] = [];

    const exitCode = await runBudgetTopicCandidateCli(["--help"], {
      stdout: (message) => stdout.push(message),
    });

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toContain("--input-dir");
  });

  it("入力ディレクトリがなければ非0にする", async () => {
    const stderr: string[] = [];

    const exitCode = await runBudgetTopicCandidateCli([], {
      stderr: (message) => stderr.push(message),
    });

    expect(exitCode).toBe(1);
    expect(stderr.join("\n")).toContain("--input-dir は必須");
  });
});
