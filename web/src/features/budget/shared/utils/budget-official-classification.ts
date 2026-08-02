export interface BudgetOfficialClassificationContext {
  label: string;
  filters: {
    accountCode: "general";
    kanCode: string;
  } | null;
}

const categoryClassification = new Map<
  string,
  BudgetOfficialClassificationContext
>([
  [
    "education",
    {
      label: "公式予算分類「教育費」を見る",
      filters: { accountCode: "general", kanCode: "08" },
    },
  ],
]);

export function getBudgetOfficialClassificationContext(
  categorySlug: string | null
): BudgetOfficialClassificationContext {
  return (
    (categorySlug ? categoryClassification.get(categorySlug) : null) ?? {
      label: "公式予算分類から探す",
      filters: null,
    }
  );
}
