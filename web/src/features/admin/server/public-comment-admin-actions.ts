"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { requireAdmin } from "./auth";
import {
  type PublicCommentReviewStatus,
  updatePublicCommentReviewStatus,
} from "./public-comment-admin";
import { upsertPublicCommentAdDailyStat } from "./public-comment-funnel";

export async function updatePublicCommentReviewStatusAction(
  formData: FormData
) {
  const admin = await requireAdmin(routes.adminPublicComments());
  const sessionId = formData.get("sessionId");
  const status = formData.get("status");

  if (
    typeof sessionId !== "string" ||
    !sessionId ||
    (status !== "published" &&
      status !== "rejected" &&
      status !== "unpublished")
  ) {
    throw new Error("不正なパブコメ公開状態です");
  }

  await updatePublicCommentReviewStatus({
    sessionId,
    status: status as PublicCommentReviewStatus,
    reviewedBy: "id" in admin ? admin.id : null,
  });
  revalidatePath(routes.adminPublicComments());
  revalidatePath("/public-comment/minpaku/comments");
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${name}が必要です`);
  return value.trim();
}

function nonNegativeInteger(formData: FormData, name: string) {
  const value = Number(requiredText(formData, name));
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${name}は0以上の整数で入力してください`);
  return value;
}

export async function upsertPublicCommentAdDailyStatAction(formData: FormData) {
  "use server";
  await requireAdmin(routes.adminPublicCommentFunnel());
  const statDate = requiredText(formData, "statDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(statDate))
    throw new Error("日付を確認してください");
  await upsertPublicCommentAdDailyStat({
    statDate,
    utmSource: requiredText(formData, "utmSource"),
    utmCampaign: requiredText(formData, "utmCampaign"),
    utmContent: requiredText(formData, "utmContent"),
    adTheme: requiredText(formData, "adTheme"),
    impressions: nonNegativeInteger(formData, "impressions"),
    linkClicks: nonNegativeInteger(formData, "linkClicks"),
    spendYen: nonNegativeInteger(formData, "spendYen"),
  });
  revalidatePath(routes.adminPublicCommentFunnel());
}
