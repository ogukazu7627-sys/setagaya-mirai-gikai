import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  getDefaultBudgetTopicDefinitionsDirectory,
  loadBudgetTopicDefinitions,
} from "./budget-topic-definitions";
import {
  loadBudgetTopicPublishExpectations,
  verifyReviewedBudgetTopics,
} from "./verify-reviewed-budget-topics";

const usage = `Usage:
  pnpm budget:web:topics:verify -- [--review-dir <path>] [--definitions-dir <path>]
`;

export async function runVerifyReviewedBudgetTopicsCli(
  argv: string[],
  dependencies: {
    verify?: typeof verifyReviewedBudgetTopics;
    stdout?: (message: string) => void;
    stderr?: (message: string) => void;
  } = {}
): Promise<number> {
  const stdout = dependencies.stdout ?? console.log;
  const stderr = dependencies.stderr ?? console.error;
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();

  try {
    const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
    const { values, positionals } = parseArgs({
      args: normalizedArgv,
      allowPositionals: true,
      strict: true,
      options: {
        "review-dir": { type: "string" },
        "definitions-dir": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
    if (values.help) {
      stdout(usage);
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
    const expectations = loadBudgetTopicPublishExpectations(
      loadBudgetTopicDefinitions(definitionsDirectory),
      reviewDirectory
    );
    const result = await (dependencies.verify ?? verifyReviewedBudgetTopics)(
      expectations
    );
    stdout(
      `[budget:web:topics:verify] PASS topics=${result.topicCount}, published=${result.publishedRelationCount}, rejected=${result.rejectedRelationCount}`
    );
    return 0;
  } catch (error) {
    stderr(
      `[budget:web:topics:verify] FAIL: ${
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
  runVerifyReviewedBudgetTopicsCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
