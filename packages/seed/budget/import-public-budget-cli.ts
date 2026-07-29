import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  applyPublicBudgetDataset,
  type BudgetDatasetApplyResult,
} from "./import-public-budget";
import {
  type PublicBudgetDataset,
  PublicBudgetDatasetReadError,
  readPublicBudgetDataset,
} from "./read-public-budget-files";
import {
  type PublicBudgetDatasetExpectations,
  publicBudgetDatasetExpectations,
  validatePublicBudgetDataset,
} from "./validate-public-budget-files";

const usage = `Usage:
  pnpm budget:web:import -- --input-dir <path> [--dry-run | --apply]

Options:
  --input-dir <path>  公開用7ファイルがあるディレクトリ（必須）
  --manifest <path>   manifest候補が複数ある場合の明示指定
  --dry-run           検証だけ実行（デフォルト）
  --apply             非公開Storageへ保存し、staging投入後にactive化
  --help              このヘルプを表示
`;

interface BudgetImportCliOptions {
  inputDirectory: string;
  manifestPath?: string;
  mode: "dry-run" | "apply";
}

export interface BudgetImportCliDependencies {
  expectations?: PublicBudgetDatasetExpectations;
  applyDataset?: (
    dataset: PublicBudgetDataset
  ) => Promise<BudgetDatasetApplyResult>;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

function parseCliOptions(argv: string[]): BudgetImportCliOptions | "help" {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const { values, positionals } = parseArgs({
    args: normalizedArgv,
    allowPositionals: true,
    strict: true,
    options: {
      "input-dir": { type: "string" },
      manifest: { type: "string" },
      "dry-run": { type: "boolean" },
      apply: { type: "boolean" },
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
  if (values["dry-run"] && values.apply) {
    throw new Error("--dry-run と --apply は同時に指定できません");
  }

  return {
    inputDirectory: path.resolve(invocationDirectory, values["input-dir"]),
    manifestPath: values.manifest,
    mode: values.apply ? "apply" : "dry-run",
  };
}

export async function runBudgetImportCli(
  argv: string[],
  dependencies: BudgetImportCliDependencies = {}
): Promise<number> {
  const stdout = dependencies.stdout ?? console.log;
  const stderr = dependencies.stderr ?? console.error;
  const expectations =
    dependencies.expectations ?? publicBudgetDatasetExpectations;
  const applyDataset = dependencies.applyDataset ?? applyPublicBudgetDataset;

  let options: BudgetImportCliOptions;
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

  let dataset: PublicBudgetDataset;
  try {
    dataset = readPublicBudgetDataset({
      inputDirectory: options.inputDirectory,
      manifestPath: options.manifestPath,
    });
  } catch (error) {
    const code =
      error instanceof PublicBudgetDatasetReadError
        ? error.code
        : "UNEXPECTED_READ_ERROR";
    const message = error instanceof Error ? error.message : String(error);
    stderr(`[${code}] ${message}`);
    return 1;
  }

  const validation = validatePublicBudgetDataset(dataset, expectations);
  if (validation.status !== "PASS") {
    stderr("[budget:web:import] manifest検証がFAILです");
    for (const issue of validation.issues) {
      stderr(`[${issue.code}] ${issue.message}`);
    }
    return 1;
  }

  stdout(
    `[budget:web:import] validation PASS (${options.mode}, manifest=${dataset.manifestSha256})`
  );
  if (options.mode === "dry-run") {
    stdout("[budget:web:import] dry-run completed; Supabaseへの書き込みなし");
    return 0;
  }

  try {
    const result = await applyDataset(dataset);
    stdout(
      `[budget:web:import] active dataset=${result.datasetId}, alreadyImported=${result.alreadyImported}`
    );
    stdout(`[budget:web:import] DB validation=${result.validation.status}`);
    return result.validation.status === "PASS" ? 0 : 1;
  } catch (error) {
    stderr(
      `[budget:web:import] apply failed: ${
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
  runBudgetImportCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
