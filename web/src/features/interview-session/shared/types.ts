import type { InterviewMode } from "@mirai-gikai/shared/interview-prompts/types";
import type { Database } from "@mirai-gikai/supabase";

// Database types
export type InterviewSession =
  Database["public"]["Tables"]["interview_sessions"]["Row"];
export type InterviewSessionInsert =
  Database["public"]["Tables"]["interview_sessions"]["Insert"];
export type InterviewSessionUpdate =
  Database["public"]["Tables"]["interview_sessions"]["Update"];

export type InterviewMessage =
  Database["public"]["Tables"]["interview_messages"]["Row"];
export type InterviewMessageInsert =
  Database["public"]["Tables"]["interview_messages"]["Insert"];

export type InterviewReport =
  Database["public"]["Tables"]["interview_report"]["Row"];
export type InterviewReportInsert =
  Database["public"]["Tables"]["interview_report"]["Insert"];

export type InterviewOpinion =
  Database["public"]["Tables"]["interview_opinion"]["Row"];
export type InterviewOpinionInsert =
  Database["public"]["Tables"]["interview_opinion"]["Insert"];

export type InterviewQuestion =
  Database["public"]["Tables"]["interview_questions"]["Row"];

// Request types
export interface InterviewChatRequestParams {
  messages: Array<{ role: string; content: string }>;
  billId: string;
  currentStage: "chat" | "summary" | "summary_complete";
  isRetry?: boolean;
  nextQuestionId?: string;
  previewToken?: string;
}

export interface InterviewInitializeResponse {
  session: {
    id: string;
    started_at: string;
    rating: number | null;
  };
  messages: Array<{
    id: string;
    role: "assistant" | "user";
    content: string;
    created_at: string;
  }>;
  mode: InterviewMode;
  totalQuestions: number;
  estimatedDuration: number | null;
  sessionStartedAt: string;
  hasRated: boolean;
  billTitle: string;
}
