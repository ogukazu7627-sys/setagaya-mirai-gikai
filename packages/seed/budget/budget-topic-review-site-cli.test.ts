import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseBudgetTopicReviewSiteCliArgs,
  runBudgetTopicReviewSiteCli,
} from "./budget-topic-review-site-cli";

describe("budget topic review site CLI", () => {
  it("既定値と明示したローカルポートを解釈する", () => {
    const options = parseBudgetTopicReviewSiteCliArgs(
      [
        "--review-dir",
        "review",
        "--definitions-dir",
        "definitions",
        "--port",
        "4411",
      ],
      "/workspace"
    );

    expect(options).toMatchObject({
      reviewDirectory: path.resolve("/workspace/review"),
      definitionsDirectory: path.resolve("/workspace/definitions"),
      port: 4411,
      help: false,
    });
  });

  it("helpではサーバーを起動しない", async () => {
    const stdout: string[] = [];
    const exitCode = await runBudgetTopicReviewSiteCli(["--help"], {
      stdout: (message) => stdout.push(message),
    });

    expect(exitCode).toBe(0);
    expect(stdout.join("\n")).toContain("127.0.0.1");
  });

  it("不正なポートを拒否する", () => {
    expect(() => parseBudgetTopicReviewSiteCliArgs(["--port", "0"])).toThrow(
      "--port"
    );
  });
});
