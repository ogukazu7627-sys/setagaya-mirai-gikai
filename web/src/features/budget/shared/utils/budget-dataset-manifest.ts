import type { Json } from "@mirai-gikai/supabase";

type JsonRecord = { [key: string]: Json | undefined };

function isJsonRecord(value: Json | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getBudgetManifestExpenditureTotal(
  manifest: Json
): number | null {
  if (!isJsonRecord(manifest) || !isJsonRecord(manifest.totals)) {
    return null;
  }

  const amount = manifest.totals.expenditureTotalAmountThousandYen;
  return typeof amount === "number" &&
    Number.isSafeInteger(amount) &&
    amount >= 0
    ? amount
    : null;
}
