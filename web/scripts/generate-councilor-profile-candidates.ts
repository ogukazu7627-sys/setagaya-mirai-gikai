import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { COUNCILOR_STATEMENT_PUBLICATION_CATEGORIES } from "@/features/bills/shared/constants/publication-categories";
import { COUNCILOR_PROFILE_THEMES } from "@/features/councilors/shared/councilor-profile-types";
import { buildCouncilorProfileQuestionSources } from "@/features/councilors/shared/utils/build-councilor-profile-question-sources";
import { selectCouncilorProfileThemes } from "@/features/councilors/shared/utils/select-councilor-profile-themes";

type CouncilorRow = Pick<
  Database["public"]["Tables"]["councilors"]["Row"],
  "id" | "display_name" | "normalized_name"
>;

type StatementRow = {
  bill_id: string;
  councilor_id: string | null;
  councilor_name: string;
  difficulty_level: string;
  statement_index: number;
  bills: {
    id: string;
    name: string;
    major_category: string | null;
    publication_category: string;
    publish_status: string;
  } | null;
};

const PAGE_SIZE = 500;
const CONTENT_CHUNK_SIZE = 100;
const summarySchema = z.object({ summary: z.string().min(1) });

function getArgument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length
  ) ?? null;
}

async function fetchActiveCouncilors(): Promise<CouncilorRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilors")
    .select("id, display_name, normalized_name")
    .eq("is_active", true)
    .not("icon_url", "is", null)
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch councilors: ${error.message}`);
  }
  return data ?? [];
}

async function fetchPublishedStatements(
  councilorIds: string[]
): Promise<StatementRow[]> {
  const supabase = createAdminClient();
  const rows: StatementRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("councilor_bill_statements")
      .select(
        `
        bill_id,
        councilor_id,
        councilor_name,
        difficulty_level,
        statement_index,
        bills!inner (
          id,
          name,
          major_category,
          publication_category,
          publish_status
        )
      `
      )
      .in("councilor_id", councilorIds)
      .eq("difficulty_level", "normal")
      .eq("bills.publish_status", "published")
      .in(
        "bills.publication_category",
        COUNCILOR_STATEMENT_PUBLICATION_CATEGORIES
      )
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch statements: ${error.message}`);
    }
    const pageRows = (data ?? []) as unknown as StatementRow[];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function fetchNormalContentByBillId(
  billIds: string[]
): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const contentByBillId = new Map<string, string>();

  for (let index = 0; index < billIds.length; index += CONTENT_CHUNK_SIZE) {
    const { data, error } = await supabase
      .from("bill_contents")
      .select("bill_id, content")
      .eq("difficulty_level", "normal")
      .in("bill_id", billIds.slice(index, index + CONTENT_CHUNK_SIZE));

    if (error) {
      throw new Error(`Failed to fetch normal content: ${error.message}`);
    }
    for (const row of data ?? []) {
      contentByBillId.set(row.bill_id, row.content);
    }
  }

  return contentByBillId;
}

async function generateSummary({
  councilorName,
  questions,
  themes,
  model,
}: {
  councilorName: string;
  questions: Array<{ billTitle: string; questionText: string }>;
  themes: string[];
  model: string;
}): Promise<string> {
  const { object } = await generateObject({
    model: openai(model),
    schema: summarySchema,
    prompt: `世田谷区議会議員「${councilorName}」の公開中の質問から、レビュー用のプロフィール要約候補を作成してください。

条件:
- 日本語2〜3文。冒頭は「このサイトに掲載中の質問では、」とする
- 指定テーマをすべて扱い、質問本文にある具体例を含める
- 評価、称賛、批判、意図の推測、政党からの類推、他議員との比較をしない
- 「重視」「注力」「追及」「提言」「訴え」は使わない
- 区側の答弁は入力に含まれていないため、質問内容だけを記述する

指定テーマ: ${themes.join("、")}
質問:
${JSON.stringify(
  questions.map((question) => ({
    title: question.billTitle,
    text: question.questionText.slice(0, 800),
  }))
)}`,
  });

  return object.summary;
}

async function main() {
  const outputPath = getArgument("output");
  if (!outputPath) {
    throw new Error(
      "Usage: pnpm councilors:profiles:candidates -- --output=/path/to/candidates.json [--as-of=YYYY-MM-DD] [--model=gpt-4.1-mini]"
    );
  }

  const asOf = getArgument("as-of") ?? new Date().toISOString().slice(0, 10);
  const model = getArgument("model") ?? "gpt-4.1-mini";
  const councilors = await fetchActiveCouncilors();
  const statements = await fetchPublishedStatements(
    councilors.map(({ id }) => id)
  );
  const contentByBillId = await fetchNormalContentByBillId(
    Array.from(new Set(statements.map(({ bill_id }) => bill_id)))
  );
  const councilorById = new Map(councilors.map((row) => [row.id, row]));
  const questions = buildCouncilorProfileQuestionSources(
    statements.flatMap((statement) => {
      const bill = statement.bills;
      const councilor = statement.councilor_id
        ? councilorById.get(statement.councilor_id)
        : null;
      if (!bill || !councilor) {
        return [];
      }
      return [
        {
          billId: bill.id,
          billTitle: bill.name,
          councilorName: councilor.normalized_name,
          difficultyLevel: statement.difficulty_level,
          majorCategory: bill.major_category,
          normalContent: contentByBillId.get(bill.id) ?? null,
          publicationCategory: bill.publication_category,
          publishStatus: bill.publish_status,
          statementIndex: statement.statement_index,
        },
      ];
    })
  );
  const questionsByCouncilor = new Map<
    string,
    typeof questions
  >();
  for (const question of questions) {
    const councilorQuestions =
      questionsByCouncilor.get(question.councilorName) ?? [];
    councilorQuestions.push(question);
    questionsByCouncilor.set(question.councilorName, councilorQuestions);
  }
  const profiles = [];

  for (const councilor of councilors) {
    const councilorQuestions =
      questionsByCouncilor.get(councilor.normalized_name) ?? [];
    const selectedThemes = selectCouncilorProfileThemes(
      councilorQuestions.map(({ majorCategory }) => majorCategory)
    );
    const fallbackThemes =
      selectedThemes.length > 0
        ? selectedThemes
        : selectCouncilorProfileThemes(
            councilorQuestions.map(({ majorCategory }) => majorCategory),
            { minimumCount: 1 }
          );
    const themes = fallbackThemes.map(({ theme }) => theme);
    const summary =
      councilorQuestions.length > 0 && themes.length > 0
        ? await generateSummary({
            councilorName: councilor.display_name,
            questions: councilorQuestions,
            themes,
            model,
          })
        : null;

    profiles.push({
      normalizedName: councilor.normalized_name,
      summary,
      themes,
      questionCount: councilorQuestions.length,
      summaryAsOf: asOf,
    });
  }

  const absoluteOutputPath = path.resolve(outputPath);
  await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await writeFile(
    absoluteOutputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        model,
        conditions: {
          publishStatus: "published",
          difficultyLevel: "normal",
          publicationCategories: COUNCILOR_STATEMENT_PUBLICATION_CATEGORIES,
          messageSide: "questioner",
          allowedThemes: COUNCILOR_PROFILE_THEMES,
        },
        profiles,
      },
      null,
      2
    )}\n`
  );
  console.log(`Wrote ${profiles.length} review candidates to ${absoluteOutputPath}`);
}

await main();
