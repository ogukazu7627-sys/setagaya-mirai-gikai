import path from "node:path";
import type { PublicBudgetDataset } from "./read-public-budget-files";

export const budgetDatasetStorageBucket = "budget-datasets";

export interface BudgetImportArtifact {
  logicalFileName: string;
  filePath: string;
  content: Buffer;
  sha256: string;
  storageObjectPath: string;
  contentType: "application/json" | "text/csv";
}

export interface BudgetImportPayload {
  manifest: PublicBudgetDataset["manifest"];
  manifest_sha256: string;
  import_summary: {
    budget_item_section_count: number;
    revenue_section_count: number;
    source_document_count: number;
  };
  budget_items: Record<string, unknown>[];
  budget_program_identities: Record<string, unknown>[];
  budget_programs: Record<string, unknown>[];
  budget_item_sections: Record<string, unknown>[];
  budget_revenue_items: Record<string, unknown>[];
  budget_revenue_sections: Record<string, unknown>[];
  budget_revenue_details: Record<string, unknown>[];
  budget_revenue_allocations: Record<string, unknown>[];
  budget_source_documents: Record<string, unknown>[];
}

export interface BuiltBudgetImport {
  payload: BudgetImportPayload;
  artifacts: BudgetImportArtifact[];
}

function budgetTypeStorageSegment(budgetType: string): string {
  if (budgetType !== "initial_budget") {
    throw new Error(`未対応の予算種別です: ${budgetType}`);
  }
  return "initial";
}

export function buildBudgetDatasetStoragePrefix(
  dataset: PublicBudgetDataset
): string {
  return [
    dataset.manifest.fiscalYear,
    budgetTypeStorageSegment(dataset.manifest.budgetType),
    dataset.manifestSha256,
  ].join("/");
}

function contentType(fileName: string): BudgetImportArtifact["contentType"] {
  return path.extname(fileName) === ".csv" ? "text/csv" : "application/json";
}

function buildArtifacts(dataset: PublicBudgetDataset): BudgetImportArtifact[] {
  const storagePrefix = buildBudgetDatasetStoragePrefix(dataset);
  const artifacts: BudgetImportArtifact[] = [
    {
      logicalFileName: "public_dataset_manifest.json",
      filePath: dataset.manifestFilePath,
      content: dataset.manifestContent,
      sha256: dataset.manifestSha256,
      storageObjectPath: `${storagePrefix}/public_dataset_manifest.json`,
      contentType: "application/json",
    },
    ...dataset.files.map((file) => ({
      logicalFileName: file.logicalFileName,
      filePath: file.filePath,
      content: file.content,
      sha256: file.actualSha256,
      storageObjectPath: `${storagePrefix}/${file.logicalFileName}`,
      contentType: contentType(file.logicalFileName),
    })),
  ];
  return artifacts.sort((left, right) =>
    left.logicalFileName.localeCompare(right.logicalFileName)
  );
}

function buildSourceDocuments(
  dataset: PublicBudgetDataset,
  artifacts: BudgetImportArtifact[]
): Record<string, unknown>[] {
  const sourceDocuments = new Map<string, Record<string, unknown>>();

  for (const artifact of artifacts) {
    const sourceType = "public_dataset_file";
    sourceDocuments.set(`${sourceType}:${artifact.logicalFileName}`, {
      source_file: artifact.logicalFileName,
      source_type: sourceType,
      official_url: null,
      note: "Versioned public dataset input",
      fiscal_year: dataset.manifest.fiscalYear,
      storage_object_path: artifact.storageObjectPath,
      sha256: artifact.sha256,
    });
  }

  const addOfficialSource = (
    sourceType: "official_csv" | "official_pdf",
    sourceFile: string
  ) => {
    sourceDocuments.set(`${sourceType}:${sourceFile}`, {
      source_file: sourceFile,
      source_type: sourceType,
      official_url: null,
      note: "Official source referenced by the public dataset",
      fiscal_year: dataset.manifest.fiscalYear,
      storage_object_path: null,
      sha256: null,
    });
  };

  for (const program of dataset.programs) {
    addOfficialSource("official_csv", program.source_file);
  }
  for (const detail of dataset.revenueDetails) {
    addOfficialSource("official_csv", detail.source_file);
  }
  for (const item of dataset.budgetItems) {
    for (const section of item.sections) {
      addOfficialSource("official_pdf", section.sourceReference.sourceFile);
    }
  }
  for (const allocation of dataset.revenueAllocations) {
    addOfficialSource("official_pdf", allocation.sourceReference.sourceFile);
  }

  return [...sourceDocuments.values()].sort((left, right) =>
    `${String(left.source_type)}:${String(left.source_file)}`.localeCompare(
      `${String(right.source_type)}:${String(right.source_file)}`
    )
  );
}

export function buildBudgetImportPayload(
  dataset: PublicBudgetDataset
): BuiltBudgetImport {
  const artifacts = buildArtifacts(dataset);
  const budgetItemSections = dataset.budgetItems.flatMap((item) =>
    item.sections.map((section) => ({
      section_id: section.sectionId,
      budget_item_key: item.budgetItemKey,
      setsu_code: section.setsuCode,
      setsu_name: section.setsuName,
      amount_thousand_yen: section.amountThousandYen,
      scope: section.scope,
      source_reference: section.sourceReference,
    }))
  );
  const revenueSections = dataset.revenueItems.flatMap((item) =>
    item.sections.map((section) => ({
      revenue_section_id: section.revenueSectionId,
      revenue_item_key: item.revenueItemKey,
      setsu_code: section.setsu.code,
      setsu_name: section.setsu.name,
      previous_amount_thousand_yen: section.previousAmountThousandYen,
      current_amount_thousand_yen: section.currentAmountThousandYen,
      diff_amount_thousand_yen: section.diffAmountThousandYen,
      detail_count: section.detailCount,
      validation_status: section.validationStatus,
      source_reference: section.sourceReference,
    }))
  );
  const sourceDocuments = buildSourceDocuments(dataset, artifacts);

  return {
    artifacts,
    payload: {
      manifest: dataset.manifest,
      manifest_sha256: dataset.manifestSha256,
      import_summary: {
        budget_item_section_count: budgetItemSections.length,
        revenue_section_count: revenueSections.length,
        source_document_count: sourceDocuments.length,
      },
      budget_items: dataset.budgetItems.map((item) => ({
        budget_item_key: item.budgetItemKey,
        fiscal_year: item.fiscalYear,
        account_code: item.accountCode,
        account_name: item.accountName,
        budget_side: item.budgetSide,
        kan_code: item.kan.code,
        kan_name: item.kan.name,
        kou_code: item.kou.code,
        kou_name: item.kou.name,
        moku_code: item.moku.code,
        moku_name: item.moku.name,
        amount_thousand_yen: item.amountThousandYen,
        validation_status: item.validationStatus,
        is_zero_amount: item.validationStatus === "ok_zero_amount",
        data_availability: item.dataAvailability,
        source_references: item.sourceReferences,
      })),
      budget_program_identities: dataset.programIdentities.map((identity) => ({
        ...identity,
      })),
      budget_programs: dataset.programs.map((program) => ({
        ...program,
        budget_side: "expenditure",
      })),
      budget_item_sections: budgetItemSections,
      budget_revenue_items: dataset.revenueItems.map((item) => ({
        revenue_item_key: item.revenueItemKey,
        fiscal_year: item.fiscalYear,
        account_code: item.accountCode,
        account_name: item.accountName,
        budget_side: "revenue",
        kan_code: item.kan.code,
        kan_name: item.kan.name,
        kou_code: item.kou.code,
        kou_name: item.kou.name,
        moku_code: item.moku.code,
        moku_name: item.moku.name,
        previous_amount_thousand_yen: item.previousAmountThousandYen,
        current_amount_thousand_yen: item.currentAmountThousandYen,
        diff_amount_thousand_yen: item.diffAmountThousandYen,
        general_revenue_thousand_yen:
          item.revenueComposition.generalRevenueThousandYen,
        specific_revenue_thousand_yen:
          item.revenueComposition.specificRevenueThousandYen,
        special_account_revenue_thousand_yen:
          item.revenueComposition.specialAccountRevenueThousandYen,
        validation_status:
          item.currentAmountThousandYen === 0 ? "ok_zero_amount" : "ok",
        is_zero_amount: item.currentAmountThousandYen === 0,
        revenue_source_display: item.revenueSourceDisplay,
        data_availability: item.dataAvailability,
        source_references: item.sourceReferences,
      })),
      budget_revenue_sections: revenueSections,
      budget_revenue_details: dataset.revenueDetails.map((detail) => ({
        ...detail,
        budget_side: "revenue",
        source_type: "official_csv",
      })),
      budget_revenue_allocations: dataset.revenueAllocations.map(
        (allocation) => ({
          allocation_link_id: allocation.allocationLinkId,
          revenue_detail_id: allocation.revenueDetailId,
          target_budget_program_identity_id:
            allocation.targetBudgetProgramIdentityId,
          target_budget_program_group_id: allocation.targetBudgetProgramGroupId,
          target_budget_item_key: allocation.targetBudgetItemKey,
          target_account_code: allocation.targetAccountCode,
          target_program_name: allocation.targetProgramName,
          target_budget_book_page: allocation.targetBudgetBookPage,
          target_resolution_level: allocation.targetResolutionLevel,
          candidate_target_group_count: allocation.candidateTargetGroupCount,
          relation_type: allocation.relationType,
          allocation_amount_thousand_yen:
            allocation.allocationAmountThousandYen,
          amount_attribution_status: allocation.amountAttributionStatus,
          source_reference: allocation.sourceReference,
        })
      ),
      budget_source_documents: sourceDocuments,
    },
  };
}
