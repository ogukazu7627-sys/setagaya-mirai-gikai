import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  getDefaultBudgetTopicDefinitionsDirectory,
  loadBudgetTopicDefinitions,
} from "./budget-topic-definitions";
import {
  buildBudgetTopicWorkflowMetrics,
  fetchPublishedBudgetTopicSnapshot,
  readBudgetTopicReviewFiles,
  renderBudgetTopicWorkflowReport,
} from "./budget-topic-workflow-report";
import { readPublicBudgetDataset } from "./read-public-budget-files";

const usage = `Usage:
  pnpm budget:web:topics:report -- --input-dir <path> [options]

Options:
  --input-dir <path>       公開用7ファイルの入力ディレクトリ（必須）
  --manifest <path>        manifestを明示する場合のパス
  --definitions-dir <path> topic定義ディレクトリ
  --review-dir <path>      review CSVディレクトリ
  --output <path>          Markdown出力先
  --help                   このヘルプを表示
`;

interface ReportCliOptions {
  inputDirectory: string;
  manifestPath?: string;
  definitionsDirectory: string;
  reviewDirectory: string;
  outputFile: string;
}

export interface ReportCliDependencies {
  fetchSnapshot?: typeof fetchPublishedBudgetTopicSnapshot;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

function parseCliOptions(argv: string[]): ReportCliOptions | "help" {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const { values, positionals } = parseArgs({
    args: normalizedArgv,
    allowPositionals: true,
    strict: true,
    options: {
      "input-dir": { type: "string" },
      manifest: { type: "string" },
      "definitions-dir": { type: "string" },
      "review-dir": { type: "string" },
      output: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    return "help";
  }
  if (positionals.length > 0) {
    throw new Error(`不明な引数があります: ${positionals.join(" ")}`);
  }
  if (!values["input-dir"]) {
    throw new Error("--input-dir は必須です");
  }
  return {
    inputDirectory: path.resolve(invocationDirectory, values["input-dir"]),
    manifestPath: values.manifest,
    definitionsDirectory: values["definitions-dir"]
      ? path.resolve(invocationDirectory, values["definitions-dir"])
      : getDefaultBudgetTopicDefinitionsDirectory(invocationDirectory),
    reviewDirectory: path.resolve(
      invocationDirectory,
      values["review-dir"] ?? "data/budget/editorial/review"
    ),
    outputFile: path.resolve(
      invocationDirectory,
      values.output ?? "docs/budget/topic-workflow-report.md"
    ),
  };
}

export async function runBudgetTopicWorkflowReportCli(
  argv: string[],
  dependencies: ReportCliDependencies = {}
): Promise<number> {
  const stdout = dependencies.stdout ?? console.log;
  const stderr = dependencies.stderr ?? console.error;
  const fetchSnapshot =
    dependencies.fetchSnapshot ?? fetchPublishedBudgetTopicSnapshot;
  let options: ReportCliOptions;
  try {
    const parsed = parseCliOptions(argv);
    if (parsed === "help") {
      stdout(usage);
      return 0;
    }
    options = parsed;
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    stderr(usage);
    return 1;
  }

  try {
    const dataset = readPublicBudgetDataset({
      inputDirectory: options.inputDirectory,
      manifestPath: options.manifestPath,
    });
    const definitions = loadBudgetTopicDefinitions(
      options.definitionsDirectory
    );
    const reviews = readBudgetTopicReviewFiles(
      definitions,
      options.reviewDirectory
    );
    const snapshot = await fetchSnapshot();
    const metrics = buildBudgetTopicWorkflowMetrics(
      dataset,
      definitions,
      reviews,
      snapshot
    );
    fs.mkdirSync(path.dirname(options.outputFile), { recursive: true });
    fs.writeFileSync(
      options.outputFile,
      renderBudgetTopicWorkflowReport(metrics, snapshot),
      "utf8"
    );
    stdout(
      `[budget:web:topics:report] PASS topics=${metrics.topicDefinitionCount}, published=${metrics.publishedRelationCount}, pending=${metrics.reviewPendingCount}, unclassified=${metrics.unclassifiedIdentityCount}`
    );
    return 0;
  } catch (error) {
    stderr(
      `[budget:web:topics:report] FAIL: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return 1;
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runBudgetTopicWorkflowReportCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
