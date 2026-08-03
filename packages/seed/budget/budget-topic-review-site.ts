import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  getDefaultBudgetTopicDefinitionsDirectory,
  loadBudgetTopicDefinitions,
  type ResolvedBudgetTopicDefinition,
} from "./budget-topic-definitions";
import {
  type BudgetTopicReviewCandidate,
  parseBudgetTopicReviewCsv,
  type ReviewDecision,
  type ReviewedRelationType,
  serializeBudgetTopicReviewRows,
} from "./budget-topic-review";
import { curateBudgetTopicPublicationFiles } from "./curate-budget-topic-publication";

const editableDecisionSchema = z.enum(["approve", "revise", "reject", ""]);
const editableRelationTypeSchema = z.enum([
  "responds_to",
  "supports",
  "maintains",
  "enables",
]);

const reviewChangeSchema = z.strictObject({
  reviewFile: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-candidates\.csv$/),
  budgetProgramIdentityId: z.string().min(1).max(160),
  reviewDecision: editableDecisionSchema,
  reviewNote: z.string().max(4000),
  proposedRelationType: editableRelationTypeSchema,
  proposedExplanation: z.string().min(1).max(12_000),
});

export const budgetTopicReviewSaveRequestSchema = z.strictObject({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  changes: z.array(reviewChangeSchema).min(1).max(500),
});

export type BudgetTopicReviewSaveRequest = z.infer<
  typeof budgetTopicReviewSaveRequestSchema
>;

export interface BudgetTopicReviewSiteRow {
  rowKey: string;
  reviewFile: string;
  categorySlug: string;
  categoryName: string;
  topicSlug: string;
  topicName: string;
  budgetProgramIdentityId: string;
  displayProgramName: string;
  accountName: string;
  kanName: string;
  kouName: string;
  mokuName: string;
  departmentDisplayName: string;
  amountThousandYen: string;
  proposedRelationType: ReviewedRelationType;
  proposedExplanation: string;
  evidenceLevel: "B_strong_structural" | "C_editorial";
  evidenceFields: BudgetTopicReviewCandidate["evidence_fields"];
  confidence: "high" | "medium" | "low";
  reviewDecision: ReviewDecision;
  reviewNote: string;
  automaticApprovalRuleMatches: boolean;
  requiresManualReview: boolean;
}

export interface BudgetTopicReviewSiteSummary {
  total: number;
  pending: number;
  approve: number;
  revise: number;
  reject: number;
  categoryCount: number;
  topicCount: number;
  automaticApprovalRuleMatches: number;
  automaticallyApproved: number;
  manualReviewTotal: number;
  manualPending: number;
  manualApprove: number;
  manualRevise: number;
  manualReject: number;
}

export interface BudgetTopicReviewSiteSnapshot {
  schemaVersion: "budget-topic-review-site-v1";
  revision: string;
  summary: BudgetTopicReviewSiteSummary;
  categories: Array<{ slug: string; name: string }>;
  rows: BudgetTopicReviewSiteRow[];
}

interface ReviewFileState {
  definition: ResolvedBudgetTopicDefinition;
  filePath: string;
  source: string;
  rows: BudgetTopicReviewCandidate[];
}

export interface BudgetTopicReviewSiteOptions {
  definitionsDirectory: string;
  reviewDirectory: string;
}

export class BudgetTopicReviewConflictError extends Error {}
export class BudgetTopicReviewInputError extends Error {}

export const automaticBudgetTopicApprovalNote =
  "[publication-policy] B_strong_structural・highを確認し、topicとの直接性が高い代表事業として承認";

export interface AutomaticBudgetTopicApprovalResult {
  matched: number;
  updated: number;
  alreadyApproved: number;
  updatedFiles: number;
}

export function matchesAutomaticBudgetTopicApprovalRule(
  row: Pick<BudgetTopicReviewCandidate, "confidence" | "evidence_level">
): boolean {
  return (
    row.evidence_level === "B_strong_structural" && row.confidence === "high"
  );
}

export function getDefaultBudgetTopicReviewDirectory(
  invocationDirectory = process.env.INIT_CWD ?? process.cwd()
): string {
  return path.resolve(invocationDirectory, "data/budget/editorial/review");
}

export function getDefaultBudgetTopicReviewSiteOptions(
  invocationDirectory = process.env.INIT_CWD ?? process.cwd()
): BudgetTopicReviewSiteOptions {
  return {
    definitionsDirectory:
      getDefaultBudgetTopicDefinitionsDirectory(invocationDirectory),
    reviewDirectory: getDefaultBudgetTopicReviewDirectory(invocationDirectory),
  };
}

function loadReviewFileStates(
  options: BudgetTopicReviewSiteOptions
): ReviewFileState[] {
  const definitions = loadBudgetTopicDefinitions(options.definitionsDirectory);
  return definitions.map((definition) => {
    const filePath = path.join(
      options.reviewDirectory,
      definition.topic.reviewFile
    );
    if (!fs.existsSync(filePath)) {
      throw new BudgetTopicReviewInputError(
        `review CSVがありません: ${definition.topic.reviewFile}`
      );
    }
    const source = fs.readFileSync(filePath, "utf8");
    const review = parseBudgetTopicReviewCsv(source);
    if (review.candidateTopicName !== definition.topic.name) {
      throw new BudgetTopicReviewInputError(
        `review CSVのtopic名が定義と一致しません: ${definition.topic.reviewFile}`
      );
    }
    return {
      definition,
      filePath,
      source,
      rows: review.rows,
    };
  });
}

function calculateRevision(states: ReviewFileState[]): string {
  const hash = createHash("sha256");
  hash.update("budget-topic-review-site-v1\0");
  for (const state of states) {
    hash.update(state.definition.topic.reviewFile);
    hash.update("\0");
    hash.update(state.source);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function toSiteRow(
  state: ReviewFileState,
  row: BudgetTopicReviewCandidate
): BudgetTopicReviewSiteRow {
  const { definition } = state;
  const automaticApprovalRuleMatches =
    matchesAutomaticBudgetTopicApprovalRule(row);
  return {
    rowKey: `${definition.topic.slug}:${row.budget_program_identity_id}`,
    reviewFile: definition.topic.reviewFile,
    categorySlug: definition.categorySlug,
    categoryName: definition.categoryName,
    topicSlug: definition.topic.slug,
    topicName: definition.topic.name,
    budgetProgramIdentityId: row.budget_program_identity_id,
    displayProgramName: row.display_program_name,
    accountName: row.account_name,
    kanName: row.kan_name,
    kouName: row.kou_name,
    mokuName: row.moku_name,
    departmentDisplayName: row.department_display_name,
    amountThousandYen: row.amount_thousand_yen,
    proposedRelationType: row.proposed_relation_type,
    proposedExplanation: row.proposed_explanation,
    evidenceLevel: row.evidence_level,
    evidenceFields: row.evidence_fields,
    confidence: row.confidence,
    reviewDecision: row.review_decision,
    reviewNote: row.review_note,
    automaticApprovalRuleMatches,
    requiresManualReview: row.review_decision === "",
  };
}

function buildSnapshotFromStates(
  states: ReviewFileState[]
): BudgetTopicReviewSiteSnapshot {
  const rows = states.flatMap((state) =>
    state.rows.map((row) => toSiteRow(state, row))
  );
  const categoryMap = new Map<string, string>();
  for (const state of states) {
    categoryMap.set(
      state.definition.categorySlug,
      state.definition.categoryName
    );
  }
  const manualReviewRows = rows.filter((row) => row.requiresManualReview);
  return {
    schemaVersion: "budget-topic-review-site-v1",
    revision: calculateRevision(states),
    summary: {
      total: rows.length,
      pending: rows.filter((row) => row.reviewDecision === "").length,
      approve: rows.filter((row) => row.reviewDecision === "approve").length,
      revise: rows.filter((row) => row.reviewDecision === "revise").length,
      reject: rows.filter((row) => row.reviewDecision === "reject").length,
      categoryCount: categoryMap.size,
      topicCount: states.length,
      automaticApprovalRuleMatches: rows.filter(
        (row) => row.automaticApprovalRuleMatches
      ).length,
      automaticallyApproved: rows.filter(
        (row) =>
          row.automaticApprovalRuleMatches && row.reviewDecision === "approve"
      ).length,
      manualReviewTotal: manualReviewRows.length,
      manualPending: manualReviewRows.filter((row) => row.reviewDecision === "")
        .length,
      manualApprove: manualReviewRows.filter(
        (row) => row.reviewDecision === "approve"
      ).length,
      manualRevise: manualReviewRows.filter(
        (row) => row.reviewDecision === "revise"
      ).length,
      manualReject: manualReviewRows.filter(
        (row) => row.reviewDecision === "reject"
      ).length,
    },
    categories: [...categoryMap].map(([slug, name]) => ({ slug, name })),
    rows,
  };
}

export function autoApproveStrongHighBudgetTopicCandidates(
  options: BudgetTopicReviewSiteOptions
): AutomaticBudgetTopicApprovalResult {
  const before = loadReviewFileStates(options);
  const beforeDecisionByKey = new Map(
    before.flatMap((state) =>
      state.rows.map((row) => [
        `${state.definition.topic.slug}:${row.budget_program_identity_id}`,
        row.review_decision,
      ])
    )
  );
  const beforeSourceByFile = new Map(
    before.map((state) => [state.filePath, state.source])
  );
  curateBudgetTopicPublicationFiles(
    options.definitionsDirectory,
    options.reviewDirectory
  );
  const after = loadReviewFileStates(options);
  const selected = after.flatMap((state) =>
    state.rows
      .filter(
        (row) =>
          row.review_decision === "approve" || row.review_decision === "revise"
      )
      .map((row) => ({ state, row }))
  );
  const updated = selected.filter(({ state, row }) => {
    const beforeDecision = beforeDecisionByKey.get(
      `${state.definition.topic.slug}:${row.budget_program_identity_id}`
    );
    return beforeDecision !== "approve" && beforeDecision !== "revise";
  }).length;
  const updatedFiles = after.filter(
    (state) => beforeSourceByFile.get(state.filePath) !== state.source
  ).length;
  return {
    matched: selected.length,
    updated,
    alreadyApproved: selected.length - updated,
    updatedFiles,
  };
}

export function readBudgetTopicReviewSiteSnapshot(
  options: BudgetTopicReviewSiteOptions
): BudgetTopicReviewSiteSnapshot {
  return buildSnapshotFromStates(loadReviewFileStates(options));
}

function assertUniqueChanges(
  changes: BudgetTopicReviewSaveRequest["changes"]
): void {
  const seen = new Set<string>();
  for (const change of changes) {
    const key = `${change.reviewFile}:${change.budgetProgramIdentityId}`;
    if (seen.has(key)) {
      throw new BudgetTopicReviewInputError(
        `同じ候補への変更が重複しています: ${key}`
      );
    }
    seen.add(key);
  }
}

function assertChangeAllowed(
  current: BudgetTopicReviewCandidate,
  change: BudgetTopicReviewSaveRequest["changes"][number]
): void {
  const note = change.reviewNote.trim();
  if (
    (change.reviewDecision === "approve" ||
      change.reviewDecision === "revise") &&
    note === ""
  ) {
    throw new BudgetTopicReviewInputError(
      `${change.budgetProgramIdentityId}: approve / reviseにはレビュー注記が必要です`
    );
  }
  if (change.reviewDecision === "" && note !== "") {
    throw new BudgetTopicReviewInputError(
      `${change.budgetProgramIdentityId}: 未判断のreview_noteは空欄にしてください`
    );
  }
  if (
    change.reviewDecision !== "revise" &&
    (change.proposedRelationType !== current.proposed_relation_type ||
      change.proposedExplanation !== current.proposed_explanation)
  ) {
    throw new BudgetTopicReviewInputError(
      `${change.budgetProgramIdentityId}: 候補内容を変更できるのはreviseだけです`
    );
  }
  if (
    change.reviewDecision === "revise" &&
    change.proposedExplanation.trim() === ""
  ) {
    throw new BudgetTopicReviewInputError(
      `${change.budgetProgramIdentityId}: reviseの説明は空欄にできません`
    );
  }
  if (
    change.reviewDecision === "revise" &&
    current.review_decision !== "revise" &&
    change.proposedRelationType === current.proposed_relation_type &&
    change.proposedExplanation === current.proposed_explanation
  ) {
    throw new BudgetTopicReviewInputError(
      `${change.budgetProgramIdentityId}: reviseでは関係種別または説明を修正してください`
    );
  }
}

function writeFilesWithRollback(files: Map<string, string>): void {
  const originals = new Map<string, string>();
  const temporaryFiles = new Map<string, string>();
  const replaced: string[] = [];

  try {
    for (const [filePath, source] of files) {
      originals.set(filePath, fs.readFileSync(filePath, "utf8"));
      const fileMode = fs.statSync(filePath).mode & 0o777;
      const temporaryFile = path.join(
        path.dirname(filePath),
        `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
      );
      fs.writeFileSync(temporaryFile, source, {
        encoding: "utf8",
        mode: fileMode,
      });
      temporaryFiles.set(filePath, temporaryFile);
    }

    for (const [filePath, temporaryFile] of temporaryFiles) {
      fs.renameSync(temporaryFile, filePath);
      replaced.push(filePath);
    }
  } catch (error) {
    for (const filePath of replaced.reverse()) {
      const original = originals.get(filePath);
      if (original === undefined) {
        continue;
      }
      const restoreFile = `${filePath}.${process.pid}.${randomUUID()}.restore`;
      fs.writeFileSync(restoreFile, original, {
        encoding: "utf8",
        mode: fs.statSync(filePath).mode,
      });
      fs.renameSync(restoreFile, filePath);
    }
    throw error;
  } finally {
    for (const temporaryFile of temporaryFiles.values()) {
      if (fs.existsSync(temporaryFile)) {
        fs.rmSync(temporaryFile);
      }
    }
  }
}

export function saveBudgetTopicReviewSiteChanges(
  options: BudgetTopicReviewSiteOptions,
  request: unknown
): BudgetTopicReviewSiteSnapshot {
  const parsed = budgetTopicReviewSaveRequestSchema.safeParse(request);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 6)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new BudgetTopicReviewInputError(`保存内容が不正です: ${detail}`);
  }
  assertUniqueChanges(parsed.data.changes);

  const states = loadReviewFileStates(options);
  if (calculateRevision(states) !== parsed.data.revision) {
    throw new BudgetTopicReviewConflictError(
      "CSVが別の操作で更新されています。画面を再読込して確認してください"
    );
  }

  const stateByReviewFile = new Map(
    states.map((state) => [state.definition.topic.reviewFile, state])
  );
  const changesByFile = new Map<
    string,
    Map<string, BudgetTopicReviewSaveRequest["changes"][number]>
  >();

  for (const change of parsed.data.changes) {
    const state = stateByReviewFile.get(change.reviewFile);
    if (!state) {
      throw new BudgetTopicReviewInputError(
        `定義にないreview CSVです: ${change.reviewFile}`
      );
    }
    const current = state.rows.find(
      (row) => row.budget_program_identity_id === change.budgetProgramIdentityId
    );
    if (!current) {
      throw new BudgetTopicReviewInputError(
        `候補が見つかりません: ${change.budgetProgramIdentityId}`
      );
    }
    assertChangeAllowed(current, change);
    const fileChanges = changesByFile.get(change.reviewFile) ?? new Map();
    fileChanges.set(change.budgetProgramIdentityId, change);
    changesByFile.set(change.reviewFile, fileChanges);
  }

  const updatedSources = new Map<string, string>();
  for (const state of states) {
    const fileChanges = changesByFile.get(state.definition.topic.reviewFile);
    if (!fileChanges) {
      continue;
    }
    const rows = state.rows.map((row) => {
      const change = fileChanges.get(row.budget_program_identity_id);
      if (!change) {
        return row;
      }
      return {
        ...row,
        proposed_relation_type: change.proposedRelationType,
        proposed_explanation: change.proposedExplanation,
        review_decision: change.reviewDecision,
        review_note: change.reviewNote.trim(),
      };
    });
    const source = serializeBudgetTopicReviewRows(rows);
    // 保存前に既存parserを通し、公開CLIと同じ制約を満たすことを確認する。
    parseBudgetTopicReviewCsv(source);
    updatedSources.set(state.filePath, source);
  }

  if (
    calculateRevision(loadReviewFileStates(options)) !== parsed.data.revision
  ) {
    throw new BudgetTopicReviewConflictError(
      "保存処理中にCSVが更新されました。画面を再読込して確認してください"
    );
  }
  writeFilesWithRollback(updatedSources);
  return readBudgetTopicReviewSiteSnapshot(options);
}
