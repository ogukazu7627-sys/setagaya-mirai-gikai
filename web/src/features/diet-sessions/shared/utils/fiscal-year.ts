const FISCAL_YEAR_START_MONTH = 4;

export function getFiscalYearFromDate(dateLike: Date | string): number {
  const { year, month } = getYearAndMonth(dateLike);

  return month >= FISCAL_YEAR_START_MONTH ? year : year - 1;
}

function getYearAndMonth(dateLike: Date | string): {
  year: number;
  month: number;
} {
  if (typeof dateLike === "string") {
    const datePart = dateLike.match(/^(\d{4})-(\d{2})/);
    if (datePart) {
      return {
        year: Number(datePart[1]),
        month: Number(datePart[2]),
      };
    }
  }

  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
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
