import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appendAdminBillsReturnPath } from "@/features/admin/shared/admin-bill-return-path";
import {
  BUDGET_OVERALL_MAJOR_CATEGORY,
  buildBudgetContentMetadata,
} from "@/features/admin/shared/admin-budget-form-values";
import type {
  BillSource,
  MajorCategoryLabel,
} from "@/features/bills/shared/types";
import { getAdminTagMajorCategory } from "../shared/fixed-admin-tags";
import { billFormSchema } from "./bill-admin-schemas";
import {
  type NewTagInput,
  normalizeBillPublicationCategory,
  splitAdminPublicationStatus,
} from "./bill-admin-shared";
import { isMajorCategoryLabel, nullableString } from "./bill-admin-utils";

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

function stringFromFormDataEntry(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
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
        major_category: getAdminTagMajorCategory(label, fallbackCategory),
      });
    }
  });

  return tags;
}

function parseBillFormData(formData: FormData) {
  const id = nullableString(formData.get("id")) ?? undefined;
  const publicationCategory = normalizeBillPublicationCategory(
    nullableString(formData.get("publication_category"))
  );
  const isBudget = publicationCategory === "budget";
  const majorCategory =
    nullableString(formData.get("major_category")) ??
    (isBudget ? BUDGET_OVERALL_MAJOR_CATEGORY : "教育🏫");
  const fallbackTagMajorCategory = isMajorCategoryLabel(majorCategory)
    ? majorCategory
    : "教育🏫";
  const publicationStatus = splitAdminPublicationStatus(
    nullableString(formData.get("publish_status"))
  );
  const name = stringFromFormDataEntry(formData.get("name"));
  const normalContent = stringFromFormDataEntry(formData.get("normal_content"));
  const hardContent = nullableString(formData.get("hard_content"));
  const budgetContentMetadata = isBudget
    ? buildBudgetContentMetadata({
        hardContent,
        name,
        normalContent,
      })
    : null;

  return billFormSchema.parse({
    id,
    name,
    item_type: isBudget ? "report" : formData.get("item_type"),
    major_category: majorCategory,
    status: isBudget ? "introduced" : formData.get("status"),
    publish_status: publicationStatus.publish_status,
    publication_category: publicationCategory,
    diet_session_id: nullableString(formData.get("diet_session_id")),
    submitted_date: nullableString(formData.get("submitted_date")),
    status_label: isBudget
      ? null
      : nullableString(formData.get("status_label")),
    status_note: isBudget ? null : nullableString(formData.get("status_note")),
    thumbnail_url: isBudget
      ? null
      : nullableString(formData.get("thumbnail_url")),
    share_thumbnail_url: isBudget
      ? null
      : nullableString(formData.get("share_thumbnail_url")),
    knowledge_source: nullableString(formData.get("knowledge_source")),
    is_review_completed: isBudget
      ? false
      : formData.get("is_review_completed") === "on",
    is_featured: isBudget ? false : formData.get("is_featured") === "on",
    interview_enabled: true,
    use_knowledge_source_in_chat: true,
    normal_title:
      budgetContentMetadata?.normalTitle ?? formData.get("normal_title"),
    normal_summary:
      budgetContentMetadata?.normalSummary ?? formData.get("normal_summary"),
    normal_content: normalContent,
    hard_title:
      budgetContentMetadata?.hardTitle ??
      nullableString(formData.get("hard_title")),
    hard_summary:
      budgetContentMetadata?.hardSummary ??
      nullableString(formData.get("hard_summary")),
    hard_content: hardContent,
    tag_ids: isBudget ? [] : formData.getAll("tag_ids"),
    new_tags: isBudget
      ? []
      : newTagsFromFormData(formData, fallbackTagMajorCategory),
    sources: isBudget ? [] : sourcesFromFormData(formData),
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
