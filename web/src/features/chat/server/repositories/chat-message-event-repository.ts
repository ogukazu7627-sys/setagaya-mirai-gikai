import "server-only";

import type { Database } from "@mirai-gikai/supabase";
import { createAdminClient } from "@mirai-gikai/supabase";

export type ChatMessageEventInsert =
  Database["public"]["Tables"]["chat_message_events"]["Insert"];

export async function insertChatMessageEvent(payload: ChatMessageEventInsert) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("chat_message_events").insert(payload);

  if (error) {
    throw new Error(`Failed to record chat message event: ${error.message}`, {
      cause: error,
    });
  }
}
