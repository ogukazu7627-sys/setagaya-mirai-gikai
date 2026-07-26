const X_POST_DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

export function formatXPostDate(postedAt: string): string {
  const date = new Date(postedAt);
  return Number.isNaN(date.getTime())
    ? "投稿日時不明"
    : X_POST_DATE_FORMATTER.format(date);
}
