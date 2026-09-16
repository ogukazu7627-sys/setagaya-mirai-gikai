import "server-only";

import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { isGoogleAuthUser } from "@/features/chat/shared/auth";

export async function getPublicCommentUser() {
  const {
    data: { user },
    error,
  } = await getChatSupabaseUser();

  if (
    error ||
    !user ||
    user.is_anonymous ||
    !isGoogleAuthUser(user) ||
    !user.email
  ) {
    return null;
  }

  return user;
}
