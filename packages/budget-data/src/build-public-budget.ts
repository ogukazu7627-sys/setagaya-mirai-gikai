import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildPublicBudgetReadModel,
  serializePublicBudgetItems,
  serializePublicBudgetPrograms,
  validatePublicBudgetProgramCsv,
  validatePublicBudgetReadModel,
} from "./public-budget";

interface CliOptions {
  programsPath: string;
  sectionsPath: string;
  itemsPath: string;
  publicProgramsPath: string;
  publicItemsPath: string;
}

interface CoreInput {
  path: string;
  bytes: Buffer;
  hash: string;
}

function readCliOptions(args: string[]): CliOptions {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  let programsPath = path.join(
    repoRoot,
    "processed",
    "budget_programs.csv",
  );
  let sectionsPath = path.join(
    repoRoot,
    "processed",
    "budget_sections.csv",
  );
  let itemsPath = path.join(repoRoot, "processed", "budget_items.csv");
  let publicProgramsPath = path.join(
    repoRoot,
    "processed",
    "public",
    "public_budget_programs.csv",
  );
  let publicItemsPath = path.join(
    repoRoot,
    "processed",
    "public",
    "public_budget_items.json",
  );

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    const value = args[index + 1];
    if (argument === "--programs" && value) {
      programsPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--sections" && value) {
      sectionsPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--items" && value) {
      itemsPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--public-programs-output" && value) {
      publicProgramsPath = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--public-items-output" && value) {
      publicItemsPath = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`不明な引数です: ${argument}`);
  }

  return {
    programsPath,
    sectionsPath,
    itemsPath,
    publicProgramsPath,
    publicItemsPath,
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readCoreInput(inputPath: string): Promise<CoreInput> {
  const bytes = await fs.readFile(inputPath);
  return {
    path: inputPath,
    bytes,
    hash: sha256(bytes),
  };
}

async function assertCoreInputsUnchanged(
  coreInputs: readonly CoreInput[],
): Promise<void> {
  for (const input of coreInputs) {
    const currentBytes = await fs.readFile(input.path);
    const currentHash = sha256(currentBytes);
    if (currentHash !== input.hash) {
      throw new Error(
        `公開データ生成中にコアCSVが変更されました: ${input.path}`,
      );
    }
  }
}

async function writeTemporaryFile(
  outputPath: string,
  content: string,
): Promise<string> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, content, "utf8");
  return temporaryPath;
}

async function removeIfPresent(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
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

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const coreInputs = await Promise.all([
    readCoreInput(options.programsPath),
    readCoreInput(options.sectionsPath),
    readCoreInput(options.itemsPath),
  ]);
  const [programsInput, sectionsInput, itemsInput] = coreInputs;
  const model = buildPublicBudgetReadModel(
    programsInput.bytes.toString("utf8"),
    sectionsInput.bytes.toString("utf8"),
    itemsInput.bytes.toString("utf8"),
  );
  const validation = validatePublicBudgetReadModel(model);
  const publicProgramsCsv = serializePublicBudgetPrograms(model.programs);
  const publicItemsJson = serializePublicBudgetItems(model.budgetItems);
  validatePublicBudgetProgramCsv(publicProgramsCsv);

  const temporaryProgramsPath = await writeTemporaryFile(
    options.publicProgramsPath,
    publicProgramsCsv,
  );
  let temporaryItemsPath: string | null = null;
  try {
    temporaryItemsPath = await writeTemporaryFile(
      options.publicItemsPath,
      publicItemsJson,
    );
    await assertCoreInputsUnchanged(coreInputs);
    await fs.rename(temporaryProgramsPath, options.publicProgramsPath);
    await fs.rename(temporaryItemsPath, options.publicItemsPath);
    temporaryItemsPath = null;
  } finally {
    await removeIfPresent(temporaryProgramsPath);
    if (temporaryItemsPath) {
      await removeIfPresent(temporaryItemsPath);
    }
  }

  console.log(`Core programs: ${options.programsPath}`);
  console.log(`Core sections: ${options.sectionsPath}`);
  console.log(`Core items: ${options.itemsPath}`);
  console.log(
    `Public programs: ${validation.publicProgramRowCount.toLocaleString(
      "en-US",
    )} rows`,
  );
  console.log(
    `Public budget items: ${validation.publicBudgetItemRowCount.toLocaleString(
      "en-US",
    )} items`,
  );
  console.log(
    `Nested sections: ${validation.nestedSectionRowCount.toLocaleString(
      "en-US",
    )} rows`,
  );
  for (const accountCode of Object.keys(
    validation.accountProgramTotalsThousandYen,
  )) {
    console.log(
      `${accountCode}: program=${validation.accountProgramTotalsThousandYen[
        accountCode
      ].toLocaleString("en-US")}, ` +
        `section=${validation.accountSectionTotalsThousandYen[
          accountCode
        ].toLocaleString("en-US")} thousand yen`,
    );
  }
  console.log(
    `All-account total: ${validation.programTotalAmountThousandYen.toLocaleString(
      "en-US",
    )} thousand yen`,
  );
  console.log(
    `Zero-amount programs retained: ` +
      validation.zeroAmountProgramCount.toLocaleString("en-US"),
  );
  console.log("Funding columns published: 0");
  console.log("Core CSV hash regression: PASS");
  console.log("Validation: PASS");
  console.log(`Output: ${options.publicProgramsPath}`);
  console.log(`Output: ${options.publicItemsPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
