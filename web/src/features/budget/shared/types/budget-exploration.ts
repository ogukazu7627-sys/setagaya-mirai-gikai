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

export interface BudgetExplorationData {
  activeDatasetId: string | null;
  availability: "available" | "temporarily_unavailable";
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
