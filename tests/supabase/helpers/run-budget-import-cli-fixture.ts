import { runBudgetImportCli } from "../../../packages/seed/budget/import-public-budget-cli";
import { publicBudgetTestExpectations } from "../../../packages/seed/budget/public-budget-test-fixture";

runBudgetImportCli(process.argv.slice(2), {
  expectations: publicBudgetTestExpectations,
}).then((exitCode) => {
  process.exitCode = exitCode;
});
