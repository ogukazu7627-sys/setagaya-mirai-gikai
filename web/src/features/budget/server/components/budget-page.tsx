import "server-only";

import { BudgetExplorer } from "../../client/components/budget-explorer";
import { loadBudgetExploration } from "../loaders/load-budget-exploration";
import { loadBudgetPageOverview } from "../loaders/load-budget-page-overview";
import { BudgetOverviewSection } from "./budget-overview-section";

export async function BudgetPage() {
  const [overview, exploration] = await Promise.all([
    loadBudgetPageOverview(),
    loadBudgetExploration(),
  ]);

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <BudgetExplorer exploration={exploration} />
      <BudgetOverviewSection overview={overview} />
    </div>
  );
}
