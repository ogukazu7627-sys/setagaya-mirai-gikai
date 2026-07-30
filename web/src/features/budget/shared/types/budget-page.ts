export type BudgetPageLoadStatus = "ready" | "empty" | "error";

export interface BudgetPageAccountSummary {
  accountName: string;
  expenditureAmountThousandYen: number;
  revenueAmountThousandYen: number;
}

export interface BudgetPageOverview {
  title: string;
  loadStatus: BudgetPageLoadStatus;
  accountCount: number;
  generalAccount: BudgetPageAccountSummary | null;
  expenditureTotalAmountThousandYen: number | null;
  revenueTotalAmountThousandYen: number | null;
  identityCount: number | null;
  validationStatus: string;
  isValidated: boolean;
}

export type BudgetNetworkTopicTone = "cyan" | "mint" | "gold";

export interface BudgetNetworkPosition {
  x: number;
  y: number;
}

export interface BudgetNetworkTopic {
  id: string;
  label: string;
  tone: BudgetNetworkTopicTone;
  mobile: BudgetNetworkPosition;
  desktop: BudgetNetworkPosition;
}

export interface BudgetNetworkDecoration {
  id: string;
  size: number;
  mobile: BudgetNetworkPosition;
  desktop: BudgetNetworkPosition;
}

export interface BudgetNetworkEdge {
  source: string;
  target: string;
  strength: "primary" | "secondary";
}

export interface BudgetNetworkPoint extends BudgetNetworkPosition {
  id: string;
}

export interface BudgetNetworkRenderedEdge {
  id: string;
  source: BudgetNetworkPoint;
  target: BudgetNetworkPoint;
  strength: BudgetNetworkEdge["strength"];
}
