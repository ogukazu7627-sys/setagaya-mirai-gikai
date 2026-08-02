import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { Json } from "@mirai-gikai/supabase";
import type {
  BudgetTopicCandidateField,
  BudgetTopicCandidateRule,
  ResolvedBudgetTopicDefinition,
} from "./budget-topic-definitions";
import {
  type BudgetTopicReviewCandidate,
  readBudgetTopicReviewFile,
  serializeBudgetTopicReviewRows,
} from "./budget-topic-review";
import type {
  PublicBudgetProgramIdentityRow,
  PublicBudgetProgramRow,
} from "./public-budget-dataset-schemas";
import type { PublicBudgetDataset } from "./read-public-budget-files";

export interface GeneratedBudgetTopicCandidates {
  definition: ResolvedBudgetTopicDefinition;
  rows: BudgetTopicReviewCandidate[];
}

export interface WrittenBudgetTopicCandidateFile {
  categorySlug: string;
  topicSlug: string;
  reviewFile: string;
  candidateCount: number;
  evidenceBCount: number;
  evidenceCCount: number;
  status: "generated" | "preserved_reviewed";
}

type CandidateMatcher = BudgetTopicCandidateRule["all"][number];

const confidenceOrder = { high: 0, medium: 1, low: 2 } as const;
const evidenceOrder = {
  B_strong_structural: 0,
  C_editorial: 1,
} as const;

export function normalizeBudgetTopicCandidateText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s\u3000]+/g, "")
    .replace(/[･·]/g, "・")
    .replace(/[‐‑‒–—―ｰー]/g, "-");
}

function fieldValues(
  identity: PublicBudgetProgramIdentityRow,
  programs: PublicBudgetProgramRow[],
  field: BudgetTopicCandidateField
): string[] {
  if (
    field === "major_program_name" ||
    field === "budget_program_name" ||
    field === "detail_program_name"
  ) {
    return programs.map((program) => program[field]);
  }
  return [identity[field]];
}

function matchesMatcher(
  identity: PublicBudgetProgramIdentityRow,
  programs: PublicBudgetProgramRow[],
  matcher: CandidateMatcher
): boolean {
  const values = fieldValues(identity, programs, matcher.field).map(
    normalizeBudgetTopicCandidateText
  );
  const expected = matcher.values.map(normalizeBudgetTopicCandidateText);
  return values.some((value) =>
    expected.some((candidate) =>
      matcher.operator === "equals"
        ? value === candidate
        : value.includes(candidate)
    )
  );
}

function matchesRule(
  identity: PublicBudgetProgramIdentityRow,
  programs: PublicBudgetProgramRow[],
  rule: BudgetTopicCandidateRule
): boolean {
  return (
    rule.all.every((matcher) => matchesMatcher(identity, programs, matcher)) &&
    (rule.any.length === 0 ||
      rule.any.some((matcher) => matchesMatcher(identity, programs, matcher)))
  );
}

function groupProgramsByIdentity(
  programs: PublicBudgetProgramRow[]
): Map<string, PublicBudgetProgramRow[]> {
  const grouped = new Map<string, PublicBudgetProgramRow[]>();
  for (const program of programs) {
    const members = grouped.get(program.budget_program_identity_id) ?? [];
    members.push(program);
    grouped.set(program.budget_program_identity_id, members);
  }
  for (const members of grouped.values()) {
    members.sort((left, right) =>
      left.program_id.localeCompare(right.program_id)
    );
  }
  return grouped;
}

function buildRelatedRevenueEvidence(
  dataset: PublicBudgetDataset,
  identityId: string
): Json[] {
  const revenueById = new Map(
    dataset.revenueDetails.map((detail) => [detail.revenue_detail_id, detail])
  );
  const seen = new Set<string>();
  const related: Json[] = [];
  for (const allocation of dataset.revenueAllocations) {
    if (
      allocation.targetBudgetProgramIdentityId !== identityId ||
      seen.has(allocation.revenueDetailId)
    ) {
      continue;
    }
    seen.add(allocation.revenueDetailId);
    const detail = revenueById.get(allocation.revenueDetailId);
    if (!detail) {
      continue;
    }
    related.push({
      revenue_detail_id: detail.revenue_detail_id,
      revenue_hierarchy: [
        detail.kan_name,
        detail.kou_name,
        detail.moku_name,
        detail.setsu_name,
        detail.saisetsu_name,
      ],
      amount_attribution_status: allocation.amountAttributionStatus,
    });
  }
  return related.sort((left, right) =>
    String(
      (left as { revenue_detail_id?: string }).revenue_detail_id
    ).localeCompare(
      String((right as { revenue_detail_id?: string }).revenue_detail_id)
    )
  );
}

function buildEvidenceFields(
  dataset: PublicBudgetDataset,
  identity: PublicBudgetProgramIdentityRow,
  programs: PublicBudgetProgramRow[],
  rule: BudgetTopicCandidateRule,
  identitiesByBudgetItem: Map<string, PublicBudgetProgramIdentityRow[]>
): Record<string, Json | undefined> {
  return {
    matched_rule_id: rule.id,
    budget_item_key: identity.budget_item_key,
    identity_fields: {
      display_program_name: identity.display_program_name,
      hierarchy: [identity.kan_name, identity.kou_name, identity.moku_name],
      department_display_name: identity.department_display_name,
      amount_thousand_yen: identity.amount_thousand_yen,
    },
    member_programs: programs.map((program) => ({
      program_id: program.program_id,
      major_program_name: program.major_program_name,
      budget_program_name: program.budget_program_name,
      detail_program_name: program.detail_program_name,
      source_file: program.source_file,
      source_row_number: program.source_row_number,
    })),
    same_budget_item_other_program_names: (
      identitiesByBudgetItem.get(identity.budget_item_key) ?? []
    )
      .filter(
        (candidate) =>
          candidate.budget_program_identity_id !==
          identity.budget_program_identity_id
      )
      .map((candidate) => candidate.display_program_name)
      .sort((left, right) => left.localeCompare(right, "ja")),
    related_revenues: buildRelatedRevenueEvidence(
      dataset,
      identity.budget_program_identity_id
    ),
  };
}

function groupIdentitiesByBudgetItem(
  identities: PublicBudgetProgramIdentityRow[]
): Map<string, PublicBudgetProgramIdentityRow[]> {
  const grouped = new Map<string, PublicBudgetProgramIdentityRow[]>();
  for (const identity of identities) {
    const members = grouped.get(identity.budget_item_key) ?? [];
    members.push(identity);
    grouped.set(identity.budget_item_key, members);
  }
  return grouped;
}

export function buildBudgetTopicCandidates(
  dataset: PublicBudgetDataset,
  definitions: ResolvedBudgetTopicDefinition[]
): GeneratedBudgetTopicCandidates[] {
  const programsByIdentity = groupProgramsByIdentity(dataset.programs);
  const identitiesByBudgetItem = groupIdentitiesByBudgetItem(
    dataset.programIdentities
  );

  return definitions.map((definition) => {
    const rows = dataset.programIdentities.flatMap((identity) => {
      const programs = programsByIdentity.get(
        identity.budget_program_identity_id
      );
      if (!programs || programs.length === 0) {
        return [];
      }
      const rule = definition.topic.rules.find((candidateRule) =>
        matchesRule(identity, programs, candidateRule)
      );
      if (!rule) {
        return [];
      }
      return [
        {
          budget_program_identity_id: identity.budget_program_identity_id,
          display_program_name: identity.display_program_name,
          account_name: identity.account_name,
          kan_name: identity.kan_name,
          kou_name: identity.kou_name,
          moku_name: identity.moku_name,
          department_display_name: identity.department_display_name,
          amount_thousand_yen: String(identity.amount_thousand_yen),
          candidate_topic: definition.topic.name,
          proposed_relation_type: rule.relationType,
          proposed_explanation: rule.explanation,
          evidence_level: rule.evidenceLevel,
          evidence_fields: buildEvidenceFields(
            dataset,
            identity,
            programs,
            rule,
            identitiesByBudgetItem
          ),
          confidence: rule.confidence,
          review_decision: "" as const,
          review_note: "",
        },
      ];
    });

    rows.sort(
      (left, right) =>
        evidenceOrder[left.evidence_level] -
          evidenceOrder[right.evidence_level] ||
        confidenceOrder[left.confidence] - confidenceOrder[right.confidence] ||
        Number(right.amount_thousand_yen) - Number(left.amount_thousand_yen) ||
        left.budget_program_identity_id.localeCompare(
          right.budget_program_identity_id
        )
    );
    if (rows.length === 0) {
      throw new Error(
        `topic定義から候補を1件も生成できません: ${definition.topic.slug}`
      );
    }
    return { definition, rows };
  });
}

function assertReviewedFileStillReferencesDataset(
  reviewFilePath: string,
  expectedTopicName: string,
  identitiesById: Map<string, PublicBudgetProgramIdentityRow>,
  generatedRows: BudgetTopicReviewCandidate[]
): number {
  const reviewFile = readBudgetTopicReviewFile(reviewFilePath);
  if (reviewFile.candidateTopicName !== expectedTopicName) {
    throw new Error(
      `既存review CSVのtopic名が定義と一致しません: ${reviewFilePath}`
    );
  }
  const missing = reviewFile.rows.filter(
    (row) => !identitiesById.has(row.budget_program_identity_id)
  );
  if (missing.length > 0) {
    throw new Error(
      `既存review CSVが現データにないidentityを参照しています: ${missing
        .map((row) => row.budget_program_identity_id)
        .join(", ")}`
    );
  }
  const changed = reviewFile.rows.filter((row) => {
    const identity = identitiesById.get(row.budget_program_identity_id);
    return (
      identity !== undefined &&
      (row.display_program_name !== identity.display_program_name ||
        row.account_name !== identity.account_name ||
        row.kan_name !== identity.kan_name ||
        row.kou_name !== identity.kou_name ||
        row.moku_name !== identity.moku_name ||
        row.department_display_name !== identity.department_display_name ||
        row.amount_thousand_yen !== String(identity.amount_thousand_yen))
    );
  });
  if (changed.length > 0) {
    throw new Error(
      `レビュー根拠となる公式項目が変更されています。再レビューしてください: ${changed
        .map((row) => row.budget_program_identity_id)
        .join(", ")}`
    );
  }

  const generatedById = new Map(
    generatedRows.map((row) => [row.budget_program_identity_id, row])
  );
  const reviewedIds = new Set(
    reviewFile.rows.map((row) => row.budget_program_identity_id)
  );
  const added = generatedRows.filter(
    (row) => !reviewedIds.has(row.budget_program_identity_id)
  );
  const removed = reviewFile.rows.filter(
    (row) => !generatedById.has(row.budget_program_identity_id)
  );
  if (added.length > 0 || removed.length > 0) {
    throw new Error(
      `候補集合が変更されています。再レビューしてください: added=${
        added.map((row) => row.budget_program_identity_id).join(",") || "none"
      }; removed=${
        removed.map((row) => row.budget_program_identity_id).join(",") || "none"
      }`
    );
  }

  const changedEvidence = reviewFile.rows.filter((row) => {
    const generated = generatedById.get(row.budget_program_identity_id);
    if (!generated) {
      return false;
    }
    const reviewedEvidence = normalizeEvidenceForComparison(
      row.evidence_fields
    );
    const generatedEvidence = normalizeEvidenceForComparison(
      generated.evidence_fields
    );
    const sourceEvidenceChanged = !isDeepStrictEqual(
      reviewedEvidence,
      generatedEvidence
    );
    const hasDefinitionMetadata =
      row.evidence_fields.matched_rule_id !== undefined;
    return (
      sourceEvidenceChanged ||
      (hasDefinitionMetadata &&
        (row.proposed_relation_type !== generated.proposed_relation_type ||
          row.proposed_explanation !== generated.proposed_explanation ||
          row.evidence_level !== generated.evidence_level ||
          row.confidence !== generated.confidence ||
          row.evidence_fields.matched_rule_id !==
            generated.evidence_fields.matched_rule_id))
    );
  });
  if (changedEvidence.length > 0) {
    throw new Error(
      `候補の関係または根拠が変更されています。再レビューしてください: ${changedEvidence
        .map((row) => row.budget_program_identity_id)
        .join(", ")}`
    );
  }
  return reviewFile.rows.length;
}

function normalizeEvidenceForComparison(
  evidence: Record<string, Json | undefined>
): Record<string, Json | undefined> {
  const normalized = { ...evidence };
  delete normalized.matched_rule_id;

  if (Array.isArray(normalized.member_programs)) {
    normalized.member_programs = [...normalized.member_programs].sort(
      (left, right) =>
        String(
          (left as { program_id?: string } | null)?.program_id ?? ""
        ).localeCompare(
          String((right as { program_id?: string } | null)?.program_id ?? "")
        )
    );
  }
  if (Array.isArray(normalized.same_budget_item_other_program_names)) {
    normalized.same_budget_item_other_program_names = [
      ...normalized.same_budget_item_other_program_names,
    ].sort((left, right) => String(left).localeCompare(String(right)));
  }
  if (Array.isArray(normalized.related_revenues)) {
    normalized.related_revenues = [...normalized.related_revenues].sort(
      (left, right) =>
        String(
          (left as { revenue_detail_id?: string } | null)?.revenue_detail_id ??
            ""
        ).localeCompare(
          String(
            (right as { revenue_detail_id?: string } | null)
              ?.revenue_detail_id ?? ""
          )
        )
    );
  }
  return normalized;
}

export function writeBudgetTopicCandidateFiles(
  dataset: PublicBudgetDataset,
  definitions: ResolvedBudgetTopicDefinition[],
  outputDirectory: string
): WrittenBudgetTopicCandidateFile[] {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const identitiesById = new Map(
    dataset.programIdentities.map((identity) => [
      identity.budget_program_identity_id,
      identity,
    ])
  );

  return buildBudgetTopicCandidates(dataset, definitions).map(
    ({ definition, rows }) => {
      const outputPath = path.join(
        outputDirectory,
        definition.topic.reviewFile
      );
      let status: WrittenBudgetTopicCandidateFile["status"] = "generated";
      let candidateRows = rows;

      if (fs.existsSync(outputPath)) {
        const existing = readBudgetTopicReviewFile(outputPath);
        const hasReviewDecision = existing.rows.some(
          (row) => row.review_decision !== ""
        );
        if (hasReviewDecision) {
          assertReviewedFileStillReferencesDataset(
            outputPath,
            definition.topic.name,
            identitiesById,
            rows
          );
          status = "preserved_reviewed";
          candidateRows = existing.rows;
        }
      }

      if (status === "generated") {
        fs.writeFileSync(
          outputPath,
          serializeBudgetTopicReviewRows(candidateRows),
          "utf8"
        );
      }

      return {
        categorySlug: definition.categorySlug,
        topicSlug: definition.topic.slug,
        reviewFile: definition.topic.reviewFile,
        candidateCount: candidateRows.length,
        evidenceBCount: candidateRows.filter(
          (row) => row.evidence_level === "B_strong_structural"
        ).length,
        evidenceCCount: candidateRows.filter(
          (row) => row.evidence_level === "C_editorial"
        ).length,
        status,
      };
    }
  );
}
