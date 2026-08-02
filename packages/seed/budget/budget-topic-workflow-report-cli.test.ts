import { describe, expect, it } from "vitest";
import { runBudgetTopicWorkflowReportCli } from "./budget-topic-workflow-report-cli";

describe("runBudgetTopicWorkflowReportCli", () => {
  it("--helpではSupabaseへ接続せず正常終了する", async () => {
    const stdout: string[] = [];
    let fetched = false;

    const exitCode = await runBudgetTopicWorkflowReportCli(["--help"], {
      fetchSnapshot: async () => {
        fetched = true;
        throw new Error("should not be called");
      },
      stdout: (message) => stdout.push(message),
    });

    expect(exitCode).toBe(0);
    expect(fetched).toBe(false);
    expect(stdout.join("\n")).toContain("--input-dir");
  });
});
