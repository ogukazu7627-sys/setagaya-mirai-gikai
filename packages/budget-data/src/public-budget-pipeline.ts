export interface PublicBudgetBuildPhase {
  label: string;
  script: string;
  outputs: readonly string[];
}

export const PUBLIC_BUDGET_BUILD_INPUTS = [
  "processed/core/budget_programs.csv",
  "processed/core/budget_sections.csv",
  "processed/core/budget_items.csv",
  "processed/core/budget_program_groups.csv",
  "processed/core/budget_program_identities.csv",
  "processed/core/budget_program_identity_members.csv",
  "processed/core/budget_revenue_details.csv",
  "processed/core/budget_revenue_sections.csv",
  "processed/core/budget_revenue_items.csv",
  "processed/core/budget_revenue_allocations.csv",
  "processed/validation/dataset_manifest.json",
  "config/department_name_map.csv",
] as const;

export const PUBLIC_BUDGET_PRODUCTION_FILES = [
  "processed/public/public_budget_program_identities.csv",
  "processed/public/public_budget_programs.csv",
  "processed/public/public_budget_items.json",
  "processed/public/public_budget_revenue_details.csv",
  "processed/public/public_budget_revenue_items.json",
  "processed/public/public_budget_revenue_allocations.json",
] as const;

export const PUBLIC_BUDGET_PHASE_ARTIFACT_SEQUENCE = [
  "processed/public/public_budget_programs.csv",
  "processed/public/public_budget_items.json",
  "processed/public/public_budget_program_identities.csv",
  "processed/public/public_budget_revenue_details.csv",
  "processed/public/public_budget_revenue_items.json",
  "processed/public/public_budget_revenue_allocations.json",
  "processed/public/public_dataset_manifest.json",
] as const;

export const PUBLIC_BUDGET_BUILD_PHASES: readonly PublicBudgetBuildPhase[] =
  [
    {
      label: "public expenditure read models",
      script: "build:public",
      outputs: [
        "processed/public/public_budget_programs.csv",
        "processed/public/public_budget_items.json",
      ],
    },
    {
      label: "public budget program identity master",
      script: "build:public-program-identities",
      outputs: [
        "processed/public/public_budget_program_identities.csv",
        "processed/public/public_budget_programs.csv",
      ],
    },
    {
      label: "public revenue read models",
      script: "build:public-revenue",
      outputs: [
        "processed/public/public_budget_revenue_details.csv",
        "processed/public/public_budget_revenue_items.json",
        "processed/public/public_budget_revenue_allocations.json",
        "docs/public_budget_revenue_usage_rules.md",
      ],
    },
    {
      label: "public dataset manifest and validation",
      script: "build:public-manifest",
      outputs: ["processed/public/public_dataset_manifest.json"],
    },
  ];

export const PUBLIC_BUDGET_BUILD_OUTPUTS = [
  ...PUBLIC_BUDGET_PRODUCTION_FILES,
  "processed/public/public_dataset_manifest.json",
  "docs/public_budget_revenue_usage_rules.md",
] as const;
