export function getCalendarYearFromDate(dateLike: Date | string): number {
  return getYearFromDate(dateLike);
}

function getYearFromDate(dateLike: Date | string): number {
  if (typeof dateLike === "string") {
    const datePart = dateLike.match(/^(\d{4})/);
    if (datePart) {
      return Number(datePart[1]);
    }
  }

  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return date.getFullYear();
}

export function getCalendarYearRange(year: number): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

export function parseCalendarYear(
  value: string | string[] | undefined
): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return null;

  const year = Number(rawValue);
  if (!Number.isInteger(year)) return null;
  if (year < 1900 || year > 2100) return null;

  return year;
}
