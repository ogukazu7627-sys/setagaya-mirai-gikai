import type { Json } from "@mirai-gikai/supabase";

/**
 * 同じ元行が複数の関係経由で入ることがあるため、表示前に重複を落とす。
 * 元の並び順は維持する。
 */
export function listBudgetSourceReferenceLabels(
  sources: readonly Json[]
): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const source of sources) {
    const label = describeBudgetSourceReference(source);
    if (seen.has(label)) {
      continue;
    }
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

export function describeBudgetSourceReference(source: Json): string {
  const sourceObject = readJsonObject(source);
  if (!sourceObject) {
    return "出典情報あり";
  }

  const sourceType = readSourceValue(sourceObject, "sourceType", "source_type");
  const sourceFile = readSourceValue(sourceObject, "sourceFile", "source_file");
  const sourceRowNumber = readSourceValue(
    sourceObject,
    "sourceRowNumber",
    "source_row_number"
  );
  const pdfPage = readSourceValue(sourceObject, "pdfPage", "pdf_page");
  const budgetBookPage = readSourceValue(
    sourceObject,
    "budgetBookPage",
    "budget_book_page"
  );
  const parts = [
    sourceType === "official_csv"
      ? "公式CSV"
      : sourceType === "official_pdf"
        ? "公式PDF"
        : "派生データ",
    sourceFile,
    sourceRowNumber ? `元CSV ${sourceRowNumber}行` : "",
    pdfPage ? `PDF ${pdfPage}ページ` : "",
    budgetBookPage ? `冊子 ${budgetBookPage}ページ` : "",
  ].filter(Boolean);

  return parts.join(" / ");
}

function readSourceValue(
  source: { [key: string]: Json | undefined },
  camelKey: string,
  snakeKey: string
): string {
  const value = source[camelKey] ?? source[snakeKey];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function readJsonObject(
  value: Json | undefined
): { [key: string]: Json | undefined } | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}
