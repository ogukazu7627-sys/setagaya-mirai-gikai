export type DailyPushPayload = {
  title: "今日のあなたへのおすすめ";
  body: string;
  date: string;
};

export function buildDailyPushPayload(
  firstBillTitle: string,
  recommendationCount: number,
  date: string
): DailyPushPayload {
  const normalizedTitle = firstBillTitle.trim();
  if (!normalizedTitle || recommendationCount < 1) {
    throw new Error("A recommendation title and count are required");
  }

  return {
    title: "今日のあなたへのおすすめ",
    body:
      recommendationCount === 1
        ? normalizedTitle
        : `「${normalizedTitle}」ほか${recommendationCount - 1}件`,
    date,
  };
}
