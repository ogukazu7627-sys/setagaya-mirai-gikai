import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appendAdminBillsReturnPath } from "@/features/admin/shared/admin-bill-return-path";
import type {
  BillSource,
  MajorCategoryLabel,
} from "@/features/bills/shared/types";
import { billFormSchema } from "./bill-admin-schemas";
import type { NewTagInput } from "./bill-admin-shared";
import { nullableString } from "./bill-admin-utils";

export function redirectToAdminBillFormError(
  billId: string | undefined,
  message: string,
  returnPath?: string
): never {
  const target = billId ? `/admin/bills/${billId}/edit` : "/admin/bills/new";
  const errorPath = `${target}?error=${encodeURIComponent(message)}`;
  redirect(
    (returnPath
      ? appendAdminBillsReturnPath(errorPath, returnPath)
      : errorPath) as Route
  );
}

export function redirectToAdminBillsError(message: string): never {
  redirect(`/admin/bills?error=${encodeURIComponent(message)}` as Route);
}

function sourcesFromFormData(formData: FormData): BillSource[] {
  const sources: BillSource[] = [];

  for (let index = 0; index < 8; index++) {
    const title = nullableString(formData.get(`source_${index}_title`));
    if (!title) continue;
    sources.push({
      title,
      url: nullableString(formData.get(`source_${index}_url`)),
      source_type:
        nullableString(formData.get(`source_${index}_source_type`)) ??
        "official_page",
      published_at: nullableString(
        formData.get(`source_${index}_published_at`)
      ),
      accessed_at: nullableString(formData.get(`source_${index}_accessed_at`)),
    });
  }

  return sources;
}

function splitTagLabelInput(value: string): string[] {
  return value
    .split(/[,\n、]/)
    .map((label) => label.trim())
    .filter(Boolean);
}

function newTagsFromFormData(
  formData: FormData,
  fallbackCategory: MajorCategoryLabel
): NewTagInput[] {
  const labels = formData.getAll("new_tag_labels");
  const seenLabels = new Set<string>();
  const tags: NewTagInput[] = [];

  labels.forEach((entry) => {
    if (typeof entry !== "string") return;
    for (const label of splitTagLabelInput(entry)) {
      if (seenLabels.has(label)) continue;

      seenLabels.add(label);
      tags.push({
        label,
        major_category: fallbackCategory,
      });
    }
  });

  return tags;
}

function parseBillFormData(formData: FormData) {
  const id = nullableString(formData.get("id")) ?? undefined;
  const majorCategory =
    (nullableString(formData.get("major_category")) as MajorCategoryLabel) ??
    "教育🏫";
  return billFormSchema.parse({
    id,
    name: formData.get("name"),
    item_type: formData.get("item_type"),
    major_category: majorCategory,
    status: formData.get("status"),
    publish_status: formData.get("publish_status"),
    diet_session_id: nullableString(formData.get("diet_session_id")),
    submitted_date: nullableString(formData.get("submitted_date")),
    status_label: nullableString(formData.get("status_label")),
    status_note: nullableString(formData.get("status_note")),
    thumbnail_url: nullableString(formData.get("thumbnail_url")),
    share_thumbnail_url: nullableString(formData.get("share_thumbnail_url")),
    knowledge_source: nullableString(formData.get("knowledge_source")),
    is_review_completed: formData.get("is_review_completed") === "on",
    is_featured: formData.get("is_featured") === "on",
    interview_enabled: true,
    use_knowledge_source_in_chat:
      formData.get("use_knowledge_source_in_chat") === "on",
    normal_title: formData.get("normal_title"),
    normal_summary: formData.get("normal_summary"),
    normal_content: formData.get("normal_content"),
    hard_title: nullableString(formData.get("hard_title")),
    hard_summary: nullableString(formData.get("hard_summary")),
    hard_content: nullableString(formData.get("hard_content")),
    tag_ids: formData.getAll("tag_ids"),
    new_tags: newTagsFromFormData(formData, majorCategory),
    sources: sourcesFromFormData(formData),
  });
}

export function parseBillFormDataOrRedirect(formData: FormData) {
  try {
    return parseBillFormData(formData);
  } catch (error) {
    const id = nullableString(formData.get("id"));
    const returnPath = nullableString(formData.get("return_path"));
    const target = id ? `/admin/bills/${id}/edit` : "/admin/bills/new";
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "入力内容を確認してください")
        : "入力内容を確認してください";
    redirect(
      appendAdminBillsReturnPath(
        `${target}?error=${encodeURIComponent(message)}`,
        returnPath ?? "/admin/bills"
      ) as Route
    );
  }
}
