import { pathToFileURL } from "node:url";
import { getDefaultBudgetTopicDefinitionsDirectory } from "./budget-topic-definitions";
import { writeBudgetConcreteTopicExpansionDefinitionFiles } from "./budget-concrete-topic-expansion-catalog";

export function runBudgetConcreteTopicDefinitionCli(): number {
  try {
    const files = writeBudgetConcreteTopicExpansionDefinitionFiles(
      getDefaultBudgetTopicDefinitionsDirectory()
    );
    console.log(
      `[budget:web:topics:expand-definitions] PASS files=${files.length}`
    );
    return 0;
  } catch (error) {
    console.error(
      `[budget:web:topics:expand-definitions] FAIL: ${
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
  process.exitCode = runBudgetConcreteTopicDefinitionCli();
}
