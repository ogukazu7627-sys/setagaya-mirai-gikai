import { z } from "zod";

export const publicCommentStageSchema = z.enum([
  "interview",
  "draft",
  "complete",
]);

export const publicCommentChatResponseSchema = z.object({
  text: z.string(),
  question_id: z.string().nullable(),
  topic_title: z.string().nullable(),
  quick_replies: z.array(z.string()),
  next_stage: publicCommentStageSchema,
});

export const publicCommentDraftSchema = z.object({
  target_ordinances: z.array(z.string()).min(1),
  body: z.string().min(1),
  fact_check_notes: z.array(z.string()),
});

export type PublicCommentChatResponse = z.infer<
  typeof publicCommentChatResponseSchema
>;
export type PublicCommentDraft = z.infer<typeof publicCommentDraftSchema>;
