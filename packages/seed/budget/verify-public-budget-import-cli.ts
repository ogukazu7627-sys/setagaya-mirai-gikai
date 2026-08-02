import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { readPublicBudgetDataset } from "./read-public-budget-files";
import { verifyPersistedPublicBudgetDataset } from "./verify-public-budget-import";

async function main(argv: string[]): Promise<number> {
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  const { values } = parseArgs({
    args: normalizedArgv,
    strict: true,
    options: { "input-dir": { type: "string" } },
  });
  if (!values["input-dir"]) {
    throw new Error("--input-dir は必須です");
  }
  const inputDirectory = path.resolve(
    process.env.INIT_CWD ?? process.cwd(),
    values["input-dir"]
  );
  const dataset = readPublicBudgetDataset({ inputDirectory });
  const result = await verifyPersistedPublicBudgetDataset(dataset);
  console.log(JSON.stringify(result, null, 2));
  return result.status === "PASS" ? 0 : 1;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
