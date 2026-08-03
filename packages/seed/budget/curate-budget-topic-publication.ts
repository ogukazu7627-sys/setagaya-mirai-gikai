import fs from "node:fs";
import path from "node:path";
import type { BudgetTopicDefinitionFile } from "./budget-topic-definitions";
import {
  loadBudgetTopicDefinitions,
  type ResolvedBudgetTopicDefinition,
} from "./budget-topic-definitions";
import {
  type BudgetTopicReviewCandidate,
  readBudgetTopicReviewFile,
  serializeBudgetTopicReviewRows,
} from "./budget-topic-review";
import {
  budgetTopicPublicationLimits,
  budgetTopicSelectionTerms,
  getBudgetTopicPublicationStatus,
  getBudgetTopicShortName,
} from "./budget-topic-publication-policy";

const POLICY_NOTE_PREFIX = "[publication-policy]";
const genericProgramNamePattern =
  /(?:人件費|庶務事務|基金積立金|予備費|会計年度任用職員|事務従事職員|関係職員)/;
const topicSpecificExclusions: Readonly<Record<string, RegExp>> = {
  "diverse-learning-and-education-support":
    /(?:私立幼稚園|教育総合センター維持管理|教育施設等整備)/,
  "infection-prevention-and-vaccination": /難病・被爆者対策/,
  "latter-stage-elderly-healthcare": /還付/,
  "libraries-reading-and-knowledge-access": /(?:教育会館|プラネタリウム)/,
  "lifelong-learning-and-community-education": /放課後の遊び場/,
  "national-health-insurance-and-medical-benefits": /(?:還付|支払手数料)/,
};

interface MutableTopicDefinition {
  slug: string;
  name: string;
  publicationStatus?: "published" | "archived";
  reviewFile: string;
  rules: Array<{ explanation: string }>;
}

interface MutableDefinitionFile
  extends Omit<BudgetTopicDefinitionFile, "topics"> {
  topics: MutableTopicDefinition[];
}

export interface CuratedBudgetTopicResult {
  topicSlug: string;
  publicationStatus: "published" | "archived";
  candidateCount: number;
  selectedCount: number;
  rejectedCount: number;
}

function replaceTopicName(source: string, previousName: string, name: string) {
  return source === previousName
    ? name
    : source.replaceAll(`「${previousName}」`, `「${name}」`);
}

function wasEligibleBeforePolicy(row: BudgetTopicReviewCandidate): boolean {
  return (
    row.review_decision === "" ||
    row.review_decision === "approve" ||
    row.review_decision === "revise" ||
    row.review_note.startsWith(POLICY_NOTE_PREFIX)
  );
}

function directnessScore(
  row: BudgetTopicReviewCandidate,
  definition: ResolvedBudgetTopicDefinition
): number {
  const terms = budgetTopicSelectionTerms[definition.topic.slug] ?? [];
  if (terms.length === 0) {
    return 0;
  }
  const fields = [
    [row.display_program_name, 16],
    [row.moku_name, 6],
    [row.kou_name, 3],
    [row.department_display_name, 2],
    [row.kan_name, 1],
  ] as const;
  return terms.reduce(
    (score, term) =>
      score +
      fields.reduce(
        (fieldScore, [value, weight]) =>
          fieldScore + (value.includes(term) ? weight : 0),
        0
      ),
    0
  );
}

function isGenericOrPeripheral(
  row: BudgetTopicReviewCandidate,
  definition: ResolvedBudgetTopicDefinition
): boolean {
  if (genericProgramNamePattern.test(row.display_program_name)) {
    return true;
  }
  return (
    topicSpecificExclusions[definition.topic.slug]?.test(
      row.display_program_name
    ) ?? false
  );
}

function selectPublishedRows(
  rows: BudgetTopicReviewCandidate[],
  definition: ResolvedBudgetTopicDefinition
): Set<string> {
  const hasSelectionTerms =
    (budgetTopicSelectionTerms[definition.topic.slug]?.length ?? 0) > 0;
  const eligible = rows.filter((row) => {
    const score = directnessScore(row, definition);
    return (
      wasEligibleBeforePolicy(row) &&
      row.evidence_level === "B_strong_structural" &&
      row.confidence === "high" &&
      Number(row.amount_thousand_yen) > 0 &&
      !isGenericOrPeripheral(row, definition) &&
      (!hasSelectionTerms || score > 0)
    );
  });
  eligible.sort(
    (left, right) =>
      directnessScore(right, definition) - directnessScore(left, definition) ||
      Number(right.amount_thousand_yen) - Number(left.amount_thousand_yen) ||
      left.budget_program_identity_id.localeCompare(
        right.budget_program_identity_id
      )
  );
  return new Set(
    eligible
      .slice(0, budgetTopicPublicationLimits.maxProgramsPerTopic)
      .map((row) => row.budget_program_identity_id)
  );
}

function curateReviewRows(
  rows: BudgetTopicReviewCandidate[],
  definition: ResolvedBudgetTopicDefinition,
  previousName: string
): BudgetTopicReviewCandidate[] {
  const name = definition.topic.name;
  const publicationStatus = definition.topic.publicationStatus;
  const selectedIds =
    publicationStatus === "published"
      ? selectPublishedRows(rows, definition)
      : new Set<string>();

  return rows.map((row) => {
    const common = {
      ...row,
      candidate_topic: name,
      proposed_explanation: replaceTopicName(
        row.proposed_explanation,
        previousName,
        name
      ),
    };
    if (publicationStatus === "archived") {
      return {
        ...common,
        review_decision: "reject" as const,
        review_note: `${POLICY_NOTE_PREFIX} 広域な行政機能topicは具体的な課題topicと重複するため公開しない`,
      };
    }
    if (selectedIds.has(row.budget_program_identity_id)) {
      return {
        ...common,
        review_decision:
          row.review_decision === "revise"
            ? ("revise" as const)
            : ("approve" as const),
        review_note: `${POLICY_NOTE_PREFIX} B_strong_structural・highを確認し、topicとの直接性が高い代表事業として承認`,
      };
    }
    if (
      row.review_decision === "reject" &&
      !row.review_note.startsWith(POLICY_NOTE_PREFIX)
    ) {
      return common;
    }
    return {
      ...common,
      review_decision: "reject" as const,
      review_note: isGenericOrPeripheral(row, definition)
        ? `${POLICY_NOTE_PREFIX} 一般管理・人件費・基金等よりもtopicとの直接性を優先して非公開`
        : `${POLICY_NOTE_PREFIX} 関連候補だが、topicとの直接性と表示上限12件を優先して非公開`,
    };
  });
}

function assertPublicationPolicy(
  definitions: ResolvedBudgetTopicDefinition[],
  reviewDirectory: string
): CuratedBudgetTopicResult[] {
  const publishedCountByCategory = new Map<string, number>();
  const results = definitions.map((definition) => {
    const review = readBudgetTopicReviewFile(
      path.join(reviewDirectory, definition.topic.reviewFile)
    );
    const publicationStatus = definition.topic.publicationStatus;
    if (
      definition.topic.name.length >
      budgetTopicPublicationLimits.maxTopicNameLength
    ) {
      throw new Error(
        `topic名が${budgetTopicPublicationLimits.maxTopicNameLength}文字を超えています: ${definition.topic.slug}`
      );
    }
    if (review.candidateTopicName !== definition.topic.name) {
      throw new Error(
        `review CSVのtopic名が一致しません: ${definition.topic.reviewFile}`
      );
    }
    if (review.pendingRows.length > 0) {
      throw new Error(
        `review待ちが残っています: ${definition.topic.slug} (${review.pendingRows.length})`
      );
    }
    if (publicationStatus === "published") {
      if (
        review.selectedRows.length === 0 ||
        review.selectedRows.length >
          budgetTopicPublicationLimits.maxProgramsPerTopic
      ) {
        throw new Error(
          `公開topicの事業数が範囲外です: ${definition.topic.slug} (${review.selectedRows.length})`
        );
      }
      publishedCountByCategory.set(
        definition.categorySlug,
        (publishedCountByCategory.get(definition.categorySlug) ?? 0) + 1
      );
    } else if (review.selectedRows.length > 0) {
      throw new Error(
        `非公開topicに承認行が残っています: ${definition.topic.slug}`
      );
    }
    return {
      topicSlug: definition.topic.slug,
      publicationStatus,
      candidateCount: review.rows.length,
      selectedCount: review.selectedRows.length,
      rejectedCount: review.rejectedRows.length,
    };
  });

  for (const [categorySlug, topicCount] of publishedCountByCategory) {
    if (topicCount > budgetTopicPublicationLimits.maxTopicsPerCategory) {
      throw new Error(
        `大分類の公開topic数が上限を超えています: ${categorySlug} (${topicCount})`
      );
    }
  }
  return results;
}

export function curateBudgetTopicPublicationFiles(
  definitionsDirectory: string,
  reviewDirectory: string
): CuratedBudgetTopicResult[] {
  const definitionFiles = fs
    .readdirSync(definitionsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const previousNamesBySlug = new Map<string, string>();
  for (const fileName of definitionFiles) {
    const filePath = path.join(definitionsDirectory, fileName);
    const definition = JSON.parse(
      fs.readFileSync(filePath, "utf8")
    ) as MutableDefinitionFile;
    for (const topic of definition.topics) {
      const previousName = topic.name;
      const name = getBudgetTopicShortName(topic.slug);
      previousNamesBySlug.set(topic.slug, previousName);
      topic.name = name;
      topic.publicationStatus = getBudgetTopicPublicationStatus(topic.slug);
      for (const rule of topic.rules) {
        rule.explanation = replaceTopicName(
          rule.explanation,
          previousName,
          name
        );
      }
    }
    fs.writeFileSync(
      filePath,
      `${JSON.stringify(definition, null, 2)}\n`,
      "utf8"
    );
  }

  const definitions = loadBudgetTopicDefinitions(definitionsDirectory);
  for (const definition of definitions) {
    const reviewPath = path.join(reviewDirectory, definition.topic.reviewFile);
    const review = readBudgetTopicReviewFile(reviewPath);
    const previousName =
      previousNamesBySlug.get(definition.topic.slug) ?? definition.topic.name;
    fs.writeFileSync(
      reviewPath,
      serializeBudgetTopicReviewRows(
        curateReviewRows(review.rows, definition, previousName)
      ),
      "utf8"
    );
  }

  return assertPublicationPolicy(
    loadBudgetTopicDefinitions(definitionsDirectory),
    reviewDirectory
  );
}
