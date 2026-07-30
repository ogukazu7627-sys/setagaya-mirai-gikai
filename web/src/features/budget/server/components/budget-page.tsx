import "server-only";

import { BudgetExplorer } from "../../client/components/budget-explorer";
import { loadBudgetPageOverview } from "../loaders/load-budget-page-overview";
import { BudgetOverviewSection } from "./budget-overview-section";

export async function BudgetPage() {
  const overview = await loadBudgetPageOverview();

  return (
    <div className="min-h-dvh bg-mirai-surface">
      <BudgetExplorer />
      <BudgetOverviewSection overview={overview} />
    </div>
  );
}
