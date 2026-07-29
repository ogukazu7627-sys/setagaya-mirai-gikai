import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { type ZodType, z } from "zod";
import {
  type PublicBudgetItem,
  type PublicBudgetProgramIdentityRow,
  type PublicBudgetProgramRow,
  type PublicBudgetRevenueAllocation,
  type PublicBudgetRevenueDetailRow,
  type PublicBudgetRevenueItem,
  type PublicDatasetFileManifest,
  type PublicDatasetManifest,
  publicBudgetItemsSchema,
  publicBudgetProgramHeaders,
  publicBudgetProgramIdentityHeaders,
  publicBudgetProgramIdentityRowSchema,
  publicBudgetProgramRowSchema,
  publicBudgetRevenueAllocationsSchema,
  publicBudgetRevenueDetailHeaders,
  publicBudgetRevenueDetailRowSchema,
  publicBudgetRevenueItemsSchema,
  publicDatasetManifestSchema,
} from "./public-budget-dataset-schemas";

export const publicBudgetLogicalFileNames = [
  "public_budget_program_identities.csv",
  "public_budget_programs.csv",
  "public_budget_items.json",
  "public_budget_revenue_details.csv",
  "public_budget_revenue_items.json",
  "public_budget_revenue_allocations.json",
] as const;

export const publicBudgetManifestLogicalFileName =
  "public_dataset_manifest.json";

export const publicBudgetInputLimits = {
  manifestBytes: 1024 * 1024,
  dataFileBytes: 32 * 1024 * 1024,
  totalBytes: 64 * 1024 * 1024,
  candidatesPerLogicalFile: 20,
} as const;

export type PublicBudgetLogicalFileName =
  (typeof publicBudgetLogicalFileNames)[number];

export interface PublicBudgetLoadedFile {
  logicalFileName: PublicBudgetLogicalFileName;
  actualFileName: string;
  filePath: string;
  expectedSha256: string;
  actualSha256: string;
  expectedCount: number;
  actualCount: number;
  expectedColumnCount?: number;
  actualColumnCount?: number;
  content: Buffer;
}

export interface PublicBudgetDataset {
  manifest: PublicDatasetManifest;
  manifestFileName: string;
  manifestFilePath: string;
  manifestSha256: string;
  manifestContent: Buffer;
  files: PublicBudgetLoadedFile[];
  programIdentities: PublicBudgetProgramIdentityRow[];
  programs: PublicBudgetProgramRow[];
  budgetItems: PublicBudgetItem[];
  revenueDetails: PublicBudgetRevenueDetailRow[];
  revenueItems: PublicBudgetRevenueItem[];
  revenueAllocations: PublicBudgetRevenueAllocation[];
}

export interface ReadPublicBudgetDatasetOptions {
  inputDirectory: string;
  manifestPath?: string;
}

export class PublicBudgetDatasetReadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PublicBudgetDatasetReadError";
    this.code = code;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function downloadedFileNamePattern(logicalFileName: string): RegExp {
  const parsed = path.parse(logicalFileName);
  return new RegExp(
    `^${escapeRegExp(parsed.name)}(?: \\(\\d+\\))?${escapeRegExp(parsed.ext)}$`
  );
}

function listFileCandidates(
  inputDirectory: string,
  logicalFileName: string
): string[] {
  const pattern = downloadedFileNamePattern(logicalFileName);
  const candidates = fs
    .readdirSync(inputDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  if (candidates.length > publicBudgetInputLimits.candidatesPerLogicalFile) {
    throw new PublicBudgetDatasetReadError(
      "TOO_MANY_FILE_CANDIDATES",
      `${logicalFileName} の候補が上限 ${publicBudgetInputLimits.candidatesPerLogicalFile} 件を超えています`
    );
  }
  return candidates;
}

function sha256Buffer(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function readFileSnapshot(
  filePath: string,
  maxBytes: number,
  logicalFileName: string
): Buffer {
  const descriptor = fs.openSync(filePath, "r");
  try {
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile()) {
      throw new PublicBudgetDatasetReadError(
        "INPUT_NOT_REGULAR_FILE",
        `${logicalFileName} は通常ファイルではありません`
      );
    }
    if (stat.size > maxBytes) {
      throw new PublicBudgetDatasetReadError(
        "FILE_TOO_LARGE",
        `${logicalFileName} が上限 ${maxBytes} bytes を超えています: ${stat.size} bytes`
      );
    }

    const content = fs.readFileSync(descriptor);
    if (content.byteLength > maxBytes) {
      throw new PublicBudgetDatasetReadError(
        "FILE_TOO_LARGE",
        `${logicalFileName} が上限 ${maxBytes} bytes を超えています: ${content.byteLength} bytes`
      );
    }
    return content;
  } finally {
    fs.closeSync(descriptor);
  }
}

function resolveManifestPath({
  inputDirectory,
  manifestPath,
}: ReadPublicBudgetDatasetOptions): string {
  if (manifestPath) {
    const resolvedPath = path.isAbsolute(manifestPath)
      ? manifestPath
      : path.resolve(inputDirectory, manifestPath);
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      throw new PublicBudgetDatasetReadError(
        "MANIFEST_NOT_FOUND",
        `manifestが見つかりません: ${resolvedPath}`
      );
    }
    return resolvedPath;
  }

  const candidates = listFileCandidates(
    inputDirectory,
    publicBudgetManifestLogicalFileName
  );

  if (candidates.length === 1) {
    return path.join(inputDirectory, candidates[0]);
  }
  if (candidates.length === 0) {
    throw new PublicBudgetDatasetReadError(
      "MANIFEST_NOT_FOUND",
      `${publicBudgetManifestLogicalFileName} または番号付きファイルがありません`
    );
  }

  throw new PublicBudgetDatasetReadError(
    "MANIFEST_AMBIGUOUS",
    `manifest候補が複数あります。--manifestで指定してください: ${candidates.join(
      ", "
    )}`
  );
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 10)
    .map((issue) => {
      const issuePath = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${issuePath}: ${issue.message}`;
    })
    .join("; ");
}

function readJsonWithSchema<T>(
  filePath: string,
  content: Buffer,
  schema: ZodType<T>
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.toString("utf8"));
  } catch (error) {
    throw new PublicBudgetDatasetReadError(
      "INVALID_JSON",
      `${path.basename(filePath)} のJSONを解析できません: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new PublicBudgetDatasetReadError(
      "SCHEMA_VALIDATION_FAILED",
      `${path.basename(filePath)} のスキーマが不正です: ${formatZodError(result.error)}`
    );
  }
  return result.data;
}

function readCsvWithSchema<T>(
  filePath: string,
  fileContent: Buffer,
  expectedHeaders: readonly string[],
  rowSchema: ZodType<T>
): { records: T[]; columnCount: number } {
  const content = fileContent.toString("utf8");
  let headerRows: string[][];
  let rawRecords: Record<string, string>[];

  try {
    headerRows = parse(content, {
      bom: true,
      skip_empty_lines: true,
      to_line: 1,
    }) as string[][];
    rawRecords = parse(content, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
    }) as Record<string, string>[];
  } catch (error) {
    throw new PublicBudgetDatasetReadError(
      "INVALID_CSV",
      `${path.basename(filePath)} のCSVを解析できません: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const headers = headerRows[0] ?? [];
  if (
    headers.length !== expectedHeaders.length ||
    headers.some((header, index) => header !== expectedHeaders[index])
  ) {
    throw new PublicBudgetDatasetReadError(
      "CSV_HEADER_MISMATCH",
      `${path.basename(filePath)} の列が期待スキーマと一致しません`
    );
  }

  const result = z.array(rowSchema).safeParse(rawRecords);
  if (!result.success) {
    throw new PublicBudgetDatasetReadError(
      "SCHEMA_VALIDATION_FAILED",
      `${path.basename(filePath)} の行スキーマが不正です: ${formatZodError(result.error)}`
    );
  }

  return {
    records: result.data,
    columnCount: headers.length,
  };
}

function manifestEntriesByFileName(
  manifest: PublicDatasetManifest
): Map<string, PublicDatasetFileManifest> {
  const entries = new Map<string, PublicDatasetFileManifest>();
  for (const entry of manifest.publicFiles) {
    const fileName = path.basename(entry.path);
    if (entries.has(fileName)) {
      throw new PublicBudgetDatasetReadError(
        "MANIFEST_DUPLICATE_FILE",
        `manifestに同じ論理ファイルが複数あります: ${fileName}`
      );
    }
    entries.set(fileName, entry);
  }
  return entries;
}

function resolveDataFile(
  inputDirectory: string,
  logicalFileName: PublicBudgetLogicalFileName,
  expectedSha256: string
): {
  actualFileName: string;
  filePath: string;
  actualSha256: string;
  content: Buffer;
} {
  const candidates = listFileCandidates(inputDirectory, logicalFileName);
  if (candidates.length === 0) {
    throw new PublicBudgetDatasetReadError(
      "DATA_FILE_NOT_FOUND",
      `${logicalFileName} または番号付きファイルがありません`
    );
  }

  const preferredCandidates = [...candidates].sort((left, right) => {
    if (left === logicalFileName) {
      return -1;
    }
    if (right === logicalFileName) {
      return 1;
    }
    return left.localeCompare(right);
  });
  let onlyCandidate:
    | {
        actualFileName: string;
        filePath: string;
        actualSha256: string;
        content: Buffer;
      }
    | undefined;

  for (const actualFileName of preferredCandidates) {
    const filePath = path.join(inputDirectory, actualFileName);
    const content = readFileSnapshot(
      filePath,
      publicBudgetInputLimits.dataFileBytes,
      logicalFileName
    );
    const candidate = {
      actualFileName,
      filePath,
      actualSha256: sha256Buffer(content),
      content,
    };
    if (candidate.actualSha256 === expectedSha256) {
      return candidate;
    }
    if (preferredCandidates.length === 1) {
      onlyCandidate = candidate;
    }
  }
  if (onlyCandidate) {
    return onlyCandidate;
  }

  throw new PublicBudgetDatasetReadError(
    "DATA_FILE_AMBIGUOUS",
    `${logicalFileName} の候補が複数あり、manifestのhashに一致しません`
  );
}

function expectedCount(entry: PublicDatasetFileManifest): number {
  return entry.format === "csv" ? entry.rowCount : entry.itemCount;
}

export function readPublicBudgetDataset(
  options: ReadPublicBudgetDatasetOptions
): PublicBudgetDataset {
  const inputDirectory = path.resolve(options.inputDirectory);
  if (
    !fs.existsSync(inputDirectory) ||
    !fs.statSync(inputDirectory).isDirectory()
  ) {
    throw new PublicBudgetDatasetReadError(
      "INPUT_DIRECTORY_NOT_FOUND",
      `入力ディレクトリが見つかりません: ${inputDirectory}`
    );
  }

  const manifestPath = resolveManifestPath({
    ...options,
    inputDirectory,
  });
  const manifestContent = readFileSnapshot(
    manifestPath,
    publicBudgetInputLimits.manifestBytes,
    publicBudgetManifestLogicalFileName
  );
  const manifest = readJsonWithSchema(
    manifestPath,
    manifestContent,
    publicDatasetManifestSchema
  );
  const entries = manifestEntriesByFileName(manifest);
  const resolvedFiles = new Map<
    PublicBudgetLogicalFileName,
    ReturnType<typeof resolveDataFile>
  >();

  for (const logicalFileName of publicBudgetLogicalFileNames) {
    const entry = entries.get(logicalFileName);
    if (!entry) {
      throw new PublicBudgetDatasetReadError(
        "MANIFEST_FILE_MISSING",
        `manifestに必須ファイルがありません: ${logicalFileName}`
      );
    }
    resolvedFiles.set(
      logicalFileName,
      resolveDataFile(inputDirectory, logicalFileName, entry.sha256)
    );
  }

  const totalInputBytes =
    manifestContent.byteLength +
    [...resolvedFiles.values()].reduce(
      (total, file) => total + file.content.byteLength,
      0
    );
  if (totalInputBytes > publicBudgetInputLimits.totalBytes) {
    throw new PublicBudgetDatasetReadError(
      "DATASET_TOO_LARGE",
      `公開用予算データセットが上限 ${publicBudgetInputLimits.totalBytes} bytes を超えています: ${totalInputBytes} bytes`
    );
  }

  const identityFile = resolvedFiles.get(
    "public_budget_program_identities.csv"
  );
  const programFile = resolvedFiles.get("public_budget_programs.csv");
  const budgetItemFile = resolvedFiles.get("public_budget_items.json");
  const revenueDetailFile = resolvedFiles.get(
    "public_budget_revenue_details.csv"
  );
  const revenueItemFile = resolvedFiles.get("public_budget_revenue_items.json");
  const allocationFile = resolvedFiles.get(
    "public_budget_revenue_allocations.json"
  );

  if (
    !identityFile ||
    !programFile ||
    !budgetItemFile ||
    !revenueDetailFile ||
    !revenueItemFile ||
    !allocationFile
  ) {
    throw new PublicBudgetDatasetReadError(
      "INTERNAL_FILE_RESOLUTION_ERROR",
      "必須ファイルの解決結果が不足しています"
    );
  }

  const identities = readCsvWithSchema(
    identityFile.filePath,
    identityFile.content,
    publicBudgetProgramIdentityHeaders,
    publicBudgetProgramIdentityRowSchema
  );
  const programs = readCsvWithSchema(
    programFile.filePath,
    programFile.content,
    publicBudgetProgramHeaders,
    publicBudgetProgramRowSchema
  );
  const budgetItems = readJsonWithSchema(
    budgetItemFile.filePath,
    budgetItemFile.content,
    publicBudgetItemsSchema
  );
  const revenueDetails = readCsvWithSchema(
    revenueDetailFile.filePath,
    revenueDetailFile.content,
    publicBudgetRevenueDetailHeaders,
    publicBudgetRevenueDetailRowSchema
  );
  const revenueItems = readJsonWithSchema(
    revenueItemFile.filePath,
    revenueItemFile.content,
    publicBudgetRevenueItemsSchema
  );
  const revenueAllocations = readJsonWithSchema(
    allocationFile.filePath,
    allocationFile.content,
    publicBudgetRevenueAllocationsSchema
  );

  const parsedFiles = new Map<
    PublicBudgetLogicalFileName,
    { count: number; columnCount?: number }
  >([
    [
      "public_budget_program_identities.csv",
      { count: identities.records.length, columnCount: identities.columnCount },
    ],
    [
      "public_budget_programs.csv",
      { count: programs.records.length, columnCount: programs.columnCount },
    ],
    ["public_budget_items.json", { count: budgetItems.length }],
    [
      "public_budget_revenue_details.csv",
      {
        count: revenueDetails.records.length,
        columnCount: revenueDetails.columnCount,
      },
    ],
    ["public_budget_revenue_items.json", { count: revenueItems.length }],
    [
      "public_budget_revenue_allocations.json",
      { count: revenueAllocations.length },
    ],
  ]);

  const files = publicBudgetLogicalFileNames.map((logicalFileName) => {
    const entry = entries.get(logicalFileName);
    const resolvedFile = resolvedFiles.get(logicalFileName);
    const parsedFile = parsedFiles.get(logicalFileName);
    if (!entry || !resolvedFile || !parsedFile) {
      throw new PublicBudgetDatasetReadError(
        "INTERNAL_FILE_RESOLUTION_ERROR",
        `${logicalFileName} の検証情報を構築できません`
      );
    }
    return {
      logicalFileName,
      actualFileName: resolvedFile.actualFileName,
      filePath: resolvedFile.filePath,
      expectedSha256: entry.sha256,
      actualSha256: resolvedFile.actualSha256,
      expectedCount: expectedCount(entry),
      actualCount: parsedFile.count,
      expectedColumnCount:
        entry.format === "csv" ? entry.columnCount : undefined,
      actualColumnCount: parsedFile.columnCount,
      content: resolvedFile.content,
    };
  });

  return {
    manifest,
    manifestFileName: path.basename(manifestPath),
    manifestFilePath: manifestPath,
    manifestSha256: sha256Buffer(manifestContent),
    manifestContent,
    files,
    programIdentities: identities.records,
    programs: programs.records,
    budgetItems,
    revenueDetails: revenueDetails.records,
    revenueItems,
    revenueAllocations,
  };
}
