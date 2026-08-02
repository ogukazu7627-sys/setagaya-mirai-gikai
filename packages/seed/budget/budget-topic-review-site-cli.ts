import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  autoApproveStrongHighBudgetTopicCandidates,
  type BudgetTopicReviewSiteOptions,
  getDefaultBudgetTopicReviewSiteOptions,
} from "./budget-topic-review-site";
import { startBudgetTopicReviewServer } from "./budget-topic-review-site-server";

interface ReviewSiteCliOptions extends BudgetTopicReviewSiteOptions {
  help: boolean;
  port: number;
}

interface ReviewSiteCliDependencies {
  autoApprove?: typeof autoApproveStrongHighBudgetTopicCandidates;
  startServer?: typeof startBudgetTopicReviewServer;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
  waitForShutdown?: boolean;
}

const HELP = `予算課題候補のローカルレビュー画面を起動します。
B_strong_structuralかつ確信度highの候補は、起動前にapproveへ一括更新します。

Usage:
  pnpm budget:web:topics:review [options]

Options:
  --review-dir <path>       review CSVディレクトリ
  --definitions-dir <path> topic定義ディレクトリ
  --port <number>           localhostのポート（default: 4311）
  --help                    このヘルプを表示

このコマンドは127.0.0.1だけで待受け、Supabaseや本番環境へ接続しません。`;

export function parseBudgetTopicReviewSiteCliArgs(
  argv: string[],
  invocationDirectory = process.env.INIT_CWD ?? process.cwd()
): ReviewSiteCliOptions {
  const defaults = getDefaultBudgetTopicReviewSiteOptions(invocationDirectory);
  const options: ReviewSiteCliOptions = {
    ...defaults,
    help: false,
    port: 4311,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value) {
      throw new Error(`${argument} の値がありません`);
    }
    if (argument === "--review-dir") {
      options.reviewDirectory = path.resolve(invocationDirectory, value);
      index += 1;
      continue;
    }
    if (argument === "--definitions-dir") {
      options.definitionsDirectory = path.resolve(invocationDirectory, value);
      index += 1;
      continue;
    }
    if (argument === "--port") {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error("--port は1から65535の整数にしてください");
      }
      options.port = port;
      index += 1;
      continue;
    }
    throw new Error(`不明な引数です: ${argument}`);
  }
  return options;
}

export async function runBudgetTopicReviewSiteCli(
  argv: string[],
  dependencies: ReviewSiteCliDependencies = {}
): Promise<number> {
  const stdout = dependencies.stdout ?? console.log;
  const stderr = dependencies.stderr ?? console.error;
  try {
    const options = parseBudgetTopicReviewSiteCliArgs(argv);
    if (options.help) {
      stdout(HELP);
      return 0;
    }

    const autoApprove =
      dependencies.autoApprove ?? autoApproveStrongHighBudgetTopicCandidates;
    const approval = autoApprove(options);
    stdout(
      `B・High自動承認: 対象${approval.matched}件 / 今回更新${approval.updated}件 / 承認済み${approval.alreadyApproved}件`
    );

    const startServer =
      dependencies.startServer ?? startBudgetTopicReviewServer;
    const started = await startServer(options, options.port);
    stdout("予算課題候補のローカルレビュー画面を起動しました。");
    stdout(`URL: ${started.url}`);
    stdout(
      `手動確認対象: ${started.snapshot.summary.manualReviewTotal}件 / 未判断: ${started.snapshot.summary.manualPending}件`
    );
    stdout(`保存先: ${options.reviewDirectory}`);
    stdout("保存してもSupabase・本番環境には送信されません。");

    if (dependencies.waitForShutdown === false) {
      await started.close();
      return 0;
    }
    await new Promise<void>((resolve) => {
      const shutdown = () => {
        process.off("SIGINT", shutdown);
        process.off("SIGTERM", shutdown);
        started.close().then(resolve, resolve);
      };
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    });
    return 0;
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runBudgetTopicReviewSiteCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
