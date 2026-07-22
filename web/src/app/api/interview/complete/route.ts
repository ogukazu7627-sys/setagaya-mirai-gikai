import { NextResponse } from "next/server";
import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import {
  findReportOwnerAndBill,
  getReportRecipientSelectionData,
} from "@/features/councilor-digest/server/repositories/report-recipient-repository";
import { completeInterviewSession } from "@/features/interview-session/server/services/complete-interview-session";
import { verifySessionOwnership } from "@/features/interview-session/server/utils/verify-session-ownership";
import {
  isInvalidUserPublicSettingInput,
  parseUserPublicSetting,
} from "@/features/interview-session/shared/utils/public-setting";

export async function POST(req: Request) {
  const { sessionId, isPublic, includeRecipientSelection } = await req.json();
  const isPublicByUser = parseUserPublicSetting(isPublic);

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  if (isInvalidUserPublicSettingInput(isPublic)) {
    return NextResponse.json(
      { error: "Invalid isPublic value" },
      { status: 400 }
    );
  }

  const ownershipResult = await verifySessionOwnership(sessionId);
  if (!ownershipResult.authorized) {
    return NextResponse.json({ error: ownershipResult.error }, { status: 403 });
  }

  try {
    await checkSystemDailyCostLimit();
    await checkSystemMonthlyCostLimit();

    const report = await completeInterviewSession({
      sessionId,
      userId: ownershipResult.userId,
      isPublicByUser,
    });

    if (includeRecipientSelection === false) {
      return NextResponse.json({ report, recipientSelection: null });
    }

    const reportOwner = await findReportOwnerAndBill(report.id);
    const recipientSelection =
      reportOwner && reportOwner.userId === ownershipResult.userId
        ? await getReportRecipientSelectionData({
            reportId: report.id,
            billId: reportOwner.billId,
          })
        : null;

    return NextResponse.json({ report, recipientSelection });
  } catch (error) {
    console.error("Complete interview error:", error);
    const usageLimitResponse = toUsageLimitResponse(error);
    if (usageLimitResponse) {
      return usageLimitResponse;
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete interview",
      },
      { status: 500 }
    );
  }
}

function toUsageLimitResponse(error: unknown) {
  if (!(error instanceof ChatError)) {
    return null;
  }

  if (error.code === ChatErrorCode.SYSTEM_MONTHLY_COST_LIMIT_REACHED) {
    return NextResponse.json(
      {
        error: "今月の利用上限に達しました。来月1日以降に再度お試しください。",
      },
      { status: 429 }
    );
  }

  if (
    error.code === ChatErrorCode.DAILY_COST_LIMIT_REACHED ||
    error.code === ChatErrorCode.DAILY_REQUEST_LIMIT_REACHED ||
    error.code === ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED
  ) {
    return NextResponse.json(
      {
        error: "本日の利用上限に達しました。明日0時以降に再度お試しください。",
      },
      { status: 429 }
    );
  }

  return null;
}
