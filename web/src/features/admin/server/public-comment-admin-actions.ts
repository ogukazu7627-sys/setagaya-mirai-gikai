"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { requireAdmin } from "./auth";
import {
  type PublicCommentReviewStatus,
  updatePublicCommentReviewStatus,
} from "./public-comment-admin";

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
