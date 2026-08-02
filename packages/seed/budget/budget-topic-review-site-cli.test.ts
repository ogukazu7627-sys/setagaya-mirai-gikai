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

  it("B・Highの一括承認後にレビューサーバーを起動する", async () => {
    const events: string[] = [];
    const stdout: string[] = [];
    const exitCode = await runBudgetTopicReviewSiteCli([], {
      autoApprove: () => {
        events.push("auto-approve");
        return {
          matched: 146,
          updated: 136,
          alreadyApproved: 10,
          updatedFiles: 9,
        };
      },
      startServer: (async () => {
        events.push("start-server");
        return {
          url: "http://127.0.0.1:4311",
          snapshot: {
            summary: { manualReviewTotal: 29, manualPending: 23 },
          },
          close: async () => undefined,
        };
      }) as never,
      stdout: (message) => stdout.push(message),
      waitForShutdown: false,
    });

    expect(exitCode).toBe(0);
    expect(events).toEqual(["auto-approve", "start-server"]);
    expect(stdout.join("\n")).toContain(
      "B・High自動承認: 対象146件 / 今回更新136件 / 承認済み10件"
    );
    expect(stdout.join("\n")).toContain("手動確認対象: 29件 / 未判断: 23件");
  });
});
