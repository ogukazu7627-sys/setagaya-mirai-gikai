import "server-only";

import { notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/features/interview-session/server/utils/verify-session-ownership";
import type { ReportRecipientSelection } from "../../shared/types";
import {
  findReportOwnerAndBill,
  listRecipientCandidates,
  listReportRecipients,
} from "../repositories/report-recipient-repository";

export async function getReportRecipientSelection(
  reportId: string
): Promise<ReportRecipientSelection> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    notFound();
  }

  const report = await findReportOwnerAndBill(reportId);
  if (!report || report.userId !== auth.userId) {
    notFound();
  }

  const [candidates, recipients] = await Promise.all([
    listRecipientCandidates(report.billId),
    listReportRecipients(reportId),
  ]);

  return {
    candidates,
    selectedCouncilorIds: recipients.map((recipient) => recipient.councilor_id),
    shareContact: recipients.some((recipient) => recipient.share_contact),
    alreadySentCouncilorIds: recipients
      .filter((recipient) => recipient.status === "sent")
      .map((recipient) => recipient.councilor_id),
  };
}
