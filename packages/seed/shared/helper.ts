import { createClient } from "@supabase/supabase-js";
import type { Database } from "@mirai-gikai/supabase";

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

const TABLES_WITH_ID_TO_CLEAR = [
  "interview_report",
  "interview_messages",
  "interview_sessions",
  "interview_questions",
  "interview_configs",
  "mirai_stances",
  "chats",
  "bill_contents",
  "bills",
  "tags",
  "diet_sessions",
] as const;

const TABLES_WITHOUT_ID_TO_CLEAR = ["bills_tags"] as const;

export async function clearAllData(supabase: AdminClient) {
  console.log("🧹 Clearing existing data...");

  for (const table of TABLES_WITH_ID_TO_CLEAR) {
    await supabase
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
  }

  for (const table of TABLES_WITHOUT_ID_TO_CLEAR) {
    await supabase
      .from(table)
      .delete()
      .neq("created_at", "0001-01-01T00:00:00.000Z");
  }

  console.log("✅ Cleared existing data");
}
