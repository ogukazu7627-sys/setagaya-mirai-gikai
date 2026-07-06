import type { BillTag, BillWithContent } from "../types";

export function getDisplayTags(
  bill: Pick<BillWithContent, "id" | "major_category" | "tags">
): BillTag[] {
  const majorCategoryTag = bill.major_category
    ? [{ id: `${bill.id}-major-category`, label: bill.major_category }]
    : [];

  return [
    ...majorCategoryTag,
    ...bill.tags.filter((tag) => tag.label !== bill.major_category),
  ];
}
