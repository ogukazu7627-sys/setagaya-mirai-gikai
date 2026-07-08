import type { Database } from "@mirai-gikai/supabase";
import type { ExtractedCouncilorStatement } from "@/lib/markdown/extract-councilor-statements";

export type CouncilorStatementInsert =
  Database["public"]["Tables"]["councilor_bill_statements"]["Insert"];

export type BuildCouncilorStatementRowsInput = {
  billId: string;
  statements: ExtractedCouncilorStatement[];
  councilorIdByName: Map<string, string>;
  now: string;
};

export type BuildCouncilorStatementRowsResult = {
  rows: CouncilorStatementInsert[];
  unknownCouncilorNames: string[];
};

export function buildCouncilorStatementRows({
  billId,
  statements,
  councilorIdByName,
  now,
}: BuildCouncilorStatementRowsInput): BuildCouncilorStatementRowsResult {
  const unknownNames = new Set<string>();

  const rows = statements.map((statement) => {
    const councilorId = councilorIdByName.get(statement.councilorName) ?? null;
    if (!councilorId) {
      unknownNames.add(statement.councilorName);
    }

    return {
      bill_id: billId,
      difficulty_level: "normal" as const,
      statement_index: statement.statementIndex,
      councilor_id: councilorId,
      councilor_name: statement.councilorName,
      raw_heading: statement.rawHeading,
      party_or_group: statement.partyOrGroup,
      content_md: statement.contentMd,
      content_text: statement.contentText,
      updated_at: now,
    };
  });

  return {
    rows,
    unknownCouncilorNames: Array.from(unknownNames),
  };
}
