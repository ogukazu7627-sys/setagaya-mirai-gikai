import {
  BUDGET_BUILD_INPUTS,
  BUDGET_BUILD_OUTPUTS,
  BUDGET_BUILD_PHASES,
} from "./budget-pipeline";
import {
  BUDGET_REVENUE_BUILD_INPUTS,
  BUDGET_REVENUE_BUILD_OUTPUTS,
} from "./budget-revenue-pipeline";
import { PUBLIC_BUDGET_PRODUCTION_FILES } from "./public-budget-pipeline";

export interface BudgetCompleteBuildPhase {
  label: string;
  script: string;
  outputs: readonly string[];
}

export const BUDGET_COMPLETE_BUILD_INPUTS = [
  ...new Set([
    ...BUDGET_BUILD_INPUTS,
    ...BUDGET_REVENUE_BUILD_INPUTS.filter(
      (relativePath) =>
        !relativePath.startsWith("processed/") ||
        relativePath ===
          "processed/audit/raw_pdf_revenue_allocations_sample.csv",
    ),
  ]),
] as const;

export const BUDGET_COMPLETE_BUILD_PHASES: readonly BudgetCompleteBuildPhase[] =
  [
    ...BUDGET_BUILD_PHASES.filter(
      (phase) => phase.script !== "build:manifest",
    ),
    {
      label: "revenue, allocation, public, and manifests",
      script: "build:revenue-all",
      outputs: BUDGET_REVENUE_BUILD_OUTPUTS,
    },
  ];

export const BUDGET_COMPLETE_BUILD_OUTPUTS = [
  ...new Set([
    ...BUDGET_BUILD_OUTPUTS,
    ...BUDGET_REVENUE_BUILD_OUTPUTS,
    ...PUBLIC_BUDGET_PRODUCTION_FILES,
    "processed/public/public_dataset_manifest.json",
  ]),
] as const;

export const BUDGET_COMPLETE_VALIDATION_ERROR_FILES = [
  "processed/validation/validation_errors.csv",
  "processed/validation/revenue_validation_errors.csv",
  "processed/validation/revenue_allocation_validation_errors.csv",
] as const;
