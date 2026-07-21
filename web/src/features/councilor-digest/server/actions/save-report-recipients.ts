"use server";

import { revalidatePath } from "next/cache";
import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { routes } from "@/lib/routes";
import type { SaveReportRecipientsResult } from "../../shared/types";
import {
  findReportOwnerAndBill,
  listRecipientCandidates,
  replacePendingReportRecipients,
} from "../repositories/report-recipient-repository";

export async function saveReportRecipients(
  _prevState: SaveReportRecipientsResult,
  formData: FormData
): Promise<SaveReportRecipientsResult> {
  const reportId = String(formData.get("report_id") ?? "");
  const councilorIds = [...new Set(formData.getAll("councilor_id"))]
    .map(String)
    .filter(Boolean);
  const shareContact = formData.get("share_contact") === "on";

  if (!reportId) {
    return { success: false, message: "レポートIDを確認できませんでした。" };
  }

  if (councilorIds.length === 0) {
    return { success: false, message: "伝えたい議員を1人以上選んでください。" };
  }

  const {
    data: { user },
    error,
  } = await getChatSupabaseUser();

  if (error || !user) {
    return { success: false, message: "Googleログインが必要です。" };
  }

  const report = await findReportOwnerAndBill(reportId);
  if (!report || report.userId !== user.id) {
    return { success: false, message: "このレポートの宛先は変更できません。" };
  }

  const contactEmail = typeof user.email === "string" ? user.email : null;
  const contactName = resolveUserName(user.user_metadata);
  if (shareContact && (!contactEmail || !contactName)) {
    return {
      success: false,
      message:
        "連絡先共有にはGoogleアカウントの名前とメールアドレスが必要です。",
    };
  }

  const candidates = await listRecipientCandidates(report.billId);
  const sourceByCouncilorId = new Map(
    candidates.map((candidate) => [candidate.id, candidate.source])
  );

  try {
    await replacePendingReportRecipients({
      reportId,
      userId: user.id,
      councilorIds,
      sourceByCouncilorId,
      shareContact,
      contactName,
      contactEmail,
    });
  } catch (error) {
    console.error("Failed to save report recipients:", error);
    return {
      success: false,
      message: "宛先の保存に失敗しました。時間をおいて再度お試しください。",
    };
  }

  revalidatePath(routes.reportComplete(reportId));
  return {
    success: true,
    message: "選択を受け付けました。あなたの作業はここで完了です。",
  };
}

function resolveUserName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const values = metadata as Record<string, unknown>;
  for (const key of ["full_name", "name"]) {
    const value = values[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
