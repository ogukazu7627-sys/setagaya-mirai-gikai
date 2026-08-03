import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  findBudgetTopicDefinitionForReviewFile,
  getDefaultBudgetTopicDefinitionsDirectory,
  loadBudgetTopicDefinitions,
  type ResolvedBudgetTopicDefinition,
} from "./budget-topic-definitions";
import {
  type ArchivedBudgetTopicPayload,
  archiveReviewedBudgetTopic,
  buildArchivedBudgetTopicPayload,
  type BudgetTopicReviewFile,
  buildReviewedBudgetTopicPayload,
  publishReviewedBudgetTopic,
  type ReviewedBudgetTopicPayload,
  readBudgetTopicReviewFile,
} from "./publish-reviewed-budget-topic";

const usage = `Usage:
  pnpm budget:web:topics:publish -- --input-file <path> [--definitions-dir <path>] [--dry-run]
  pnpm budget:web:topics:publish -- --input-file <path> [--definitions-dir <path>] --reviewed-by <uuid> --reviewed-at <ISO-8601> --apply

Options:
  --input-file <path>  人間レビュー済み候補CSV（必須）
  --definitions-dir    topic定義ディレクトリ
  --reviewed-by <uuid> Supabase Authのレビュー者UUID（--apply時に必須）
  --reviewed-at <time> レビュー日時（ISO-8601、--apply時に必須）
  --dry-run            CSV検証と対象件数の表示だけを行う（デフォルト）
  --apply              active予算版へレビュー済み関係を冪等登録する
  --help               このヘルプを表示
`;

const reviewerIdSchema = z.string().uuid();
const reviewedAtSchema = z.iso.datetime({ offset: true });

interface BudgetTopicPublishCliOptions {
  inputFile: string;
  definitionsDirectory: string;
  mode: "dry-run" | "apply";
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface BudgetTopicPublishCliDependencies {
  applyPayload?: (payload: ReviewedBudgetTopicPayload) => Promise<{
    datasetId: string;
    categoryId: string;
    topicId: string;
    publishedRelationCount: number;
    removedRelationCount: number;
    status: "published";
  }>;
  archivePayload?: (payload: ArchivedBudgetTopicPayload) => Promise<{
    datasetId: string;
    categoryId: string;
    topicId: string;
    archivedRelationCount: number;
    status: "archived";
  }>;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

function parseCliOptions(
  argv: string[]
): BudgetTopicPublishCliOptions | "help" {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const { values, positionals } = parseArgs({
    args: normalizedArgv,
    allowPositionals: true,
    strict: true,
    options: {
      "input-file": { type: "string" },
      "definitions-dir": { type: "string" },
      "reviewed-by": { type: "string" },
      "reviewed-at": { type: "string" },
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
  if (!values["input-file"]) {
    throw new Error("--input-file は必須です");
  }
  if (values["dry-run"] && values.apply) {
    throw new Error("--dry-run と --apply は同時に指定できません");
  }
  if (values.apply && (!values["reviewed-by"] || !values["reviewed-at"])) {
    throw new Error("--apply には --reviewed-by と --reviewed-at が必要です");
  }

  return {
    inputFile: path.resolve(invocationDirectory, values["input-file"]),
    definitionsDirectory: values["definitions-dir"]
      ? path.resolve(invocationDirectory, values["definitions-dir"])
      : getDefaultBudgetTopicDefinitionsDirectory(invocationDirectory),
    mode: values.apply ? "apply" : "dry-run",
    reviewedBy: values["reviewed-by"],
    reviewedAt: values["reviewed-at"],
  };
}

export async function runBudgetTopicPublishCli(
  argv: string[],
  dependencies: BudgetTopicPublishCliDependencies = {}
): Promise<number> {
  const stdout = dependencies.stdout ?? console.log;
  const stderr = dependencies.stderr ?? console.error;
  const applyPayload = dependencies.applyPayload ?? publishReviewedBudgetTopic;
  const archivePayload =
    dependencies.archivePayload ?? archiveReviewedBudgetTopic;

  let options: BudgetTopicPublishCliOptions;
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

  let reviewFile: BudgetTopicReviewFile;
  let definition: ResolvedBudgetTopicDefinition;
  try {
    reviewFile = readBudgetTopicReviewFile(options.inputFile);
    definition = findBudgetTopicDefinitionForReviewFile(
      loadBudgetTopicDefinitions(options.definitionsDirectory),
      options.inputFile,
      reviewFile.candidateTopicName
    );
  } catch (error) {
    stderr(
      `[budget:web:topics:publish] CSV検証に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return 1;
  }

  stdout(
    [
      "[budget:web:topics:publish] review file PASS",
      `approve=${reviewFile.decisionCounts.approve}`,
      `revise=${reviewFile.decisionCounts.revise}`,
      `reject=${reviewFile.decisionCounts.reject}`,
      `pending=${reviewFile.decisionCounts[""]}`,
      `category=${definition.categorySlug}`,
      `topic=${definition.topic.slug}`,
    ].join(", ")
  );

  try {
    if (definition.topic.publicationStatus === "archived") {
      buildArchivedBudgetTopicPayload(reviewFile, definition);
    } else {
      buildReviewedBudgetTopicPayload(reviewFile, definition, {
        id: "00000000-0000-4000-8000-000000000000",
        reviewedAt: "2000-01-01T00:00:00.000Z",
      });
    }
  } catch (error) {
    stderr(
      `[budget:web:topics:publish] 公開方針の検証に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return 1;
  }

  if (options.mode === "dry-run") {
    stdout(
      "[budget:web:topics:publish] dry-run completed; Supabaseへの書き込みなし"
    );
    return 0;
  }

  try {
    if (definition.topic.publicationStatus === "archived") {
      const result = await archivePayload(
        buildArchivedBudgetTopicPayload(reviewFile, definition)
      );
      stdout(
        `[budget:web:topics:publish] archived topic=${result.topicId}, dataset=${result.datasetId}, relations=${result.archivedRelationCount}`
      );
      return 0;
    }
    const reviewedBy = reviewerIdSchema.parse(options.reviewedBy);
    const reviewedAt = reviewedAtSchema.parse(options.reviewedAt);
    const payload = buildReviewedBudgetTopicPayload(reviewFile, definition, {
      id: reviewedBy,
      reviewedAt,
    });
    const result = await applyPayload(payload);
    stdout(
      `[budget:web:topics:publish] published topic=${result.topicId}, dataset=${result.datasetId}, relations=${result.publishedRelationCount}, removed=${result.removedRelationCount}`
    );
    return 0;
  } catch (error) {
    stderr(
      `[budget:web:topics:publish] apply failed: ${
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
  runBudgetTopicPublishCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
