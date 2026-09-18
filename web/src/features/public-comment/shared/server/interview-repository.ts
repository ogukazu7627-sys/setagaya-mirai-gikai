import "server-only";
import { createAdminClient, type Json } from "@mirai-gikai/supabase";
import { z } from "zod";
import { interviewStateSchema, type InterviewState } from "../interview-state";

export const committedTurnSchema = z.object({
  message: z
    .object({
      id: z.string(),
      role: z.literal("assistant"),
      content: z.string(),
      question_id: z.string().nullable(),
    })
    .nullable(),
  state: interviewStateSchema,
  revision: z.number().int(),
  userMessageStored: z.boolean(),
});

export async function findCommittedTurn(sessionId: string, requestId: string) {
  const { data, error } = await createAdminClient()
    .from("public_comment_interview_turns")
    .select("response")
    .eq("session_id", sessionId)
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw new Error("public_comment_turn_load_failed");
  return data ? committedTurnSchema.parse(data.response) : null;
}

export async function commitInterviewTurn(params: {
  sessionId: string;
  userId: string;
  campaignId: string;
  requestId: string;
  revision: number;
  state: InterviewState;
  userContent?: string;
  userQuestionId?: string | null;
  assistantContent?: string;
  assistantQuestionId?: string | null;
}) {
  const { data, error } = await createAdminClient().rpc(
    "commit_public_comment_interview_turn",
    {
      p_session_id: params.sessionId,
      p_user_id: params.userId,
      p_campaign_id: params.campaignId,
      p_request_id: params.requestId,
      p_expected_revision: params.revision,
      p_state: params.state as unknown as Json,
      p_user_content: params.userContent,
      p_user_question_id: params.userQuestionId ?? undefined,
      p_assistant_content: params.assistantContent,
      p_assistant_question_id: params.assistantQuestionId ?? undefined,
    }
  );
  if (error) throw new Error(error.message);
  return committedTurnSchema.parse(data);
}
