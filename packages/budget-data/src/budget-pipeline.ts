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
      "processed/budget_programs.csv",
      "docs/department_mapping_report.md",
    ],
  },
  {
    label: "general-account raw PDF sections",
    script: "build:raw-sections:general",
    outputs: ["processed/raw_pdf_sections.csv"],
  },
  {
    label: "special-account raw PDF sections",
    script: "build:raw-sections:special",
    outputs: ["processed/raw_pdf_sections_special.csv"],
  },
  {
    label: "normalized budget sections",
    script: "build:sections",
    outputs: ["processed/budget_sections.csv"],
  },
  {
    label: "budget items",
    script: "build:items",
    outputs: ["processed/budget_items.csv"],
  },
  {
    label: "all-account validation",
    script: "validate:all",
    outputs: [
      "processed/validation_errors.csv",
      "docs/validation_report.md",
    ],
  },
  {
    label: "dataset manifest",
    script: "build:manifest",
    outputs: ["processed/dataset_manifest.json"],
  },
] as const;

export const BUDGET_BUILD_OUTPUTS = BUDGET_BUILD_PHASES.flatMap(
  (phase) => phase.outputs,
);
