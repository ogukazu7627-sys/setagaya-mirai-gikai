import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { RecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import type {
  GeneralQuestionCategoryCardData,
  GeneralQuestionCategoryReference,
  PublishedGeneralQuestion,
} from "../../shared/types/general-question";
import {
  buildGeneralQuestionCategoryCards,
  buildGeneralQuestionCategoryReferences,
  getGeneralQuestionCategoryByMajorCategory,
} from "../../shared/utils/general-question-categories";

type GeneralQuestionCategoryRow = {
  id: string;
  major_category: string | null;
  submitted_date: string | null;
};

type GeneralQuestionBillRow = {
  id: string;
  major_category: string | null;
  name: string;
  published_at: string | null;
  submitted_date: string | null;
  updated_at: string;
  diet_session:
    | { id: string; name: string; slug: string | null }
    | Array<{ id: string; name: string; slug: string | null }>
    | null;
};

type GeneralQuestionStatementRow = {
  bill_id: string;
  councilor_id: string | null;
  councilor_name: string;
  party_or_group: string | null;
  statement_index: number;
  councilor:
    | {
        id: string;
        display_name: string;
        icon_url: string | null;
      }
    | Array<{
        id: string;
        display_name: string;
        icon_url: string | null;
      }>
    | null;
};

type GeneralQuestionContentRow = {
  bill_id: string;
  content: string;
  difficulty_level: DifficultyLevelEnum;
  summary: string;
  title: string;
};

type GeneralQuestionReferenceRow = {
  major_category: string | null;
  updated_at: string;
  diet_session: { start_date: string } | Array<{ start_date: string }> | null;
};

export async function findPublishedGeneralQuestionCategoryCards(
  dietSessionIds: string[],
  year: number
): Promise<GeneralQuestionCategoryCardData[]> {
  if (dietSessionIds.length === 0 || isSetagayaMockMode) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, major_category, submitted_date")
    .in("diet_session_id", dietSessionIds)
    .eq("publish_status", "published")
    .eq("publication_category", "general_question");
  if (error) {
    throw new Error(
      `Failed to fetch general question categories: ${error.message}`
    );
  }

  return buildGeneralQuestionCategoryCards(
    ((data ?? []) as GeneralQuestionCategoryRow[]).map((row) => ({
      id: row.id,
      majorCategory: row.major_category,
      submittedDate: row.submitted_date,
    })),
    year
  );
}

export async function findPublishedGeneralQuestions(input: {
  dietSessionIds: string[];
  majorCategory: string;
}): Promise<PublishedGeneralQuestion[]> {
  if (input.dietSessionIds.length === 0 || isSetagayaMockMode) {
    return [];
  }

  const supabase = createAdminClient();
  const { data: billRows, error: billsError } = await supabase
    .from("bills")
    .select(
      `
        id,
        name,
        major_category,
        submitted_date,
        published_at,
        updated_at,
        diet_session:diet_sessions(id, name, slug)
      `
    )
    .in("diet_session_id", input.dietSessionIds)
    .eq("publish_status", "published")
    .eq("publication_category", "general_question")
    .eq("major_category", input.majorCategory)
    .order("submitted_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (billsError) {
    throw new Error(
      `Failed to fetch published general questions: ${billsError.message}`
    );
  }

  const bills = (billRows ?? []) as unknown as GeneralQuestionBillRow[];
  const billIds = bills.map((bill) => bill.id);
  if (billIds.length === 0) {
    return [];
  }

  const [statementsResult, contentsResult] = await Promise.all([
    supabase
      .from("councilor_bill_statements")
      .select(
        `
          bill_id,
          councilor_id,
          councilor_name,
          party_or_group,
          statement_index,
          councilor:councilors(id, display_name, icon_url)
        `
      )
      .in("bill_id", billIds)
      .eq("difficulty_level", "normal")
      .order("statement_index", { ascending: true }),
    supabase
      .from("bill_contents")
      .select("bill_id, difficulty_level, title, summary, content")
      .in("bill_id", billIds)
      .in("difficulty_level", ["normal", "hard"]),
  ]);
  if (statementsResult.error || contentsResult.error) {
    throw new Error(
      `Failed to hydrate published general questions: ${
        statementsResult.error?.message ?? contentsResult.error?.message
      }`
    );
  }

  const statementsByBillId = new Map<string, GeneralQuestionStatementRow[]>();
  for (const statement of (statementsResult.data ??
    []) as unknown as GeneralQuestionStatementRow[]) {
    const statements = statementsByBillId.get(statement.bill_id) ?? [];
    statements.push(statement);
    statementsByBillId.set(statement.bill_id, statements);
  }

  const contentsByBillId = new Map<
    string,
    PublishedGeneralQuestion["contents"]
  >();
  for (const content of (contentsResult.data ??
    []) as unknown as GeneralQuestionContentRow[]) {
    const contents = contentsByBillId.get(content.bill_id) ?? {};
    contents[content.difficulty_level] = {
      difficultyLevel: content.difficulty_level,
      title: content.title,
      summary: content.summary,
      content: content.content,
    };
    contentsByBillId.set(content.bill_id, contents);
  }

  return bills.flatMap((bill): PublishedGeneralQuestion[] => {
    const category = getGeneralQuestionCategoryByMajorCategory(
      bill.major_category
    );
    const statement = statementsByBillId.get(bill.id)?.[0];
    const councilorRelation = statement?.councilor;
    const councilor = Array.isArray(councilorRelation)
      ? (councilorRelation[0] ?? null)
      : councilorRelation;
    const contents = contentsByBillId.get(bill.id) ?? {};
    if (!category || !statement || !contents.normal) {
      return [];
    }

    const dietSessionRelation = bill.diet_session;
    const dietSession = Array.isArray(dietSessionRelation)
      ? (dietSessionRelation[0] ?? null)
      : dietSessionRelation;
    return [
      {
        id: bill.id,
        name: bill.name,
        categoryId: category.id,
        majorCategory: category.label,
        submittedDate: bill.submitted_date,
        publishedAt: bill.published_at,
        updatedAt: bill.updated_at,
        dietSession,
        partyOrGroup: statement.party_or_group,
        councilor: {
          id:
            councilor?.id ??
            statement.councilor_id ??
            `name:${statement.councilor_name}`,
          displayName: councilor?.display_name ?? statement.councilor_name,
          iconUrl: councilor?.icon_url ?? null,
        },
        contents,
      },
    ];
  });
}

export async function findPublishedGeneralQuestionReferenceByBillId(
  billId: string
): Promise<{ categoryId: RecommendationCategoryId; year: number } | null> {
  if (isSetagayaMockMode) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("major_category, diet_session:diet_sessions(start_date)")
    .eq("id", billId)
    .eq("publish_status", "published")
    .eq("publication_category", "general_question")
    .maybeSingle();
  if (error) {
    throw new Error(
      `Failed to fetch general question reference: ${error.message}`
    );
  }

  const category = getGeneralQuestionCategoryByMajorCategory(
    data?.major_category
  );
  const relation = data?.diet_session;
  const session = Array.isArray(relation) ? relation[0] : relation;
  const yearMatch = session?.start_date.match(/^(\d{4})/u);
  if (!category || !yearMatch) {
    return null;
  }

  return { categoryId: category.id, year: Number(yearMatch[1]) };
}

export async function findPublishedGeneralQuestionCategoryReferences(): Promise<
  GeneralQuestionCategoryReference[]
> {
  if (isSetagayaMockMode) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      "major_category, updated_at, diet_session:diet_sessions(start_date)"
    )
    .eq("publish_status", "published")
    .eq("publication_category", "general_question");
  if (error) {
    throw new Error(
      `Failed to fetch general question sitemap entries: ${error.message}`
    );
  }

  return buildGeneralQuestionCategoryReferences(
    ((data ?? []) as unknown as GeneralQuestionReferenceRow[]).map((row) => {
      const relation = row.diet_session;
      const session = Array.isArray(relation) ? relation[0] : relation;
      return {
        majorCategory: row.major_category,
        sessionStartDate: session?.start_date ?? null,
        updatedAt: row.updated_at,
      };
    })
  );
}
