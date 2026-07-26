export const BILL_SEO_SITE_NAME = "みらい議会＠世田谷区";

export type BillSeoSource = {
  name: string;
  bill_content?: {
    title?: string | null;
    summary?: string | null;
  } | null;
};

export type BillSeoMetadata = {
  subjectTitle: string;
  title: string;
  description: string;
};

export function normalizeSeoText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function countSeoCharacters(value: string): number {
  return Array.from(value).length;
}

export function buildBillSeoMetadata(bill: BillSeoSource): BillSeoMetadata {
  const formalName = normalizeSeoText(bill.name);
  const friendlyTitle = normalizeSeoText(bill.bill_content?.title);
  const summary = normalizeSeoText(bill.bill_content?.summary);
  const subjectTitle = friendlyTitle || formalName || "世田谷区議会の案件";
  const title = subjectTitle.includes(BILL_SEO_SITE_NAME)
    ? subjectTitle
    : `${subjectTitle} | ${BILL_SEO_SITE_NAME}`;

  const description =
    summary ||
    (formalName
      ? `世田谷区議会の「${formalName}」について、内容や論点、議会での状況をわかりやすく確認できます。`
      : "世田谷区議会の案件について、内容や論点、議会での状況をわかりやすく確認できます。");

  return {
    subjectTitle,
    title,
    description,
  };
}
