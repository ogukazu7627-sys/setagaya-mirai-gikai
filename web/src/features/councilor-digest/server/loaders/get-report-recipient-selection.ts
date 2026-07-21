import "server-only";

import { notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/features/interview-session/server/utils/verify-session-ownership";
import type { ReportRecipientSelection } from "../../shared/types";
import {
  findReportOwnerAndBill,
  getReportRecipientSelectionData,
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

  return getReportRecipientSelectionData({
    reportId,
    billId: report.billId,
  });
}
