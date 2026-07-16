import "server-only";

import { z } from "zod";
import { majorCategoryLabels, type NewTagInput } from "./bill-admin-shared";

export const billFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "正式タイトルは必須です"),
    item_type: z.enum(["bill", "report", "petition", "question"]),
    major_category: z.enum(majorCategoryLabels),
    status: z.enum([
      "preparing",
      "introduced",
      "in_originating_house",
      "in_receiving_house",
      "enacted",
      "rejected",
    ]),
    publish_status: z.enum(["draft", "published"]),
    diet_session_id: z.string().uuid().nullable(),
    submitted_date: z.string().nullable(),
    status_label: z.string().trim().nullable(),
    status_note: z.string().trim().nullable(),
    thumbnail_url: z.string().trim().nullable(),
    share_thumbnail_url: z.string().trim().nullable(),
    knowledge_source: z.string().trim().nullable(),
    is_review_completed: z.boolean(),
    is_featured: z.boolean(),
    interview_enabled: z.boolean(),
    use_knowledge_source_in_chat: z.boolean(),
    normal_title: z.string().trim().min(1, "normalの表示タイトルは必須です"),
    normal_summary: z.string().trim().min(1, "normalの概要は必須です"),
    normal_content: z.string().trim().min(1, "normalの本文は必須です"),
    hard_title: z.string().trim().nullable(),
    hard_summary: z.string().trim().nullable(),
    hard_content: z.string().trim().nullable(),
    tag_ids: z.array(z.string().uuid()).max(3, "タグは最大3つまでです"),
    new_tags: z.array(
      z.object({
        label: z.string().trim().min(1),
        major_category: z.enum(majorCategoryLabels),
      })
    ),
    sources: z.array(
      z.object({
        title: z.string().trim().min(1),
        url: z.string().trim().nullable(),
        source_type: z.string().trim().min(1),
        published_at: z.string().trim().nullable(),
        accessed_at: z.string().trim().nullable(),
      })
    ),
  })
  .superRefine((value, ctx) => {
    if (value.tag_ids.length + value.new_tags.length > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tag_ids"],
        message: "タグは最大3つまでです",
      });
    }
  });

export type AdminBillSaveInput = z.infer<typeof billFormSchema>;

export const nullableTrimmedStringSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const adminDraftBillApiSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "正式タイトルは必須です"),
    item_type: z
      .enum(["bill", "report", "petition", "question"])
      .default("bill"),
    major_category: z.enum(majorCategoryLabels),
    status: z
      .enum([
        "preparing",
        "introduced",
        "in_originating_house",
        "in_receiving_house",
        "enacted",
        "rejected",
      ])
      .default("preparing"),
    publish_status: z.literal("draft").optional(),
    diet_session_id: z.string().uuid().nullable().optional(),
    submitted_date: nullableTrimmedStringSchema,
    status_label: nullableTrimmedStringSchema,
    status_note: nullableTrimmedStringSchema,
    thumbnail_url: nullableTrimmedStringSchema,
    share_thumbnail_url: nullableTrimmedStringSchema,
    knowledge_source: nullableTrimmedStringSchema,
    is_review_completed: z.literal(false).optional(),
    is_featured: z.boolean().optional().default(false),
    interview_enabled: z.boolean().optional().default(false),
    use_knowledge_source_in_chat: z.boolean().optional().default(false),
    normal_title: z.string().trim().min(1, "normalの表示タイトルは必須です"),
    normal_summary: z.string().trim().min(1, "normalの概要は必須です"),
    normal_content: z.string().trim().min(1, "normalの本文は必須です"),
    hard_title: nullableTrimmedStringSchema,
    hard_summary: nullableTrimmedStringSchema,
    hard_content: nullableTrimmedStringSchema,
    tag_ids: z.array(z.string().uuid()).optional().default([]),
    tag_labels: z.array(z.string().trim()).optional().default([]),
    new_tags: z
      .array(
        z.object({
          label: z.string().trim().min(1),
          major_category: z.enum(majorCategoryLabels),
        })
      )
      .optional()
      .default([]),
    new_tag_labels: z.array(z.string().trim()).optional().default([]),
    new_tag_major_categories: z
      .array(z.enum(majorCategoryLabels))
      .optional()
      .default([]),
    new_tag_major_category: z.enum(majorCategoryLabels).optional(),
    sources: z
      .array(
        z.object({
          title: z.string().trim().min(1),
          url: nullableTrimmedStringSchema,
          source_type: z.string().trim().min(1).default("official_page"),
          published_at: nullableTrimmedStringSchema,
          accessed_at: nullableTrimmedStringSchema,
        })
      )
      .optional()
      .default([]),
  })
  .superRefine((value, ctx) => {
    const labelCount = new Set([
      ...value.tag_labels.map((label) => label.trim()).filter(Boolean),
      ...value.new_tag_labels.map((label) => label.trim()).filter(Boolean),
      ...value.new_tags.map((tag) => tag.label.trim()).filter(Boolean),
    ]).size;
    const totalTagCount = labelCount > 0 ? labelCount : value.tag_ids.length;
    if (totalTagCount > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tag_labels"],
        message: "タグは最大3つまでです",
      });
    }
  })
  .transform((value) => {
    const fallbackCategory =
      value.new_tag_major_category ?? value.major_category;
    const hasTagLabelInput =
      value.tag_labels.some((label) => label.trim().length > 0) ||
      value.new_tag_labels.some((label) => label.trim().length > 0) ||
      value.new_tags.some((tag) => tag.label.trim().length > 0);
    const tagsFromLabels = value.tag_labels
      .map((label) => ({
        label: label.trim(),
        major_category: fallbackCategory,
      }))
      .filter((tag) => tag.label.length > 0);
    const newTagsFromLabels = value.new_tag_labels
      .map((label, index) => ({
        label: label.trim(),
        major_category:
          value.new_tag_major_categories[index] ?? fallbackCategory,
      }))
      .filter((tag) => tag.label.length > 0);

    const dedupedNewTags = new Map<string, NewTagInput>();
    for (const tag of [
      ...value.new_tags,
      ...newTagsFromLabels,
      ...tagsFromLabels,
    ]) {
      if (!dedupedNewTags.has(tag.label)) {
        dedupedNewTags.set(tag.label, tag);
      }
    }

    return {
      id: value.id,
      name: value.name,
      item_type: value.item_type,
      major_category: value.major_category,
      status: value.status,
      publish_status: "draft" as const,
      diet_session_id: value.diet_session_id ?? null,
      submitted_date: value.submitted_date,
      status_label: value.status_label,
      status_note: value.status_note,
      thumbnail_url: value.thumbnail_url,
      share_thumbnail_url: value.share_thumbnail_url,
      knowledge_source: value.knowledge_source,
      is_review_completed: false,
      is_featured: value.is_featured,
      interview_enabled: value.interview_enabled,
      use_knowledge_source_in_chat: value.use_knowledge_source_in_chat,
      normal_title: value.normal_title,
      normal_summary: value.normal_summary,
      normal_content: value.normal_content,
      hard_title: value.hard_title,
      hard_summary: value.hard_summary,
      hard_content: value.hard_content,
      tag_ids: hasTagLabelInput ? [] : value.tag_ids,
      new_tags: Array.from(dedupedNewTags.values()),
      sources: value.sources,
    } satisfies AdminBillSaveInput;
  });
