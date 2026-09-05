import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import { COUNCILOR_STATEMENT_PUBLICATION_CATEGORIES } from "@/features/bills/shared/constants/publication-categories";
import type { BillPublicationCategory } from "@/features/bills/shared/types";
import { extractCouncilorStatementsFromMarkdown } from "@/lib/markdown/extract-councilor-statements";
import { buildCouncilorStatementRows } from "../../shared/utils/build-councilor-statement-rows";
import {
  addCouncilorQuestionCount,
  type CouncilorQuestionCounts,
  createEmptyCouncilorQuestionCounts,
} from "../../shared/utils/councilor-question-counts";

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;
type CouncilorRow = Database["public"]["Tables"]["councilors"]["Row"];
type CouncilorStatementRow =
  Database["public"]["Tables"]["councilor_bill_statements"]["Row"];

export type CouncilorStatementWithCouncilor = CouncilorStatementRow & {
  councilor: Pick<
    CouncilorRow,
    "id" | "display_name" | "normalized_name" | "icon_url"
  > | null;
};

export type CouncilorStatementCount = {
  councilorId: string | null;
  councilorName: string;
  questionCounts: CouncilorQuestionCounts;
};

export type CouncilorStatementCountById = {
  councilorId: string;
  questionCounts: CouncilorQuestionCounts;
};

type PublishedCouncilorStatementCountRow = Pick<
  CouncilorStatementRow,
  "councilor_id" | "councilor_name"
> & {
  bills: {
    publication_category: BillPublicationCategory;
  } | null;
};

export type PublishedCouncilorStatementDetail = CouncilorStatementRow & {
  bills: {
    id: string;
    name: string;
    slug: string | null;
    submitted_date: string | null;
    publish_status: Database["public"]["Enums"]["bill_publish_status"];
    publication_category: Database["public"]["Enums"]["bill_publication_category"];
    major_category: string | null;
    diet_session: {
      id: string;
      slug: string | null;
      start_date: string;
    } | null;
  } | null;
  billNormalContent: string | null;
};

export type SyncCouncilorBillStatementsResult = {
  statementCount: number;
  unknownCouncilorNames: string[];
};

const PUBLISHED_COUNCILOR_STATEMENT_COUNT_PAGE_SIZE = 1000;

async function findCouncilorIdsByNames(
  supabase: AdminSupabaseClient,
  names: string[]
): Promise<Map<string, string>> {
  const uniqueNames = Array.from(new Set(names));
  if (uniqueNames.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("councilors")
    .select("id, normalized_name")
    .in("normalized_name", uniqueNames);

  if (error) {
    throw new Error(`Failed to fetch councilors: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((councilor) => [councilor.normalized_name, councilor.id])
  );
}

export async function syncCouncilorBillStatements({
  supabase,
  billId,
  normalContent,
  now = new Date().toISOString(),
}: {
  supabase: AdminSupabaseClient;
  billId: string;
  normalContent: string;
  now?: string;
}): Promise<SyncCouncilorBillStatementsResult> {
  const statements = extractCouncilorStatementsFromMarkdown(normalContent);
  const councilorIdByName = await findCouncilorIdsByNames(
    supabase,
    statements.map((statement) => statement.councilorName)
  );
  const { rows, unknownCouncilorNames } = buildCouncilorStatementRows({
    billId,
    statements,
    councilorIdByName,
    now,
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from("councilor_bill_statements")
      .upsert(rows, {
        onConflict: "bill_id,difficulty_level,statement_index",
      });

    if (error) {
      throw new Error(
        `Failed to upsert councilor bill statements: ${error.message}`
      );
    }
  }

  const { error: deleteError } = await supabase
    .from("councilor_bill_statements")
    .delete()
    .eq("bill_id", billId)
    .eq("difficulty_level", "normal")
    .gte("statement_index", rows.length);

  if (deleteError) {
    throw new Error(
      `Failed to prune stale councilor bill statements: ${deleteError.message}`
    );
  }

  return {
    statementCount: rows.length,
    unknownCouncilorNames,
  };
}

export async function findUnknownCouncilorNamesByBillId(
  billId: string
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilor_bill_statements")
    .select("councilor_name")
    .eq("bill_id", billId)
    .eq("difficulty_level", "normal")
    .is("councilor_id", null)
    .order("statement_index", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch unknown councilor statements: ${error.message}`
    );
  }

  return Array.from(new Set((data ?? []).map((row) => row.councilor_name)));
}

export async function findCouncilorStatementsByBillId(
  billId: string
): Promise<CouncilorStatementWithCouncilor[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilor_bill_statements")
    .select(
      `
      *,
      councilor:councilors (
        id,
        display_name,
        normalized_name,
        icon_url
      )
    `
    )
    .eq("bill_id", billId)
    .eq("difficulty_level", "normal")
    .order("statement_index", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch councilor statements by bill: ${error.message}`
    );
  }

  return (data ?? []) as CouncilorStatementWithCouncilor[];
}

export async function findPublishedCouncilorStatementCounts(): Promise<
  CouncilorStatementCount[]
> {
  const supabase = createAdminClient();
  const rows = await fetchPublishedCouncilorStatementCountRows({ supabase });
  const counts = buildPublishedCouncilorStatementCounts(rows);

  return Array.from(counts.values()).sort(
    (a, b) =>
      b.questionCounts.total - a.questionCounts.total ||
      a.councilorName.localeCompare(b.councilorName, "ja")
  );
}

export async function findPublishedCouncilorStatementCountsByCouncilorIds(
  councilorIds: string[]
): Promise<CouncilorStatementCountById[]> {
  const uniqueCouncilorIds = Array.from(new Set(councilorIds));
  if (uniqueCouncilorIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const rows = await fetchPublishedCouncilorStatementCountRows({
    supabase,
    councilorIds: uniqueCouncilorIds,
  });
  const counts = buildPublishedCouncilorStatementCounts(rows);

  return uniqueCouncilorIds.map((councilorId) => ({
    councilorId,
    questionCounts:
      counts.get(councilorId)?.questionCounts ??
      createEmptyCouncilorQuestionCounts(),
  }));
}

export async function findPublishedCouncilorStatementDetails({
  councilorId,
  councilorName,
}: {
  councilorId?: string;
  councilorName?: string;
}): Promise<PublishedCouncilorStatementDetail[]> {
  if (!councilorId && !councilorName) {
    return [];
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("councilor_bill_statements")
    .select(
      `
      *,
      bills!inner (
        id,
        name,
        slug,
        submitted_date,
        publish_status,
        publication_category,
        major_category,
        diet_session:diet_sessions (
          id,
          slug,
          start_date
        )
      )
    `
    )
    .eq("difficulty_level", "normal")
    .eq("bills.publish_status", "published")
    .in(
      "bills.publication_category",
      COUNCILOR_STATEMENT_PUBLICATION_CATEGORIES
    )
    .order("statement_index", { ascending: true });

  query = councilorId
    ? query.eq("councilor_id", councilorId)
    : query.eq("councilor_name", councilorName ?? "");

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Failed to fetch published councilor statement details: ${error.message}`
    );
  }

  const rows = (data ?? []) as Array<
    Omit<PublishedCouncilorStatementDetail, "billNormalContent">
  >;
  const billIds = Array.from(new Set(rows.map((row) => row.bill_id)));
  if (billIds.length === 0) {
    return [];
  }

  const { data: contentRows, error: contentError } = await supabase
    .from("bill_contents")
    .select("bill_id, content")
    .eq("difficulty_level", "normal")
    .in("bill_id", billIds);

  if (contentError) {
    throw new Error(
      `Failed to fetch published councilor statement bill contents: ${contentError.message}`
    );
  }

  const normalContentByBillId = new Map(
    (contentRows ?? []).map((content) => [content.bill_id, content.content])
  );

  return rows.map((row) => ({
    ...row,
    billNormalContent: normalContentByBillId.get(row.bill_id) ?? null,
  }));
}

async function fetchPublishedCouncilorStatementCountRows({
  supabase,
  councilorIds,
}: {
  supabase: AdminSupabaseClient;
  councilorIds?: string[];
}): Promise<PublishedCouncilorStatementCountRow[]> {
  const rows: PublishedCouncilorStatementCountRow[] = [];

  for (let from = 0; ; from += PUBLISHED_COUNCILOR_STATEMENT_COUNT_PAGE_SIZE) {
    let query = supabase
      .from("councilor_bill_statements")
      .select(
        `
        councilor_id,
        councilor_name,
        bills!inner (
          publication_category,
          publish_status
        )
      `
      )
      .eq("difficulty_level", "normal")
      .eq("bills.publish_status", "published")
      .in(
        "bills.publication_category",
        COUNCILOR_STATEMENT_PUBLICATION_CATEGORIES
      );

    if (councilorIds) {
      query = query.in("councilor_id", councilorIds);
    }

    const { data, error } = await query
      .order("id", { ascending: true })
      .range(from, from + PUBLISHED_COUNCILOR_STATEMENT_COUNT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `Failed to fetch councilor statement counts: ${error.message}`
      );
    }

    const pageRows = (data ?? []) as PublishedCouncilorStatementCountRow[];
    rows.push(...pageRows);

    if (pageRows.length < PUBLISHED_COUNCILOR_STATEMENT_COUNT_PAGE_SIZE) {
      return rows;
    }
  }
}

function buildPublishedCouncilorStatementCounts(
  rows: PublishedCouncilorStatementCountRow[]
): Map<string, CouncilorStatementCount> {
  const counts = new Map<string, CouncilorStatementCount>();

  for (const row of rows) {
    const publicationCategory = row.bills?.publication_category;
    if (!publicationCategory) {
      continue;
    }

    const key = row.councilor_id ?? `name:${row.councilor_name}`;
    const current = counts.get(key);
    counts.set(key, {
      councilorId: row.councilor_id,
      councilorName: row.councilor_name,
      questionCounts: addCouncilorQuestionCount(
        current?.questionCounts ?? createEmptyCouncilorQuestionCounts(),
        publicationCategory
      ),
    });
  }

  return counts;
}
