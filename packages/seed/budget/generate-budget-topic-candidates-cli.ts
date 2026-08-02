import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  getDefaultBudgetTopicDefinitionsDirectory,
  loadBudgetTopicDefinitions,
} from "./budget-topic-definitions";
import { writeBudgetTopicCandidateFiles } from "./generate-budget-topic-candidates";
import { readPublicBudgetDataset } from "./read-public-budget-files";

const usage = `Usage:
  pnpm budget:web:topics:candidates -- --input-dir <path> [options]

Options:
  --input-dir <path>       公開用7ファイルの入力ディレクトリ（必須）
  --manifest <path>        manifestを明示する場合のパス
  --definitions-dir <path> topic定義ディレクトリ
  --output-dir <path>      review CSV出力先（既定: data/budget/editorial/review）
  --help                   このヘルプを表示
`;

interface CandidateCliOptions {
  inputDirectory: string;
  manifestPath?: string;
  definitionsDirectory: string;
  outputDirectory: string;
}

export interface CandidateCliDependencies {
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

function parseCliOptions(argv: string[]): CandidateCliOptions | "help" {
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
      "output-dir": { type: "string" },
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
    outputDirectory: path.resolve(
      invocationDirectory,
      values["output-dir"] ?? "data/budget/editorial/review"
    ),
  };
}

export async function runBudgetTopicCandidateCli(
  argv: string[],
  dependencies: CandidateCliDependencies = {}
): Promise<number> {
  const stdout = dependencies.stdout ?? console.log;
  const stderr = dependencies.stderr ?? console.error;
  let options: CandidateCliOptions;
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
    const results = writeBudgetTopicCandidateFiles(
      dataset,
      definitions,
      options.outputDirectory
    );
    for (const result of results) {
      stdout(
        [
          `[budget:web:topics:candidates] ${result.categorySlug}/${result.topicSlug}`,
          `candidates=${result.candidateCount}`,
          `B=${result.evidenceBCount}`,
          `C=${result.evidenceCCount}`,
          `status=${result.status}`,
        ].join(", ")
      );
    }
    stdout(
      `[budget:web:topics:candidates] PASS topics=${results.length}; review_decisionは人間が入力してください`
    );
    return 0;
  } catch (error) {
    stderr(
      `[budget:web:topics:candidates] FAIL: ${
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
  runBudgetTopicCandidateCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
