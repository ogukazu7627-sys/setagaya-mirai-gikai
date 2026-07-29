import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  PublicBudgetDatasetReadError,
  readPublicBudgetDataset,
} from "./read-public-budget-files";
import { renderPublicBudgetValidationReport } from "./render-public-budget-validation-report";
import {
  createFailedPublicBudgetValidation,
  type PublicBudgetDatasetExpectations,
  type PublicBudgetValidationResult,
  publicBudgetDatasetExpectations,
  validatePublicBudgetDataset,
} from "./validate-public-budget-files";

const defaultReportPath = path.resolve(
  import.meta.dirname,
  "../../../docs/budget/dataset-validation-report.md"
);

const usage = `Usage:
  pnpm budget:web:validate -- --input-dir <path> [options]

Options:
  --input-dir <path>    公開用7ファイルがあるディレクトリ（必須）
  --manifest <path>     manifest候補が複数ある場合の明示指定
  --report-path <path>  レポート出力先
  --help                このヘルプを表示
`;

export interface PublicBudgetValidationCliDependencies {
  expectations?: PublicBudgetDatasetExpectations;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

interface PublicBudgetValidationCliOptions {
  inputDirectory: string;
  manifestPath?: string;
  reportPath: string;
}

function parseCliOptions(
  argv: string[]
): PublicBudgetValidationCliOptions | "help" {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const { values, positionals } = parseArgs({
    args: normalizedArgv,
    allowPositionals: true,
    strict: true,
    options: {
      "input-dir": { type: "string" },
      manifest: { type: "string" },
      "report-path": { type: "string" },
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
    reportPath: values["report-path"]
      ? path.resolve(invocationDirectory, values["report-path"])
      : defaultReportPath,
  };
}

function writeReport(reportPath: string, report: string): void {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, "utf8");
}

export function runPublicBudgetValidationCli(
  argv: string[],
  dependencies: PublicBudgetValidationCliDependencies = {}
): number {
  const stdout = dependencies.stdout ?? console.log;
  const stderr = dependencies.stderr ?? console.error;
  const expectations =
    dependencies.expectations ?? publicBudgetDatasetExpectations;

  let options: PublicBudgetValidationCliOptions;
  try {
    const parsedOptions = parseCliOptions(argv);
    if (parsedOptions === "help") {
      stdout(usage);
      return 0;
    }
    options = parsedOptions;
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    stderr(usage);
    return 1;
  }

  let result: PublicBudgetValidationResult;
  try {
    const dataset = readPublicBudgetDataset({
      inputDirectory: options.inputDirectory,
      manifestPath: options.manifestPath,
    });
    result = validatePublicBudgetDataset(dataset, expectations);
  } catch (error) {
    result =
      error instanceof PublicBudgetDatasetReadError
        ? createFailedPublicBudgetValidation(error.code, error.message)
        : createFailedPublicBudgetValidation(
            "UNEXPECTED_VALIDATION_ERROR",
            error instanceof Error ? error.message : String(error)
          );
  }

  writeReport(options.reportPath, renderPublicBudgetValidationReport(result));

  stdout(`[budget:web:validate] ${result.status}`);
  stdout(`report: ${options.reportPath}`);
  if (result.summary) {
    stdout(
      `files: ${result.summary.files.length}, allocations: ${result.summary.counts.revenueAllocations}`
    );
  }
  for (const issue of result.issues) {
    stderr(`[${issue.code}] ${issue.message}`);
  }

  return result.status === "PASS" ? 0 : 1;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  process.exitCode = runPublicBudgetValidationCli(process.argv.slice(2));
}
