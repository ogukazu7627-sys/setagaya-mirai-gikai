import type {
  BillPublicationCategory,
  BillPublishStatus,
} from "@/features/bills/shared/types";

export const PUBLICATION_CATEGORY_OPTIONS: Array<{
  value: BillPublicationCategory;
  label: string;
}> = [
  { value: "report", label: "報告事項" },
  { value: "general_question", label: "一般質問" },
  { value: "budget", label: "予算" },
];

export type AdminPublicationStatus =
  | "draft"
  | "published_general_question"
  | "published_budget"
  | "published_report";

export const ADMIN_PUBLICATION_STATUS_OPTIONS: Array<{
  value: AdminPublicationStatus;
  label: string;
}> = [
  { value: "draft", label: "下書き" },
  { value: "published_general_question", label: "公開（一般質問）" },
  { value: "published_budget", label: "公開（予算）" },
  { value: "published_report", label: "公開（報告事項）" },
];

export const adminPublicationStatusValues = [
  "draft",
  "published_general_question",
  "published_budget",
  "published_report",
] as const;

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
  publishStatus: BillPublishStatus | string | null | undefined,
  publicationCategory: BillPublicationCategory | string | null | undefined
): AdminPublicationStatus {
  if (publishStatus !== "published") return "draft";

  switch (normalizeBillPublicationCategory(publicationCategory)) {
    case "general_question":
      return "published_general_question";
    case "budget":
      return "published_budget";
    case "report":
      return "published_report";
  }
}

export function splitAdminPublicationStatus(
  status: AdminPublicationStatus | string | null | undefined
): {
  publish_status: Extract<BillPublishStatus, "draft" | "published">;
  publication_category: BillPublicationCategory;
} {
  switch (status) {
    case "published_general_question":
      return {
        publish_status: "published",
        publication_category: "general_question",
      };
    case "published_budget":
      return { publish_status: "published", publication_category: "budget" };
    case "published_report":
      return { publish_status: "published", publication_category: "report" };
    default:
      return { publish_status: "draft", publication_category: "report" };
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
  publishStatus: BillPublishStatus | string | null | undefined,
  publicationCategory: BillPublicationCategory | string | null | undefined
) {
  if (publishStatus === "coming_soon") return "近日公開";
  return adminPublicationStatusLabel(
    toAdminPublicationStatus(publishStatus, publicationCategory)
  );
}
