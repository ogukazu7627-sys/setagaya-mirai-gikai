export type DigestReportItem = {
  reportId: string;
  billTitle: string;
  billUrl: string;
  summary: string | null;
  stanceLabel: string;
  opinions: Array<{ title: string; content: string }>;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string;
};

export function buildCouncilorDigestSubject(params: {
  councilorName: string;
  itemCount: number;
}) {
  return `【みらい議会】${params.councilorName}議員宛の区民意見レポート（${params.itemCount}件）`;
}

export function buildCouncilorDigestBody(params: {
  councilorName: string;
  items: DigestReportItem[];
}) {
  const lines = [
    `${params.councilorName}議員`,
    "",
    "みらい議会＠世田谷区に寄せられたAIインタビュー結果のうち、",
    `${params.councilorName}議員に伝えたいとユーザーが選択した意見をまとめてお送りします。`,
    "",
    `対象件数: ${params.items.length}件`,
    "",
  ];

  for (const [index, item] of params.items.entries()) {
    lines.push(
      `---- ${index + 1}. ${item.billTitle} ----`,
      `案件URL: ${item.billUrl}`,
      `立場: ${item.stanceLabel}`,
      `作成日時: ${formatDateTime(item.createdAt)}`,
      ""
    );

    if (item.contactName && item.contactEmail) {
      lines.push(
        `連絡先共有同意あり: ${item.contactName} <${item.contactEmail}>`,
        ""
      );
    }

    if (item.summary) {
      lines.push("要約:", item.summary, "");
    }

    if (item.opinions.length > 0) {
      lines.push("主な意見:");
      for (const opinion of item.opinions) {
        lines.push(`- ${opinion.title}: ${opinion.content}`);
      }
      lines.push("");
    }
  }

  lines.push(
    "※本メールは、ユーザーが議員への共有先として選択した内容を、運営者が確認したうえで送信しています。"
  );

  return lines.join("\n");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
