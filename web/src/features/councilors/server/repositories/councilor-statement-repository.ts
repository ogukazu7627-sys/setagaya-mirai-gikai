import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";
import { extractCouncilorStatementsFromMarkdown } from "@/lib/markdown/extract-councilor-statements";
import { buildCouncilorStatementRows } from "../../shared/utils/build-councilor-statement-rows";

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
  statementCount: number;
};

export type PublishedCouncilorStatementDetail = CouncilorStatementRow & {
  bills: {
    id: string;
    name: string;
    slug: string | null;
    submitted_date: string | null;
  } | null;
};

export type SyncCouncilorBillStatementsResult = {
  statementCount: number;
  unknownCouncilorNames: string[];
};

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
  const { data, error } = await supabase
    .from("councilor_bill_statements")
    .select(
      `
      councilor_id,
      councilor_name,
      bills!inner (
        publish_status
      )
    `
    )
    .eq("difficulty_level", "normal")
    .eq("bills.publish_status", "published");

  if (error) {
    throw new Error(
      `Failed to fetch councilor statement counts: ${error.message}`
    );
  }

  const counts = new Map<string, CouncilorStatementCount>();
  for (const row of data ?? []) {
    const key = row.councilor_id ?? `name:${row.councilor_name}`;
    const current = counts.get(key);
    if (current) {
      current.statementCount += 1;
      continue;
    }

    counts.set(key, {
      councilorId: row.councilor_id,
      councilorName: row.councilor_name,
      statementCount: 1,
    });
  }

  return Array.from(counts.values()).sort(
    (a, b) =>
      b.statementCount - a.statementCount ||
      a.councilorName.localeCompare(b.councilorName, "ja")
  );
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
        publish_status
      )
    `
    )
    .eq("difficulty_level", "normal")
    .eq("bills.publish_status", "published")
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

  return (data ?? []) as PublishedCouncilorStatementDetail[];
}
