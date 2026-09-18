import type { Database } from "../../packages/supabase/types/supabase.types";
import { adminClient, cleanupTestUser, createTestUser } from "./utils";

export async function createPublicCommentFixture(
  mode: "loop" | "bulk" | "targeted" = "loop"
) {
  const user = await createTestUser();
  const slug = `test-public-comment-${crypto.randomUUID()}`;
  const { data: campaign, error } = await adminClient
    .from("public_comment_campaigns")
    .insert({
      slug,
      title: "統合テスト",
      official_url: "https://example.com",
      submission_deadline: "2099-01-01T00:00:00Z",
      status: "published",
      interview_mode: mode,
    })
    .select()
    .single();
  if (error) {
    await cleanupTestUser(user.id);
    throw error;
  }
  const { data: auth } = await adminClient.auth.admin.getUserById(user.id);
  if (!auth.user) throw new Error("Test user not found");
  return {
    user: auth.user,
    campaign,
    createSession: async (
      state?: Database["public"]["Tables"]["public_comment_sessions"]["Insert"]["interview_state"]
    ) => {
      const result = await adminClient
        .from("public_comment_sessions")
        .insert({
          campaign_id: campaign.id,
          user_id: user.id,
          consented_at: new Date().toISOString(),
          interview_state: state,
          receipt_opt_in: false,
        })
        .select()
        .single();
      if (result.error) throw result.error;
      return result.data;
    },
    cleanup: async () => {
      await adminClient
        .from("public_comment_campaigns")
        .delete()
        .eq("id", campaign.id);
      await cleanupTestUser(user.id);
    },
  };
}
