import "server-only";

import type { ZodError } from "zod";
import type {
  BillSource,
  MajorCategoryLabel,
} from "@/features/bills/shared/types";
import {
  type AdminDraftBillApiTag,
  type BillContentRow,
  type BillTagJoinRow,
  majorCategoryLabels,
} from "./bill-admin-shared";

export function nullableString(
  value: FormDataEntryValue | null
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isFormFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value &&
    "type" in value
  );
}

export function submittedDateToDbValue(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

export function toDateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function formatAdminDate(value: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10);
}

export function formatAdminDateTime(value: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16).replace("T", " ");
  }

  const parts = new Intl.DateTimeFormat("ja-JP", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export function getFirstZodIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "入力内容を確認してください。";
}

export function isMajorCategoryLabel(
  value: string | null
): value is MajorCategoryLabel {
  return majorCategoryLabels.includes(value as MajorCategoryLabel);
}

export function selectBillContent(
  contents: BillContentRow[] | null | undefined,
  difficultyLevel: "normal" | "hard"
): BillContentRow | null {
  return (
    contents?.find((content) => content.difficulty_level === difficultyLevel) ??
    null
  );
}

export function normalizeBillSourcesForApi(sources: unknown): BillSource[] {
  if (!Array.isArray(sources)) return [];
  return sources
    .filter(
      (source): source is BillSource =>
        typeof source === "object" &&
        source !== null &&
        "title" in source &&
        typeof source.title === "string"
    )
    .map((source) => ({
      title: source.title,
      url: source.url ?? null,
      source_type: source.source_type ?? "official_page",
      published_at: source.published_at ?? null,
      accessed_at: source.accessed_at ?? null,
    }));
}

export function normalizeJoinedTag(
  tag: BillTagJoinRow["tags"]
): AdminDraftBillApiTag | null {
  return Array.isArray(tag) ? (tag[0] ?? null) : tag;
}
