import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "../shared/consent";

export async function savePublicCommentEmailPreference(
  userId: string,
  optedIn: boolean
) {
  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("public_comment_email_preferences")
    .upsert({
      user_id: userId,
      opted_in: optedIn,
      consent_version: PUBLIC_COMMENT_CONSENT_VERSION,
      consented_at: optedIn ? now : null,
      updated_at: now,
    });
  if (error) throw new Error("Failed to save public comment email preference");
}
