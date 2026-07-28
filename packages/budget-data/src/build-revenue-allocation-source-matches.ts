import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  parseRawPdfRevenueAllocations,
  parseRevenueAllocationSourceOverrides,
  parseRevenueDetailsForAllocationMatching,
  renderRevenueAllocationSourceMatchReport,
  serializeRevenueAllocationSourceMatches,
  serializeRevenueAllocationSourceOverrides,
  transformRevenueAllocationSourceMatches,
  validateRevenueAllocationSourceMatches,
  validateSerializedRevenueAllocationSourceMatches,
  validateSerializedRevenueAllocationSourceOverrides,
} from "./revenue-allocation-source-matches";

interface CliOptions {
  rawAllocationsPath: string;
  revenueDetailsPath: string;
  outputPath: string;
  overridesPath: string;
  reportPath: string;
}

interface OutputArtifact {
  path: string;
  content: string;
  validate?: (content: string) => void;
}

function resolveCliPath(value: string, repoRoot: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(repoRoot, value);
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  let rawAllocationsPath = path.join(
    repoRoot,
    "processed",
    "raw_pdf_revenue_allocations.csv",
  );
  let revenueDetailsPath = path.join(
    repoRoot,
    "processed",
    "budget_revenue_details.csv",
  );
  let outputPath = path.join(
    repoRoot,
    "processed",
    "staging",
    "revenue_allocation_source_matches.csv",
  );
  let overridesPath = path.join(
    repoRoot,
    "config",
    "revenue_allocation_source_overrides.csv",
  );
  let reportPath = path.join(
    repoRoot,
    "docs",
    "revenue_allocation_source_match_report.md",
  );

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    const value = args[index + 1];
    if (argument === "--raw-allocations" && value) {
      rawAllocationsPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--revenue-details" && value) {
      revenueDetailsPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--output" && value) {
      outputPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--overrides" && value) {
      overridesPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    if (argument === "--report" && value) {
      reportPath = resolveCliPath(value, repoRoot);
      index += 1;
      continue;
    }
    throw new Error(`不明な引数です: ${argument}`);
  }

  return {
    rawAllocationsPath,
    revenueDetailsPath,
    outputPath,
    overridesPath,
    reportPath,
  };
}

async function readUtf8(pathname: string): Promise<string> {
  const bytes = await fs.readFile(pathname);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function readOptionalUtf8(pathname: string): Promise<string> {
  try {
    return await readUtf8(pathname);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return "";
    }
    throw error;
  }
}

function displayPath(pathname: string, repoRoot: string): string {
  const relative = path.relative(repoRoot, pathname);
  return relative.startsWith("..") ? pathname : relative;
}

async function writeArtifactsAtomically(
  artifacts: OutputArtifact[],
): Promise<void> {
  const temporaryPaths = artifacts.map(
    (artifact) => `${artifact.path}.${process.pid}.tmp`,
  );

  try {
    for (let index = 0; index < artifacts.length; index += 1) {
      const artifact = artifacts[index];
      await fs.mkdir(path.dirname(artifact.path), { recursive: true });
      await fs.writeFile(
        temporaryPaths[index],
        artifact.content,
        "utf8",
      );
    }
    for (let index = 0; index < artifacts.length; index += 1) {
      const artifact = artifacts[index];
      if (artifact.validate) {
        artifact.validate(await readUtf8(temporaryPaths[index]));
      }
    }
    for (let index = 0; index < artifacts.length; index += 1) {
      await fs.rename(temporaryPaths[index], artifacts[index].path);
    }
  } finally {
    await Promise.all(
      temporaryPaths.map((temporaryPath) =>
        fs.rm(temporaryPath, { force: true }),
      ),
    );
  }
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const [rawAllocationsCsv, revenueDetailsCsv, overridesCsv] =
    await Promise.all([
      readUtf8(options.rawAllocationsPath),
      readUtf8(options.revenueDetailsPath),
      readOptionalUtf8(options.overridesPath),
    ]);

  const rawRows = parseRawPdfRevenueAllocations(rawAllocationsCsv);
  const details =
    parseRevenueDetailsForAllocationMatching(revenueDetailsCsv);
  const overrides =
    parseRevenueAllocationSourceOverrides(overridesCsv);
  const result = transformRevenueAllocationSourceMatches(
    rawRows,
    details,
    overrides,
  );
  const validation = validateRevenueAllocationSourceMatches(
    rawRows,
    details,
    result,
  );
  const outputCsv = serializeRevenueAllocationSourceMatches(
    result.matches,
  );
  const outputOverridesCsv =
    serializeRevenueAllocationSourceOverrides(result.overrideRows);
  const report = renderRevenueAllocationSourceMatchReport(
    validation,
    result,
    {
      rawAllocations: displayPath(
        options.rawAllocationsPath,
        repoRoot,
      ),
      revenueDetails: displayPath(
        options.revenueDetailsPath,
        repoRoot,
      ),
      sourceMatches: displayPath(options.outputPath, repoRoot),
      overrides: displayPath(options.overridesPath, repoRoot),
    },
  );

  await writeArtifactsAtomically([
    {
      path: options.outputPath,
      content: outputCsv,
      validate: (content) =>
        validateSerializedRevenueAllocationSourceMatches(
          content,
          result.matches,
        ),
    },
    {
      path: options.overridesPath,
      content: outputOverridesCsv,
      validate: (content) =>
        validateSerializedRevenueAllocationSourceOverrides(
          content,
          result.overrideRows,
        ),
    },
    {
      path: options.reportPath,
      content: report,
      validate: (content) => {
        if (!content.includes("# 歳入充当事業・公式CSV明細 接続レポート")) {
          throw new Error("一時出力した接続レポートが不正です。");
        }
      },
    },
  ]);

  console.log(
    `Raw allocation rows: ${validation.rawRowCount.toLocaleString("en-US")}`,
  );
  console.log(
    `PDF revenue detail groups: ` +
      validation.pdfRevenueDetailGroupCount.toLocaleString("en-US"),
  );
  console.log(
    `Source match rows: ${validation.outputRowCount.toLocaleString("en-US")}`,
  );
  for (const [status, count] of Object.entries(
    validation.statusGroupCounts,
  )) {
    console.log(
      `source_match_status ${status} (PDF detail groups): ` +
        count.toLocaleString("en-US"),
    );
  }
  for (const [method, count] of Object.entries(
    validation.methodGroupCounts,
  )) {
    console.log(
      `source_match_method ${method} (PDF detail groups): ` +
        count.toLocaleString("en-US"),
    );
  }
  console.log(
    `Unique matched revenue_detail_id: ` +
      validation.uniqueMatchedRevenueDetailIdCount.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `Manual override rows: ` +
      validation.overrideRowCount.toLocaleString("en-US"),
  );
  console.log("Temporary UTF-8 output verification: PASS");
  console.log(`Validation: ${validation.isPass ? "PASS" : "FAIL"}`);
  console.log(`Output: ${options.outputPath}`);
  console.log(`Overrides: ${options.overridesPath}`);
  console.log(`Report: ${options.reportPath}`);

  if (!validation.isPass) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
