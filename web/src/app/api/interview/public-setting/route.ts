import {
  findReportBySessionId,
  updateReportPublicSetting,
} from "@/features/interview-report/server/repositories/interview-report-repository";
import { verifySessionOwnership } from "@/features/interview-session/server/utils/verify-session-ownership";
import {
  isInvalidUserPublicSettingInput,
  parseUserPublicSetting,
} from "@/features/interview-session/shared/utils/public-setting";
import { jsonResponse } from "@/lib/api/response";

export async function POST(req: Request) {
  let body: { sessionId?: unknown; isPublic?: unknown };
  try {
    body = (await req.json()) as { sessionId?: unknown; isPublic?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) {
    return jsonResponse({ error: "sessionId is required" }, 400);
  }

  if (isInvalidUserPublicSettingInput(body.isPublic)) {
    return jsonResponse({ error: "Invalid isPublic value" }, 400);
  }

  const isPublicByUser = parseUserPublicSetting(body.isPublic) ?? false;
  const ownershipResult = await verifySessionOwnership(sessionId);
  if (!ownershipResult.authorized) {
    return jsonResponse({ error: ownershipResult.error }, 403);
  }

  try {
    const report = await findReportBySessionId(sessionId);
    await updateReportPublicSetting(report.id, isPublicByUser);
    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("Public setting request error:", error);
    return jsonResponse({ error: "公開設定の更新に失敗しました" }, 500);
  }
}
