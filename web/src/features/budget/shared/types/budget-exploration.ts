import type { BudgetAccountCode } from "./budget";
import type { BudgetNetworkTopicTone } from "./budget-page";

export interface BudgetExplorationProgram {
  budgetProgramIdentityId: string;
  displayProgramName: string;
  accountCode: BudgetAccountCode;
  accountName: string;
  kanName: string;
  kouName: string;
  mokuName: string;
  departmentDisplayName: string;
  amountThousandYen: number;
  isZeroAmount: boolean;
  relationType: "responds_to" | "supports" | "maintains" | "enables";
  categorySlugs: string[];
}

export interface BudgetExplorationTopic {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  topicKind: "problem" | "goal" | "administrative_function";
  categorySlugs: string[];
  programs: BudgetExplorationProgram[];
}

export interface BudgetExplorationCategory {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  sortOrder: number;
  tone: BudgetNetworkTopicTone;
  topics: BudgetExplorationTopic[];
}

export interface BudgetExplorationDataset {
  id: string;
  fiscalYear: number;
  budgetType: string;
  schemaVersion: string;
  currencyUnit: string;
  validationStatus: string;
  expenditureTotalAmountThousandYen: number | null;
}

export type BudgetExplorationAvailability =
  | "available"
  | "no_active_dataset"
  | "temporarily_unavailable";

export interface BudgetExplorationData {
  activeDataset: BudgetExplorationDataset | null;
  availability: BudgetExplorationAvailability;
  categories: BudgetExplorationCategory[];
}

export interface BudgetProgramReturnContext {
  categorySlug: string;
  topicSlug?: string;
}

export type BudgetExplorerStableView =
  | { kind: "overview" }
  | {
      kind: "category";
      category: BudgetExplorationCategory;
    }
  | {
      kind: "topic";
      category: BudgetExplorationCategory;
      topic: BudgetExplorationTopic;
    };

export type BudgetExplorerTransitionTarget =
  | BudgetExplorerStableView
  | {
      kind: "program";
      budgetProgramIdentityId: string;
    };

export type BudgetExplorerView =
  | BudgetExplorerStableView
  | {
      kind: "transitioning";
      current: BudgetExplorerStableView;
      target: BudgetExplorerTransitionTarget;
    };
