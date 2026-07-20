import "server-only";

import type { createAdminClient } from "@mirai-gikai/supabase";
import {
  DEFAULT_PETITION_INTERVIEW_CONFIG_NAME,
  DEFAULT_PETITION_INTERVIEW_ESTIMATED_DURATION,
  DEFAULT_PETITION_INTERVIEW_QUESTIONS,
  DEFAULT_PETITION_INTERVIEW_THEMES,
} from "../../shared/default-petition-interview-template";

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

type EnsureDefaultPetitionInterviewConfigParams = {
  supabase: AdminSupabaseClient;
  billId: string;
  now?: string;
};

async function countQuestions(
  supabase: AdminSupabaseClient,
  interviewConfigId: string
) {
  const { count, error } = await supabase
    .from("interview_questions")
    .select("id", { count: "exact", head: true })
    .eq("interview_config_id", interviewConfigId);

  if (error) {
    throw new Error(`インタビュー質問の確認に失敗しました: ${error.message}`);
  }

  return count ?? 0;
}

async function insertDefaultQuestions(
  supabase: AdminSupabaseClient,
  interviewConfigId: string,
  now: string
) {
  const { error } = await supabase.from("interview_questions").insert(
    DEFAULT_PETITION_INTERVIEW_QUESTIONS.map((question) => ({
      interview_config_id: interviewConfigId,
      question: question.question,
      follow_up_guide: question.follow_up_guide,
      quick_replies: [...question.quick_replies],
      question_order: question.question_order,
      updated_at: now,
    }))
  );

  if (error) {
    throw new Error(
      `デフォルトAIインタビュー質問の作成に失敗しました: ${error.message}`
    );
  }
}

export async function ensureDefaultPetitionInterviewConfig({
  supabase,
  billId,
  now = new Date().toISOString(),
}: EnsureDefaultPetitionInterviewConfigParams) {
  const { data: publicConfig, error: publicConfigError } = await supabase
    .from("interview_configs")
    .select("id")
    .eq("bill_id", billId)
    .eq("status", "public")
    .maybeSingle();

  if (publicConfigError) {
    throw new Error(
      `公開AIインタビュー設定の確認に失敗しました: ${publicConfigError.message}`
    );
  }

  let interviewConfigId = publicConfig?.id ?? null;

  if (interviewConfigId) {
    const { error: updatePublicError } = await supabase
      .from("interview_configs")
      .update({
        name: DEFAULT_PETITION_INTERVIEW_CONFIG_NAME,
        themes: [...DEFAULT_PETITION_INTERVIEW_THEMES],
        mode: "loop",
        estimated_duration: DEFAULT_PETITION_INTERVIEW_ESTIMATED_DURATION,
        deleted_at: null,
        updated_at: now,
      })
      .eq("id", interviewConfigId);

    if (updatePublicError) {
      throw new Error(
        `公開AIインタビュー設定の更新に失敗しました: ${updatePublicError.message}`
      );
    }
  }

  if (!interviewConfigId) {
    const { data: latestConfig, error: latestConfigError } = await supabase
      .from("interview_configs")
      .select("id")
      .eq("bill_id", billId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestConfigError) {
      throw new Error(
        `AIインタビュー設定の確認に失敗しました: ${latestConfigError.message}`
      );
    }

    if (latestConfig) {
      const { error: updateError } = await supabase
        .from("interview_configs")
        .update({
          name: DEFAULT_PETITION_INTERVIEW_CONFIG_NAME,
          status: "public",
          themes: [...DEFAULT_PETITION_INTERVIEW_THEMES],
          mode: "loop",
          estimated_duration: DEFAULT_PETITION_INTERVIEW_ESTIMATED_DURATION,
          deleted_at: null,
          updated_at: now,
        })
        .eq("id", latestConfig.id);

      if (updateError) {
        throw new Error(
          `AIインタビュー設定の公開化に失敗しました: ${updateError.message}`
        );
      }

      interviewConfigId = latestConfig.id;
    } else {
      const { data: createdConfig, error: createError } = await supabase
        .from("interview_configs")
        .insert({
          bill_id: billId,
          name: DEFAULT_PETITION_INTERVIEW_CONFIG_NAME,
          status: "public",
          themes: [...DEFAULT_PETITION_INTERVIEW_THEMES],
          mode: "loop",
          estimated_duration: DEFAULT_PETITION_INTERVIEW_ESTIMATED_DURATION,
          updated_at: now,
        })
        .select("id")
        .single();

      if (createError || !createdConfig) {
        throw new Error(
          `AIインタビュー設定の作成に失敗しました: ${
            createError?.message ?? "unknown error"
          }`
        );
      }

      interviewConfigId = createdConfig.id;
    }
  }

  if ((await countQuestions(supabase, interviewConfigId)) === 0) {
    await insertDefaultQuestions(supabase, interviewConfigId, now);
  }

  return interviewConfigId;
}
