export interface BudgetBuildPhase {
  label: string;
  script: string;
  outputs: readonly string[];
}

export const BUDGET_BUILD_INPUTS = [
  "raw/ippansaisyutu.csv",
  "raw/r8tousyoyosanallpage.pdf",
  "config/budget-accounts.json",
  "config/department_name_map.csv",
] as const;

export const BUDGET_BUILD_PHASES: readonly BudgetBuildPhase[] = [
  {
    label: "budget programs",
    script: "build:programs",
    outputs: [
      "processed/core/budget_programs.csv",
      "docs/department_mapping_report.md",
    ],
  },
  {
    label: "general-account raw PDF sections",
    script: "build:raw-sections:general",
    outputs: ["processed/audit/raw_pdf_sections.csv"],
  },
  {
    label: "special-account raw PDF sections",
    script: "build:raw-sections:special",
    outputs: ["processed/audit/raw_pdf_sections_special.csv"],
  },
  {
    label: "normalized budget sections",
    script: "build:sections",
    outputs: ["processed/core/budget_sections.csv"],
  },
  {
    label: "budget items",
    script: "build:items",
    outputs: ["processed/core/budget_items.csv"],
  },
  {
    label: "all-account validation",
    script: "validate:all",
    outputs: [
      "processed/validation/validation_errors.csv",
      "docs/validation/validation_report.md",
    ],
  },
  {
    label: "dataset manifest",
    script: "build:manifest",
    outputs: ["processed/validation/dataset_manifest.json"],
  },
] as const;

export const BUDGET_BUILD_OUTPUTS = BUDGET_BUILD_PHASES.flatMap(
  (phase) => phase.outputs,
);
