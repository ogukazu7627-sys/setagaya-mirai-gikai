import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const budgetTopicCategoryCatalog = [
  { slug: "education", name: "教育" },
  { slug: "child-rearing", name: "子育て" },
  { slug: "welfare", name: "福祉" },
  { slug: "urban-development", name: "まちづくり" },
  { slug: "disaster-prevention", name: "防災" },
  { slug: "administration-finance", name: "行財政" },
  { slug: "culture-sports", name: "文化・スポーツ" },
  { slug: "industry", name: "産業" },
  { slug: "environment", name: "環境問題" },
  { slug: "daily-life", name: "暮らし" },
] as const;

export const budgetTopicCandidateFieldSchema = z.enum([
  "account_code",
  "account_name",
  "kan_name",
  "kou_name",
  "moku_name",
  "display_program_name",
  "department_display_name",
  "major_program_name",
  "budget_program_name",
  "detail_program_name",
]);

const budgetTopicMatcherSchema = z.strictObject({
  field: budgetTopicCandidateFieldSchema,
  operator: z.enum(["equals", "includes"]),
  values: z.array(z.string().min(1)).min(1),
});

const budgetTopicCandidateRuleSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    relationType: z.enum(["responds_to", "supports", "maintains", "enables"]),
    evidenceLevel: z.enum(["B_strong_structural", "C_editorial"]),
    confidence: z.enum(["high", "medium", "low"]),
    explanation: z.string().min(1),
    all: z.array(budgetTopicMatcherSchema).default([]),
    any: z.array(budgetTopicMatcherSchema).default([]),
  })
  .superRefine((rule, context) => {
    if (rule.all.length === 0 && rule.any.length === 0) {
      context.addIssue({
        code: "custom",
        message: "candidate ruleにはallまたはanyが必要です",
      });
    }
  });

const budgetTopicDefinitionSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  topicKind: z.enum(["problem", "goal", "administrative_function"]),
  editorialNote: z.string().min(1),
  reviewFile: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-candidates\.csv$/),
  rules: z.array(budgetTopicCandidateRuleSchema).min(1),
});

const budgetTopicDefinitionFileSchema = z.strictObject({
  schemaVersion: z.literal("budget-topic-definition-v1"),
  fiscalYear: z.literal(2026),
  budgetType: z.literal("initial_budget"),
  category: z.strictObject({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
  }),
  topics: z.array(budgetTopicDefinitionSchema).min(1),
});

export type BudgetTopicCandidateField = z.infer<
  typeof budgetTopicCandidateFieldSchema
>;
export type BudgetTopicCandidateRule = z.infer<
  typeof budgetTopicCandidateRuleSchema
>;
export type BudgetTopicDefinitionFile = z.infer<
  typeof budgetTopicDefinitionFileSchema
>;
export type BudgetTopicDefinition = z.infer<typeof budgetTopicDefinitionSchema>;

export interface ResolvedBudgetTopicDefinition {
  fiscalYear: 2026;
  budgetType: "initial_budget";
  categorySlug: string;
  categoryName: string;
  topic: BudgetTopicDefinition;
  definitionFile: string;
}

export function getDefaultBudgetTopicDefinitionsDirectory(
  invocationDirectory = process.env.INIT_CWD ?? process.cwd()
): string {
  return path.resolve(
    invocationDirectory,
    "data/budget/editorial/topic-definitions"
  );
}

function formatDefinitionError(fileName: string, error: z.ZodError): Error {
  const detail = error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  return new Error(`${fileName} のtopic定義が不正です: ${detail}`);
}

function assertCategoryCatalog(definitions: BudgetTopicDefinitionFile[]): void {
  const expected = new Map<string, string>(
    budgetTopicCategoryCatalog.map((category) => [category.slug, category.name])
  );
  const actual = new Map<string, string>();

  for (const definition of definitions) {
    if (actual.has(definition.category.slug)) {
      throw new Error(
        `category定義が重複しています: ${definition.category.slug}`
      );
    }
    actual.set(definition.category.slug, definition.category.name);
  }

  for (const [slug, name] of expected) {
    if (actual.get(slug) !== name) {
      throw new Error(`category定義が不足または不一致です: ${slug} (${name})`);
    }
  }
  for (const slug of actual.keys()) {
    if (!expected.has(slug)) {
      throw new Error(`未定義のcategory slugです: ${slug}`);
    }
  }
}

export function loadBudgetTopicDefinitions(
  definitionsDirectory: string
): ResolvedBudgetTopicDefinition[] {
  const entries = fs
    .readdirSync(definitionsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));

  const definitionFiles = entries.map((entry) => {
    const filePath = path.join(definitionsDirectory, entry.name);
    let source: unknown;
    try {
      source = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new Error(
        `${entry.name} をJSONとして読めません: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    const parsed = budgetTopicDefinitionFileSchema.safeParse(source);
    if (!parsed.success) {
      throw formatDefinitionError(entry.name, parsed.error);
    }
    return { fileName: entry.name, definition: parsed.data };
  });

  assertCategoryCatalog(definitionFiles.map(({ definition }) => definition));

  const topicSlugs = new Set<string>();
  const topicNames = new Set<string>();
  const reviewFiles = new Set<string>();
  const resolved: ResolvedBudgetTopicDefinition[] = [];

  for (const { fileName, definition } of definitionFiles) {
    for (const topic of definition.topics) {
      if (topicSlugs.has(topic.slug)) {
        throw new Error(`topic slugが重複しています: ${topic.slug}`);
      }
      if (topicNames.has(topic.name)) {
        throw new Error(`topic nameが重複しています: ${topic.name}`);
      }
      if (reviewFiles.has(topic.reviewFile)) {
        throw new Error(`reviewFileが重複しています: ${topic.reviewFile}`);
      }
      topicSlugs.add(topic.slug);
      topicNames.add(topic.name);
      reviewFiles.add(topic.reviewFile);
      resolved.push({
        fiscalYear: definition.fiscalYear,
        budgetType: definition.budgetType,
        categorySlug: definition.category.slug,
        categoryName: definition.category.name,
        topic,
        definitionFile: fileName,
      });
    }
  }

  const categoryOrder = new Map<string, number>(
    budgetTopicCategoryCatalog.map((category, index) => [category.slug, index])
  );
  return resolved.sort(
    (left, right) =>
      (categoryOrder.get(left.categorySlug) ?? Number.MAX_SAFE_INTEGER) -
        (categoryOrder.get(right.categorySlug) ?? Number.MAX_SAFE_INTEGER) ||
      left.topic.slug.localeCompare(right.topic.slug)
  );
}

export function findBudgetTopicDefinitionForReviewFile(
  definitions: ResolvedBudgetTopicDefinition[],
  inputFile: string,
  candidateTopicName: string
): ResolvedBudgetTopicDefinition {
  const reviewFile = path.basename(inputFile);
  const matches = definitions.filter(
    (definition) =>
      definition.topic.reviewFile === reviewFile &&
      definition.topic.name === candidateTopicName
  );
  if (matches.length !== 1) {
    throw new Error(
      `review CSVに対応するtopic定義を一意に決められません: ${reviewFile} / ${candidateTopicName}`
    );
  }
  return matches[0];
}
