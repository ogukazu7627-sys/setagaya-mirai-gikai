"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { routes } from "@/lib/routes";
import { updateMinpakuPublicationStatus } from "../repository";

export async function updateMinpakuCommentStatus(formData: FormData) {
  const admin = await requireAdmin();
  const sessionId = formData.get("sessionId");
  const status = formData.get("status");

  if (
    typeof sessionId !== "string" ||
    !sessionId ||
    (status !== "published" &&
      status !== "rejected" &&
      status !== "unpublished")
  ) {
    throw new Error("不正な公開状態です");
  }

  await updateMinpakuPublicationStatus({
    sessionId,
    status,
    reviewedBy: admin.id,
  });
  revalidatePath(routes.publicComments());
  revalidatePath("/public-comment/minpaku/comments");
}
