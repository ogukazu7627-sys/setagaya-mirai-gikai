import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildPublicDatasetManifest,
  type BuildPublicDatasetManifestInput,
  type PublicDatasetFileKey,
  serializePublicDatasetManifest,
  validatePublicDatasetManifestJson,
} from "./public-dataset-manifest";

interface CliOptions {
  publicBudgetProgramIdentitiesPath: string;
  publicBudgetProgramsPath: string;
  publicBudgetItemsPath: string;
  publicBudgetRevenueDetailsPath: string;
  publicBudgetRevenueItemsPath: string;
  publicBudgetRevenueAllocationsPath: string;
  datasetManifestPath: string;
  budgetItemsPath: string;
  budgetProgramsPath: string;
  budgetRevenueItemsPath: string;
  budgetRevenueDetailsPath: string;
  budgetRevenueAllocationsPath: string;
  outputPath: string;
}

interface InputFile {
  path: string;
  bytes: Buffer | null;
  hash: string | null;
}

const PUBLIC_OPTION_KEYS: Record<
  string,
  keyof Pick<
    CliOptions,
    | "publicBudgetProgramIdentitiesPath"
    | "publicBudgetProgramsPath"
    | "publicBudgetItemsPath"
    | "publicBudgetRevenueDetailsPath"
    | "publicBudgetRevenueItemsPath"
    | "publicBudgetRevenueAllocationsPath"
  >
> = {
  "--public-program-identities":
    "publicBudgetProgramIdentitiesPath",
  "--public-programs": "publicBudgetProgramsPath",
  "--public-items": "publicBudgetItemsPath",
  "--public-revenue-details": "publicBudgetRevenueDetailsPath",
  "--public-revenue-items": "publicBudgetRevenueItemsPath",
  "--public-revenue-allocations":
    "publicBudgetRevenueAllocationsPath",
};

const VALIDATION_OPTION_KEYS: Record<
  string,
  keyof Pick<
    CliOptions,
    | "datasetManifestPath"
    | "budgetItemsPath"
    | "budgetProgramsPath"
    | "budgetRevenueItemsPath"
    | "budgetRevenueDetailsPath"
    | "budgetRevenueAllocationsPath"
  >
> = {
  "--dataset-manifest": "datasetManifestPath",
  "--budget-items": "budgetItemsPath",
  "--budget-programs": "budgetProgramsPath",
  "--budget-revenue-items": "budgetRevenueItemsPath",
  "--budget-revenue-details": "budgetRevenueDetailsPath",
  "--budget-revenue-allocations": "budgetRevenueAllocationsPath",
};

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const processedPath = path.join(repoRoot, "processed");
  const corePath = path.join(processedPath, "core");
  const publicPath = path.join(processedPath, "public");
  const validationPath = path.join(processedPath, "validation");
  const options: CliOptions = {
    publicBudgetProgramIdentitiesPath: path.join(
      publicPath,
      "public_budget_program_identities.csv",
    ),
    publicBudgetProgramsPath: path.join(
      publicPath,
      "public_budget_programs.csv",
    ),
    publicBudgetItemsPath: path.join(
      publicPath,
      "public_budget_items.json",
    ),
    publicBudgetRevenueDetailsPath: path.join(
      publicPath,
      "public_budget_revenue_details.csv",
    ),
    publicBudgetRevenueItemsPath: path.join(
      publicPath,
      "public_budget_revenue_items.json",
    ),
    publicBudgetRevenueAllocationsPath: path.join(
      publicPath,
      "public_budget_revenue_allocations.json",
    ),
    datasetManifestPath: path.join(
      validationPath,
      "dataset_manifest.json",
    ),
    budgetItemsPath: path.join(corePath, "budget_items.csv"),
    budgetProgramsPath: path.join(
      corePath,
      "budget_programs.csv",
    ),
    budgetRevenueItemsPath: path.join(
      corePath,
      "budget_revenue_items.csv",
    ),
    budgetRevenueDetailsPath: path.join(
      corePath,
      "budget_revenue_details.csv",
    ),
    budgetRevenueAllocationsPath: path.join(
      corePath,
      "budget_revenue_allocations.csv",
    ),
    outputPath: path.join(
      publicPath,
      "public_dataset_manifest.json",
    ),
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    const value = args[index + 1];
    if (!value) {
      throw new Error(`${argument}の値がありません。`);
    }
    const publicOption = PUBLIC_OPTION_KEYS[argument];
    const validationOption = VALIDATION_OPTION_KEYS[argument];
    if (publicOption) {
      options[publicOption] = path.resolve(value);
    } else if (validationOption) {
      options[validationOption] = path.resolve(value);
    } else if (argument === "--output") {
      options.outputPath = path.resolve(value);
    } else {
      throw new Error(`不明な引数です: ${argument}`);
    }
    index += 1;
  }
  return options;
}

function inputPaths(options: CliOptions): string[] {
  return [
    options.publicBudgetProgramIdentitiesPath,
    options.publicBudgetProgramsPath,
    options.publicBudgetItemsPath,
    options.publicBudgetRevenueDetailsPath,
    options.publicBudgetRevenueItemsPath,
    options.publicBudgetRevenueAllocationsPath,
    options.datasetManifestPath,
    options.budgetItemsPath,
    options.budgetProgramsPath,
    options.budgetRevenueItemsPath,
    options.budgetRevenueDetailsPath,
    options.budgetRevenueAllocationsPath,
  ];
}

function assertOutputPathSafe(options: CliOptions): void {
  if (inputPaths(options).includes(options.outputPath)) {
    throw new Error(
      "public_dataset_manifest.jsonの出力先を入力と同じにできません。",
    );
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readInput(
  inputPath: string,
  optional: boolean,
): Promise<InputFile> {
  try {
    const bytes = await fs.readFile(inputPath);
    return {
      path: inputPath,
      bytes,
      hash: sha256(bytes),
    };
  } catch (error: unknown) {
    if (
      optional &&
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {
        path: inputPath,
        bytes: null,
        hash: null,
      };
    }
    throw error;
  }
}

async function assertInputsUnchanged(
  inputs: readonly InputFile[],
): Promise<void> {
  for (const input of inputs) {
    if (input.bytes === null) {
      try {
        await fs.access(input.path);
      } catch {
        continue;
      }
      throw new Error(
        `生成中に存在しなかった入力が作成されました: ${input.path}`,
      );
    }
    const currentHash = sha256(await fs.readFile(input.path));
    if (currentHash !== input.hash) {
      throw new Error(`生成中に入力が変更されました: ${input.path}`);
    }
  }
}

function buildInput(
  publicInputs: Record<PublicDatasetFileKey, InputFile>,
  validationInputs: {
    datasetManifest: InputFile;
    budgetItems: InputFile;
    budgetPrograms: InputFile;
    budgetRevenueItems: InputFile;
    budgetRevenueDetails: InputFile;
    budgetRevenueAllocations: InputFile;
  },
): BuildPublicDatasetManifestInput {
  const requiredBytes = (input: InputFile): Buffer => {
    if (input.bytes === null) {
      throw new Error(`検証入力が存在しません: ${input.path}`);
    }
    return input.bytes;
  };
  return {
    publicFiles: {
      publicBudgetProgramIdentitiesCsv:
        publicInputs.publicBudgetProgramIdentitiesCsv.bytes,
      publicBudgetProgramsCsv:
        publicInputs.publicBudgetProgramsCsv.bytes,
      publicBudgetItemsJson: publicInputs.publicBudgetItemsJson.bytes,
      publicBudgetRevenueDetailsCsv:
        publicInputs.publicBudgetRevenueDetailsCsv.bytes,
      publicBudgetRevenueItemsJson:
        publicInputs.publicBudgetRevenueItemsJson.bytes,
      publicBudgetRevenueAllocationsJson:
        publicInputs.publicBudgetRevenueAllocationsJson.bytes,
    },
    validationSources: {
      datasetManifestJson: requiredBytes(
        validationInputs.datasetManifest,
      ),
      budgetItemsCsv: requiredBytes(validationInputs.budgetItems),
      budgetProgramsCsv: requiredBytes(
        validationInputs.budgetPrograms,
      ),
      budgetRevenueItemsCsv: requiredBytes(
        validationInputs.budgetRevenueItems,
      ),
      budgetRevenueDetailsCsv: requiredBytes(
        validationInputs.budgetRevenueDetails,
      ),
      budgetRevenueAllocationsCsv: requiredBytes(
        validationInputs.budgetRevenueAllocations,
      ),
    },
  };
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  assertOutputPathSafe(options);
  const publicEntries = await Promise.all([
    readInput(options.publicBudgetProgramIdentitiesPath, true),
    readInput(options.publicBudgetProgramsPath, true),
    readInput(options.publicBudgetItemsPath, true),
    readInput(options.publicBudgetRevenueDetailsPath, true),
    readInput(options.publicBudgetRevenueItemsPath, true),
    readInput(options.publicBudgetRevenueAllocationsPath, true),
  ]);
  const publicInputs: Record<PublicDatasetFileKey, InputFile> = {
    publicBudgetProgramIdentitiesCsv: publicEntries[0],
    publicBudgetProgramsCsv: publicEntries[1],
    publicBudgetItemsJson: publicEntries[2],
    publicBudgetRevenueDetailsCsv: publicEntries[3],
    publicBudgetRevenueItemsJson: publicEntries[4],
    publicBudgetRevenueAllocationsJson: publicEntries[5],
  };
  const validationEntries = await Promise.all([
    readInput(options.datasetManifestPath, false),
    readInput(options.budgetItemsPath, false),
    readInput(options.budgetProgramsPath, false),
    readInput(options.budgetRevenueItemsPath, false),
    readInput(options.budgetRevenueDetailsPath, false),
    readInput(options.budgetRevenueAllocationsPath, false),
  ]);
  const validationInputs = {
    datasetManifest: validationEntries[0],
    budgetItems: validationEntries[1],
    budgetPrograms: validationEntries[2],
    budgetRevenueItems: validationEntries[3],
    budgetRevenueDetails: validationEntries[4],
    budgetRevenueAllocations: validationEntries[5],
  };
  const allInputs = [...publicEntries, ...validationEntries];

  const manifest = buildPublicDatasetManifest(
    buildInput(publicInputs, validationInputs),
  );
  const serialized = serializePublicDatasetManifest(manifest);
  if (
    sha256(Buffer.from(serialized, "utf8")) !==
    sha256(
      Buffer.from(
        serializePublicDatasetManifest(manifest),
        "utf8",
      ),
    )
  ) {
    throw new Error("公開manifestの直列化が決定的ではありません。");
  }
  await assertInputsUnchanged(allInputs);
  await fs.mkdir(path.dirname(options.outputPath), {
    recursive: true,
  });
  const temporaryPath = `${options.outputPath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporaryPath, serialized, "utf8");
    const writtenText = await fs.readFile(temporaryPath, "utf8");
    validatePublicDatasetManifestJson(writtenText, manifest);
    await assertInputsUnchanged(allInputs);
    await fs.rename(temporaryPath, options.outputPath);
  } finally {
    try {
      await fs.unlink(temporaryPath);
    } catch (error: unknown) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  const outputHash = sha256(Buffer.from(serialized, "utf8"));
  console.log(`Public files: ${manifest.publicFiles.length}`);
  for (const file of manifest.publicFiles) {
    const count =
      file.format === "csv" ? file.rowCount : file.itemCount;
    console.log(`- ${file.path}: ${count}`);
  }
  console.log(
    `Expenditure total: ` +
      `${manifest.totals.expenditureTotalAmountThousandYen}`,
  );
  console.log(
    `Revenue total: ${manifest.totals.revenueTotalAmountThousandYen}`,
  );
  console.log(
    `Allocation relations: ` +
      `${manifest.counts.publicBudgetRevenueAllocationCount}`,
  );
  console.log(`Validation: ${manifest.validation.status}`);
  console.log(`Output hash: ${outputHash}`);
  console.log(`Output: ${options.outputPath}`);
  if (manifest.validation.status === "FAIL") {
    for (const error of manifest.validation.errors) {
      console.error(`- ${error.errorCode}: ${error.message}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
