import { getEmptyReportRecipientSelectionForBill } from "@/features/councilor-digest/server/repositories/report-recipient-repository";
import { findInterviewSessionWithConfigById } from "@/features/interview-session/server/repositories/interview-session-repository";
import { verifySessionOwnership } from "@/features/interview-session/server/utils/verify-session-ownership";
import { jsonResponse } from "@/lib/api/response";

export async function POST(req: Request) {
  let body: { sessionId?: unknown };
  try {
    body = (await req.json()) as { sessionId?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) {
    return jsonResponse({ error: "sessionId is required" }, 400);
  }

  const ownershipResult = await verifySessionOwnership(sessionId);
  if (!ownershipResult.authorized) {
    return jsonResponse({ error: ownershipResult.error }, 403);
  }

  try {
    const session = await findInterviewSessionWithConfigById(sessionId);
    const config = session.interview_configs as { bill_id?: string } | null;
    const billId = config?.bill_id;
    if (!billId) {
      return jsonResponse({ error: "Interview config not found" }, 404);
    }

    const recipientSelection =
      await getEmptyReportRecipientSelectionForBill(billId);

    return jsonResponse({ recipientSelection }, 200);
  } catch (error) {
    console.error("Recipient candidates request error:", error);
    return jsonResponse({ error: "議員候補を確認できませんでした" }, 500);
  }
}
