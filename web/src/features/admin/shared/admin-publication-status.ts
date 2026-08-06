import type {
  BillPublicationCategory,
  BillPublishStatus,
} from "@/features/bills/shared/types";

export const PUBLICATION_CATEGORY_OPTIONS: Array<{
  value: BillPublicationCategory;
  label: string;
}> = [
  { value: "general_question", label: "一般質問" },
  { value: "budget", label: "予算" },
  { value: "report", label: "報告事項" },
];

export type AdminPublicationStatus = "draft" | "published";

export const ADMIN_PUBLICATION_STATUS_OPTIONS: Array<{
  value: AdminPublicationStatus;
  label: string;
}> = [
  { value: "draft", label: "下書き" },
  { value: "published", label: "公開" },
];

export const adminPublicationStatusValues = ["draft", "published"] as const;

export const publicationCategoryValues = [
  "report",
  "general_question",
  "budget",
] as const;

export function normalizeBillPublicationCategory(
  value: string | null | undefined
): BillPublicationCategory {
  return publicationCategoryValues.includes(value as BillPublicationCategory)
    ? (value as BillPublicationCategory)
    : "report";
}

export function toAdminPublicationStatus(
  publishStatus: BillPublishStatus | string | null | undefined
): AdminPublicationStatus {
  return publishStatus === "published" ? "published" : "draft";
}

export function splitAdminPublicationStatus(
  status: AdminPublicationStatus | string | null | undefined
): {
  publish_status: Extract<BillPublishStatus, "draft" | "published">;
} {
  switch (status) {
    case "published":
      return { publish_status: "published" };
    default:
      return { publish_status: "draft" };
  }
}

export function adminPublicationStatusLabel(
  status: AdminPublicationStatus | string | null | undefined
) {
  return (
    ADMIN_PUBLICATION_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? "指定した公開状態"
  );
}

export function billPublicationStatusLabel(
  publishStatus: BillPublishStatus | string | null | undefined
) {
  if (publishStatus === "coming_soon") return "近日公開";
  return adminPublicationStatusLabel(toAdminPublicationStatus(publishStatus));
}

export function publicationCategoryLabel(
  publicationCategory: BillPublicationCategory | string | null | undefined
) {
  const normalized = normalizeBillPublicationCategory(publicationCategory);
  return (
    PUBLICATION_CATEGORY_OPTIONS.find((option) => option.value === normalized)
      ?.label ?? "報告事項"
  );
}
