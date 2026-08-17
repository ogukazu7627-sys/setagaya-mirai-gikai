import "server-only";

import { BudgetExplorer } from "../../client/components/budget-explorer";
import { loadBudgetExploration } from "../loaders/load-budget-exploration";
import { loadBudgetPageOverview } from "../loaders/load-budget-page-overview";
import { loadBudgetQuestionMapGroups } from "../loaders/load-budget-questions";
import { BudgetOverviewSection } from "./budget-overview-section";

export async function BudgetPage() {
  const [overview, exploration, questionGroups] = await Promise.all([
    loadBudgetPageOverview(),
    loadBudgetExploration(),
    loadBudgetQuestionMapGroups(),
  ]);

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <BudgetExplorer
        exploration={exploration}
        questionGroups={questionGroups}
      />
      <BudgetOverviewSection overview={overview} />
    </div>
  );
}
