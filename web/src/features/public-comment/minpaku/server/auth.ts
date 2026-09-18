import "server-only";

import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { isGoogleAuthUser } from "@/features/chat/shared/auth";

export async function getPublicCommentActor() {
  const {
    data: { user },
    error,
  } = await getChatSupabaseUser();

  return error ? null : user;
}

export async function getPublicCommentUser() {
  const user = await getPublicCommentActor();

  if (!user || user.is_anonymous || !isGoogleAuthUser(user) || !user.email) {
    return null;
  }

  return user;
}

export function isVerifiedPublicCommentUser(
  user: Awaited<ReturnType<typeof getPublicCommentActor>>
) {
  return Boolean(
    user && !user.is_anonymous && isGoogleAuthUser(user) && user.email
  );
}
