import "server-only";

import { createAdminClient, type Database } from "@mirai-gikai/supabase";

type IssueReportRow = Database["public"]["Tables"]["issue_reports"]["Row"];

export type AdminIssueReport = IssueReportRow & {
  bill: {
    id: string;
    name: string;
    publish_status: Database["public"]["Enums"]["bill_publish_status"];
  } | null;
};

export async function listAdminIssueReports(): Promise<AdminIssueReport[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("issue_reports")
    .select(
      `
      *,
      bill:bills (
        id,
        name,
        publish_status
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch issue reports: ${error.message}`);
  }

  return (data ?? []) as AdminIssueReport[];
}
