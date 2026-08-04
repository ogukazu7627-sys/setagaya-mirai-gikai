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
  [
    "child-rearing",
    {
      label: "公式予算分類「民生費」を見る",
      filters: { accountCode: "general", kanCode: "03" },
    },
  ],
  [
    "welfare",
    {
      label: "公式予算分類「民生費」を見る",
      filters: { accountCode: "general", kanCode: "03" },
    },
  ],
  [
    "urban-development",
    {
      label: "公式予算分類「土木費」を見る",
      filters: { accountCode: "general", kanCode: "07" },
    },
  ],
  [
    "disaster-prevention",
    {
      label: "公式予算分類「総務費」を見る",
      filters: { accountCode: "general", kanCode: "02" },
    },
  ],
  [
    "administration-finance",
    {
      label: "公式予算分類「総務費」を見る",
      filters: { accountCode: "general", kanCode: "02" },
    },
  ],
  [
    "culture-sports",
    {
      label: "公式予算分類「総務費」を見る",
      filters: { accountCode: "general", kanCode: "02" },
    },
  ],
  [
    "industry",
    {
      label: "公式予算分類「産業経済費」を見る",
      filters: { accountCode: "general", kanCode: "06" },
    },
  ],
  [
    "environment",
    {
      label: "公式予算分類「環境費」を見る",
      filters: { accountCode: "general", kanCode: "04" },
    },
  ],
  [
    "daily-life",
    {
      label: "公式予算分類「総務費」を見る",
      filters: { accountCode: "general", kanCode: "02" },
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
