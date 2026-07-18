import "server-only";

import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getBillByIdAdmin } from "@/features/bills/server/loaders/get-bill-by-id-admin";
import { validatePreviewToken } from "@/features/bills/server/loaders/validate-preview-token";
import type { BillWithContent } from "@/features/bills/shared/types";
import {
  getInterviewConfig,
  type InterviewConfig,
} from "@/features/interview-config/server/loaders/get-interview-config";
import { getInterviewConfigAdmin } from "@/features/interview-config/server/loaders/get-interview-config-admin";

type InterviewRuntimeAccessMode = "public" | "preview";

export type InterviewRuntimeAccess = {
  mode: InterviewRuntimeAccessMode;
  bill: BillWithContent;
  interviewConfig: InterviewConfig;
};

function normalizePreviewToken(previewToken?: string | null): string | null {
  const token = previewToken?.trim();
  return token ? token : null;
}

export async function resolveInterviewRuntimeAccess({
  billId,
  previewToken,
  requireInterviewEnabled = true,
}: {
  billId: string;
  previewToken?: string | null;
  requireInterviewEnabled?: boolean;
}): Promise<InterviewRuntimeAccess | null> {
  const token = normalizePreviewToken(previewToken);

  if (token) {
    const isValidToken = await validatePreviewToken(billId, token);
    if (!isValidToken) {
      return null;
    }

    const [bill, interviewConfig] = await Promise.all([
      getBillByIdAdmin(billId),
      getInterviewConfigAdmin(billId),
    ]);

    if (!bill || !interviewConfig) {
      return null;
    }

    return {
      mode: "preview",
      bill,
      interviewConfig,
    };
  }

  const [bill, interviewConfig] = await Promise.all([
    getBillById(billId),
    getInterviewConfig(billId),
  ]);

  if (!bill || !interviewConfig) {
    return null;
  }

  if (requireInterviewEnabled && bill.interview_enabled !== true) {
    return null;
  }

  return {
    mode: "public",
    bill,
    interviewConfig,
  };
}
