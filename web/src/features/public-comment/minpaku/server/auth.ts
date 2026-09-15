import "server-only";

import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";

export async function getAnonymousPublicCommentUser() {
  const {
    data: { user },
    error,
  } = await getChatSupabaseUser();

  if (error || !user) {
    return null;
  }

  return user;
}
