export type BudgetCategoryCoreLabelLayout =
  | "default"
  | "culture-sports"
  | "urban-development";

export function getBudgetCategoryCoreLabelLayout(
  categorySlug: string
): BudgetCategoryCoreLabelLayout {
  if (categorySlug === "culture-sports") {
    return "culture-sports";
  }

  if (categorySlug === "urban-development") {
    return "urban-development";
  }

  return "default";
}
