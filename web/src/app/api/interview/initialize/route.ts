import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { getInterviewQuestions } from "@/features/interview-config/server/loaders/get-interview-questions";
import { initializeInterviewChat } from "@/features/interview-session/server/loaders/initialize-interview-chat";
import { resolveInterviewRuntimeAccess } from "@/features/interview-session/server/services/resolve-interview-runtime-access";
import { jsonResponse } from "@/lib/api/response";
import { registerNodeTelemetry } from "@/lib/telemetry/register";

export async function POST(req: Request) {
  await registerNodeTelemetry();

  let body: { billId?: unknown };
  try {
    body = (await req.json()) as { billId?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const billId = typeof body.billId === "string" ? body.billId : "";
  if (!billId) {
    return jsonResponse({ error: "billId is required" }, 400);
  }

  const {
    data: { user },
    error: getUserError,
  } = await getChatSupabaseUser();

  if (getUserError || !user) {
    return jsonResponse({ error: "Googleログインが必要です" }, 401);
  }

  try {
    await checkSystemDailyCostLimit();
    await checkSystemMonthlyCostLimit();

    const access = await resolveInterviewRuntimeAccess({ billId });
    if (!access) {
      return jsonResponse({ error: "Interview config not found" }, 404);
    }

    const [questions, { session, messages }] = await Promise.all([
      getInterviewQuestions(access.interviewConfig.id),
      initializeInterviewChat(billId, access.interviewConfig.id, {
        getUser: async () => ({
          data: { user: { id: user.id } },
          error: null,
        }),
      }),
    ]);

    return jsonResponse(
      {
        session,
        messages,
        mode: access.interviewConfig.mode,
        totalQuestions: questions.length,
        estimatedDuration: access.interviewConfig.estimated_duration,
        sessionStartedAt: session.started_at,
        hasRated: session.rating != null,
        billTitle: access.bill.bill_content?.title ?? access.bill.name,
      },
      200
    );
  } catch (error) {
    console.error("Interview initialize request error:", error);
    return jsonResponse({ error: "AIインタビューを開始できませんでした" }, 500);
  }
}
