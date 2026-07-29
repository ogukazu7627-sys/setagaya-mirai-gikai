import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  buildPublicBudgetRevenueReadModel,
  renderPublicBudgetRevenueUsageRules,
  serializePublicBudgetRevenueAllocations,
  serializePublicBudgetRevenueDetails,
  serializePublicBudgetRevenueItems,
  validatePublicBudgetRevenueDetailCsv,
  validatePublicBudgetRevenueReadModel,
} from "./public-budget-revenue";

interface CliOptions {
  detailsPath: string;
  sectionsPath: string;
  itemsPath: string;
  allocationsPath: string;
  programGroupsPath: string;
  departmentMapPath: string;
  publicDetailsPath: string;
  publicItemsPath: string;
  publicAllocationsPath: string;
  usageRulesPath: string;
}

interface CoreInput {
  path: string;
  bytes: Buffer;
  hash: string;
}

function resolveCliPath(value: string, repoRoot: string): string {
  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(repoRoot, value);
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const options: CliOptions = {
    detailsPath: path.join(
      repoRoot,
      "processed", "core", "budget_revenue_details.csv",
    ),
    sectionsPath: path.join(
      repoRoot,
      "processed", "core", "budget_revenue_sections.csv",
    ),
    itemsPath: path.join(
      repoRoot,
      "processed", "core", "budget_revenue_items.csv",
    ),
    allocationsPath: path.join(
      repoRoot,
      "processed", "core", "budget_revenue_allocations.csv",
    ),
    programGroupsPath: path.join(
      repoRoot,
      "processed", "core", "budget_program_groups.csv",
    ),
    departmentMapPath: path.join(
      repoRoot,
      "config",
      "department_name_map.csv",
    ),
    publicDetailsPath: path.join(
      repoRoot,
      "processed",
      "public",
      "public_budget_revenue_details.csv",
    ),
    publicItemsPath: path.join(
      repoRoot,
      "processed",
      "public",
      "public_budget_revenue_items.json",
    ),
    publicAllocationsPath: path.join(
      repoRoot,
      "processed",
      "public",
      "public_budget_revenue_allocations.json",
    ),
    usageRulesPath: path.join(
      repoRoot,
      "docs",
      "public_budget_revenue_usage_rules.md",
    ),
  };
  const optionNames: Record<string, keyof CliOptions> = {
    "--details": "detailsPath",
    "--sections": "sectionsPath",
    "--items": "itemsPath",
    "--allocations": "allocationsPath",
    "--program-groups": "programGroupsPath",
    "--department-map": "departmentMapPath",
    "--public-details-output": "publicDetailsPath",
    "--public-items-output": "publicItemsPath",
    "--public-allocations-output": "publicAllocationsPath",
    "--usage-rules-output": "usageRulesPath",
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    const optionName = optionNames[argument];
    const value = args[index + 1];
    if (!optionName || !value) {
      throw new Error(`不明または値のない引数です: ${argument}`);
    }
    options[optionName] = resolveCliPath(value, repoRoot);
    index += 1;
  }
  return options;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function decodeUtf8(bytes: Uint8Array, sourceName: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${sourceName}がUTF-8ではありません。`);
  }
}

async function readCoreInput(inputPath: string): Promise<CoreInput> {
  const bytes = await fs.readFile(inputPath);
  return {
    path: inputPath,
    bytes,
    hash: sha256(bytes),
  };
}

async function readOptionalCoreInput(
  inputPath: string,
): Promise<CoreInput | null> {
  try {
    return await readCoreInput(inputPath);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

async function assertCoreInputsUnchanged(
  inputs: readonly CoreInput[],
): Promise<void> {
  for (const input of inputs) {
    const current = await fs.readFile(input.path);
    if (sha256(current) !== input.hash) {
      throw new Error(
        `公開歳入データ生成中に入力が変更されました: ${input.path}`,
      );
    }
  }
}

function assertOutputPathsAreSeparate(
  inputs: readonly CoreInput[],
  outputs: readonly string[],
): void {
  const inputPaths = new Set(
    inputs.map((input) => path.normalize(input.path)),
  );
  for (const output of outputs) {
    if (inputPaths.has(path.normalize(output))) {
      throw new Error(
        `公開出力パスにコア入力を指定できません: ${output}`,
      );
    }
  }
  if (new Set(outputs.map(path.normalize)).size !== outputs.length) {
    throw new Error("公開出力パスが重複しています。");
  }
}

async function readUtf8(pathname: string): Promise<string> {
  return decodeUtf8(await fs.readFile(pathname), pathname);
}

async function writeArtifactsAtomically(
  artifacts: Array<{
    path: string;
    content: string;
    validate: (content: string) => void;
  }>,
): Promise<void> {
  const temporaryPaths = artifacts.map(
    (artifact) => `${artifact.path}.${process.pid}.tmp`,
  );
  try {
    for (let index = 0; index < artifacts.length; index += 1) {
      await fs.mkdir(path.dirname(artifacts[index].path), {
        recursive: true,
      });
      await fs.writeFile(
        temporaryPaths[index],
        artifacts[index].content,
        "utf8",
      );
    }
    for (let index = 0; index < artifacts.length; index += 1) {
      artifacts[index].validate(
        await readUtf8(temporaryPaths[index]),
      );
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
  const mandatoryInputs = await Promise.all([
    readCoreInput(options.detailsPath),
    readCoreInput(options.sectionsPath),
    readCoreInput(options.itemsPath),
    readCoreInput(options.allocationsPath),
    readCoreInput(options.programGroupsPath),
  ]);
  const optionalDepartmentMap = await readOptionalCoreInput(
    options.departmentMapPath,
  );
  const allInputs = optionalDepartmentMap
    ? [...mandatoryInputs, optionalDepartmentMap]
    : mandatoryInputs;
  assertOutputPathsAreSeparate(allInputs, [
    options.publicDetailsPath,
    options.publicItemsPath,
    options.publicAllocationsPath,
    options.usageRulesPath,
  ]);

  const [
    detailsInput,
    sectionsInput,
    itemsInput,
    allocationsInput,
    programGroupsInput,
  ] = mandatoryInputs;
  const model = buildPublicBudgetRevenueReadModel(
    decodeUtf8(detailsInput.bytes, detailsInput.path),
    decodeUtf8(sectionsInput.bytes, sectionsInput.path),
    decodeUtf8(itemsInput.bytes, itemsInput.path),
    decodeUtf8(allocationsInput.bytes, allocationsInput.path),
    decodeUtf8(programGroupsInput.bytes, programGroupsInput.path),
    optionalDepartmentMap
      ? decodeUtf8(
          optionalDepartmentMap.bytes,
          optionalDepartmentMap.path,
        )
      : undefined,
  );
  const validation = validatePublicBudgetRevenueReadModel(model);
  const publicDetailsCsv = serializePublicBudgetRevenueDetails(
    model.details,
  );
  const publicItemsJson = serializePublicBudgetRevenueItems(
    model.revenueItems,
  );
  const publicAllocationsJson =
    serializePublicBudgetRevenueAllocations(model.allocations);
  const usageRules = renderPublicBudgetRevenueUsageRules();
  validatePublicBudgetRevenueDetailCsv(publicDetailsCsv);

  await assertCoreInputsUnchanged(allInputs);
  await writeArtifactsAtomically([
    {
      path: options.publicDetailsPath,
      content: publicDetailsCsv,
      validate: validatePublicBudgetRevenueDetailCsv,
    },
    {
      path: options.publicItemsPath,
      content: publicItemsJson,
      validate: (content) => {
        const parsed = JSON.parse(content) as unknown[];
        if (parsed.length !== validation.itemRowCount) {
          throw new Error(
            "一時出力したpublic_budget_revenue_items.jsonの件数が不正です。",
          );
        }
      },
    },
    {
      path: options.publicAllocationsPath,
      content: publicAllocationsJson,
      validate: (content) => {
        const parsed = JSON.parse(content) as unknown[];
        if (parsed.length !== validation.allocationRowCount) {
          throw new Error(
            "一時出力したpublic_budget_revenue_allocations.jsonの件数が不正です。",
          );
        }
      },
    },
    {
      path: options.usageRulesPath,
      content: usageRules,
      validate: (content) => {
        if (
          !content.includes(
            "# 令和8年度当初予算 公開歳入データ利用ルール",
          ) ||
          !content.includes("allocationを合計してはいけない")
        ) {
          throw new Error(
            "一時出力した公開歳入データ利用ルールが不正です。",
          );
        }
      },
    },
  ]);
  await assertCoreInputsUnchanged(allInputs);

  console.log(
    `Public revenue details: ${validation.detailRowCount.toLocaleString(
      "en-US",
    )} rows`,
  );
  console.log(
    `Public revenue items: ${validation.itemRowCount.toLocaleString(
      "en-US",
    )} items`,
  );
  console.log(
    `Nested sections: ${validation.nestedSectionRowCount.toLocaleString(
      "en-US",
    )} rows`,
  );
  console.log(
    `Public revenue allocations: ` +
      validation.allocationRowCount.toLocaleString("en-US") +
      " relations",
  );
  console.log(
    `Resolution: exact_group=` +
      validation.exactGroupAllocationCount.toLocaleString("en-US") +
      ", public_identity=" +
      validation.publicIdentityAllocationCount.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `Current amount total: ` +
      validation.detailCurrentTotalThousandYen.toLocaleString(
        "en-US",
      ) +
      " thousand yen",
  );
  console.log(
    `Zero-amount details retained: ` +
      validation.zeroAmountDetailCount.toLocaleString("en-US"),
  );
  console.log(
    `Non-null allocation amounts: ` +
      validation.nonNullAllocationAmountCount.toLocaleString(
        "en-US",
      ),
  );
  console.log(
    `Blank department display names: ` +
      validation.blankDepartmentDisplayNameCount.toLocaleString(
        "en-US",
      ),
  );
  console.log("Core input hash regression: PASS");
  console.log("Validation: PASS");
  console.log(`Output: ${options.publicDetailsPath}`);
  console.log(`Output: ${options.publicItemsPath}`);
  console.log(`Output: ${options.publicAllocationsPath}`);
  console.log(`Output: ${options.usageRulesPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
