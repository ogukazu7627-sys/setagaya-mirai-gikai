import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { getBudgetQuestionCategoryByMajorCategory } from "../../shared/constants/budget-question-categories";
import type { PublishedBudgetQuestion } from "../../shared/types/budget-question";

type BudgetBillRow = {
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

type BudgetStatementRow = {
  bill_id: string;
  councilor_id: string | null;
  councilor:
    | {
        id: string;
        display_name: string;
        icon_url: string | null;
        is_active: boolean;
      }
    | Array<{
        id: string;
        display_name: string;
        icon_url: string | null;
        is_active: boolean;
      }>
    | null;
};

type BudgetContentRow = {
  bill_id: string;
  content: string;
  difficulty_level: DifficultyLevelEnum;
  summary: string;
  title: string;
};

export async function findPublishedBudgetQuestions(): Promise<
  PublishedBudgetQuestion[]
> {
  if (isSetagayaMockMode) {
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
    .eq("publish_status", "published")
    .eq("publication_category", "budget")
    .order("submitted_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (billsError) {
    throw new Error(
      `Failed to fetch published budget questions: ${billsError.message}`
    );
  }

  const bills = (billRows ?? []) as unknown as BudgetBillRow[];
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
          statement_index,
          councilor:councilors(id, display_name, icon_url, is_active)
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
      `Failed to hydrate published budget questions: ${
        statementsResult.error?.message ?? contentsResult.error?.message
      }`
    );
  }

  const statementsByBillId = new Map<string, BudgetStatementRow[]>();
  for (const statement of (statementsResult.data ??
    []) as unknown as BudgetStatementRow[]) {
    const statements = statementsByBillId.get(statement.bill_id) ?? [];
    statements.push(statement);
    statementsByBillId.set(statement.bill_id, statements);
  }
  const contentsByBillId = new Map<
    string,
    PublishedBudgetQuestion["contents"]
  >();
  for (const content of (contentsResult.data ??
    []) as unknown as BudgetContentRow[]) {
    const contents = contentsByBillId.get(content.bill_id) ?? {};
    contents[content.difficulty_level] = {
      difficultyLevel: content.difficulty_level,
      title: content.title,
      summary: content.summary,
      content: content.content,
    };
    contentsByBillId.set(content.bill_id, contents);
  }

  return bills.flatMap((bill): PublishedBudgetQuestion[] => {
    const category = getBudgetQuestionCategoryByMajorCategory(
      bill.major_category
    );
    const statements = statementsByBillId.get(bill.id) ?? [];
    const statement = statements.length === 1 ? statements[0] : null;
    const councilorRelation = statement?.councilor;
    const councilor = Array.isArray(councilorRelation)
      ? councilorRelation[0]
      : councilorRelation;
    const contents = contentsByBillId.get(bill.id) ?? {};
    if (
      !category ||
      !statement?.councilor_id ||
      !councilor?.is_active ||
      !councilor.icon_url ||
      !contents.normal
    ) {
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
        categorySlug: category.slug,
        majorCategory: category.majorCategory,
        submittedDate: bill.submitted_date,
        publishedAt: bill.published_at,
        updatedAt: bill.updated_at,
        dietSession,
        councilor: {
          id: councilor.id,
          displayName: councilor.display_name,
          iconUrl: councilor.icon_url,
        },
        contents,
      },
    ];
  });
}

export async function findPublishedBudgetQuestionReferenceByBillId(
  billId: string
): Promise<{ categorySlug: string } | null> {
  if (isSetagayaMockMode) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("major_category")
    .eq("id", billId)
    .eq("publish_status", "published")
    .eq("publication_category", "budget")
    .maybeSingle();
  if (error) {
    throw new Error(
      `Failed to fetch budget question reference: ${error.message}`
    );
  }
  const category = getBudgetQuestionCategoryByMajorCategory(
    data?.major_category
  );
  return category ? { categorySlug: category.slug } : null;
}
