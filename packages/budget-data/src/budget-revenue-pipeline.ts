export interface BudgetRevenueBuildPhase {
  label: string;
  script: string;
  outputs: readonly string[];
}

export const BUDGET_REVENUE_BUILD_INPUTS = [
  "raw/ippansainyu.csv",
  "raw/r8tousyoyosanallpage.pdf",
  "config/budget-accounts.json",
  "config/department_name_map.csv",
  "config/revenue_allocation_source_overrides.csv",
  "config/revenue_allocation_target_overrides.csv",
  "processed/raw_pdf_revenue_allocations_sample.csv",
  "processed/budget_programs.csv",
  "processed/budget_sections.csv",
  "processed/budget_items.csv",
] as const;

export const BUDGET_REVENUE_IMMUTABLE_EXPENDITURE_FILES = [
  "processed/budget_programs.csv",
  "processed/budget_sections.csv",
  "processed/budget_items.csv",
] as const;

export const BUDGET_REVENUE_BUILD_PHASES: readonly BudgetRevenueBuildPhase[] =
  [
    {
      label: "revenue details",
      script: "build:revenue-details",
      outputs: ["processed/budget_revenue_details.csv"],
    },
    {
      label: "revenue sections",
      script: "build:revenue-sections",
      outputs: ["processed/budget_revenue_sections.csv"],
    },
    {
      label: "revenue items",
      script: "build:revenue-items",
      outputs: ["processed/budget_revenue_items.csv"],
    },
    {
      label: "revenue core validation",
      script: "validate:revenue",
      outputs: [
        "processed/revenue_validation_errors.csv",
        "docs/revenue_validation_report.md",
      ],
    },
    {
      label: "raw PDF revenue allocations",
      script: "extract:pdf-revenue-allocations",
      outputs: [
        "processed/raw_pdf_revenue_allocations.csv",
        "docs/pdf_revenue_allocation_full_extraction_report.md",
      ],
    },
    {
      label: "revenue allocation source matching",
      script: "build:revenue-allocation-source-matches",
      outputs: [
        "processed/staging/revenue_allocation_source_matches.csv",
        "config/revenue_allocation_source_overrides.csv",
        "docs/revenue_allocation_source_match_report.md",
      ],
    },
    {
      label: "budget program groups",
      script: "build:program-groups",
      outputs: ["processed/budget_program_groups.csv"],
    },
    {
      label: "revenue allocation target linking",
      script: "build:revenue-allocation-links",
      outputs: [
        "processed/budget_program_identities.csv",
        "processed/budget_program_identity_members.csv",
        "processed/budget_revenue_allocations.csv",
        "processed/staging/revenue_allocation_group_ambiguities.csv",
        "config/revenue_allocation_target_overrides.csv",
        "docs/revenue_allocation_target_match_report.md",
        "docs/revenue_allocation_identity_resolution_report.md",
      ],
    },
    {
      label: "revenue allocation validation",
      script: "validate:revenue-allocations",
      outputs: [
        "processed/revenue_allocation_validation_errors.csv",
        "docs/revenue_allocation_validation_report.md",
        "docs/budget_revenue_data_dictionary.md",
      ],
    },
    {
      label: "public expenditure read models",
      script: "build:public",
      outputs: [
        "processed/public/public_budget_programs.csv",
        "processed/public/public_budget_items.json",
      ],
    },
    {
      label: "public revenue read model",
      script: "build:public-revenue",
      outputs: [
        "processed/public/public_budget_revenue_details.csv",
        "processed/public/public_budget_revenue_items.json",
        "processed/public/public_budget_revenue_allocations.json",
        "docs/public_budget_revenue_usage_rules.md",
      ],
    },
    {
      label: "public budget program identity read model",
      script: "build:public-program-identities",
      outputs: [
        "processed/public/public_budget_program_identities.csv",
        "processed/public/public_budget_programs.csv",
      ],
    },
  ];

export const BUDGET_REVENUE_POSTFLIGHT_PHASE: BudgetRevenueBuildPhase = {
  label: "complete dataset manifest",
  script: "build:manifest",
  outputs: ["processed/dataset_manifest.json"],
};

export const BUDGET_REVENUE_PUBLIC_POSTFLIGHT_PHASE: BudgetRevenueBuildPhase =
  {
    label: "public dataset manifest",
    script: "build:public-manifest",
    outputs: ["processed/public/public_dataset_manifest.json"],
  };

export const BUDGET_REVENUE_BUILD_OUTPUTS = [
  ...new Set([
    ...BUDGET_REVENUE_BUILD_PHASES.flatMap((phase) => phase.outputs),
    ...BUDGET_REVENUE_POSTFLIGHT_PHASE.outputs,
    ...BUDGET_REVENUE_PUBLIC_POSTFLIGHT_PHASE.outputs,
  ]),
] as const;
