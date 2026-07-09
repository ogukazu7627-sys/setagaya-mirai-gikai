const FISCAL_YEAR_START_MONTH = 4;

export function getFiscalYearFromDate(dateLike: Date | string): number {
  const date =
    typeof dateLike === "string"
      ? new Date(`${dateLike}T00:00:00+09:00`)
      : dateLike;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return month >= FISCAL_YEAR_START_MONTH ? year : year - 1;
}

export function getFiscalYearRange(fiscalYear: number): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: `${fiscalYear}-04-01`,
    endDate: `${fiscalYear + 1}-03-31`,
  };
}

export function parseFiscalYear(
  value: string | string[] | undefined
): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return null;

  const year = Number(rawValue);
  if (!Number.isInteger(year)) return null;
  if (year < 1900 || year > 2100) return null;

  return year;
}
