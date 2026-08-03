import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { getDefaultBudgetTopicDefinitionsDirectory } from "./budget-topic-definitions";
import { curateBudgetTopicPublicationFiles } from "./curate-budget-topic-publication";

const usage = `Usage:
  pnpm budget:web:topics:curate [--definitions-dir <path>] [--review-dir <path>]
`;

export function runBudgetTopicPublicationCurationCli(argv: string[]): number {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  try {
    const { values, positionals } = parseArgs({
      args: normalizedArgv,
      allowPositionals: true,
      strict: true,
      options: {
        "definitions-dir": { type: "string" },
        "review-dir": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
    if (values.help) {
      console.log(usage);
      return 0;
    }
    if (positionals.length > 0) {
      throw new Error(`不明な引数があります: ${positionals.join(" ")}`);
    }
    const definitionsDirectory = values["definitions-dir"]
      ? path.resolve(invocationDirectory, values["definitions-dir"])
      : getDefaultBudgetTopicDefinitionsDirectory(invocationDirectory);
    const reviewDirectory = path.resolve(
      invocationDirectory,
      values["review-dir"] ?? "data/budget/editorial/review"
    );
    const results = curateBudgetTopicPublicationFiles(
      definitionsDirectory,
      reviewDirectory
    );
    const published = results.filter(
      (result) => result.publicationStatus === "published"
    );
    const archived = results.length - published.length;
    const relations = published.reduce(
      (total, result) => total + result.selectedCount,
      0
    );
    console.log(
      `[budget:web:topics:curate] PASS published_topics=${published.length}, archived_topics=${archived}, published_relations=${relations}`
    );
    return 0;
  } catch (error) {
    console.error(
      `[budget:web:topics:curate] FAIL: ${
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
  process.exitCode = runBudgetTopicPublicationCurationCli(
    process.argv.slice(2)
  );
}
