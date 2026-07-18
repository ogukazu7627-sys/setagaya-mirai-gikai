import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import { chatErrorToResponse } from "@/features/chat/server/utils/chat-error-response";
import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { handleInterviewChatRequest } from "@/features/interview-session/server/services/handle-interview-chat-request";
import { resolveInterviewRuntimeAccess } from "@/features/interview-session/server/services/resolve-interview-runtime-access";
import { jsonResponse } from "@/lib/api/response";
import { registerNodeTelemetry } from "@/lib/telemetry/register";

export async function POST(req: Request) {
  // Vercel node環境でinstrumentationが自動で起動しない問題対応
  // 明示的にtelemetryを初期化
  await registerNodeTelemetry();

  const body = await req.json();
  const {
    messages,
    billId,
    currentStage,
    isRetry,
    previewToken,
  }: {
    messages: Array<{ role: string; content: string }>;
    billId: string;
    currentStage: "chat" | "summary" | "summary_complete";
    isRetry?: boolean;
    previewToken?: string;
  } = body;

  const {
    data: { user },
    error: getUserError,
  } = await getChatSupabaseUser();

  if (getUserError || !user) {
    return jsonResponse({ error: "Googleログインが必要です" }, 401);
  }

  if (!billId) {
    return jsonResponse({ error: "billId is required" }, 400);
  }

  try {
    // システム全体の予算上限チェック（日次・月次）
    await checkSystemDailyCostLimit();
    await checkSystemMonthlyCostLimit();

    const access = await resolveInterviewRuntimeAccess({
      billId,
      previewToken,
    });
    if (!access) {
      return jsonResponse({ error: "Interview config not found" }, 404);
    }

    return await handleInterviewChatRequest({
      messages,
      billId,
      currentStage,
      isRetry,
      userId: user.id,
      deps: {
        getBill: async () => access.bill,
        getInterviewConfig: async () => access.interviewConfig,
      },
    });
  } catch (error) {
    console.error("Interview chat request error:", error);
    return chatErrorToResponse(error);
  }
}
