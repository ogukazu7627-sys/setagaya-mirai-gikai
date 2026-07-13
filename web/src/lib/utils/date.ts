export function formatDate(dateString: string): string {
  const dateParts = getDateParts(dateString);
  if (dateParts) {
    return `${dateParts.year}年${dateParts.month}月${dateParts.day}日`;
  }

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * 日付をドット区切り形式でフォーマット (例: 2025.10.1)
 * ゼロ埋めなし
 */
export function formatDateWithDots(dateString: string): string {
  const dateParts = getDateParts(dateString);
  if (dateParts) {
    return `${dateParts.year}.${dateParts.month}.${dateParts.day}`;
  }

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}.${month}.${day}`;
}

/**
 * 日本時間の現在時刻を返す
 */
export function getJapanTime(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
}

function getDateParts(dateString: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (!match) return null;

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}
