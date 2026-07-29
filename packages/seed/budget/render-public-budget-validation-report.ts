import type {
  PublicBudgetValidationIssue,
  PublicBudgetValidationResult,
} from "./validate-public-budget-files";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function escapeTableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderIssues(issues: PublicBudgetValidationIssue[]): string[] {
  if (issues.length === 0) {
    return ["検証エラーはありません。"];
  }

  return [
    "| error code | message | expected | actual |",
    "| --- | --- | ---: | ---: |",
    ...issues.map(
      (issue) =>
        `| ${escapeTableCell(issue.code)} | ${escapeTableCell(
          issue.message
        )} | ${issue.expected ?? ""} | ${issue.actual ?? ""} |`
    ),
  ];
}

export function renderPublicBudgetValidationReport(
  result: PublicBudgetValidationResult
): string {
  const lines = [
    "# 触れる予算 公開データセット検証レポート",
    "",
    `- 最終判定: **${result.status}**`,
    "- 検証コマンド: `pnpm budget:web:validate -- --input-dir <path>`",
    "- 入力方針: 公開用7ファイルはリポジトリ外、またはgitignore対象で管理",
    "- Supabase書き込み: なし",
    "- Next.js `public/`・Webバンドルへの配置: なし",
    "",
  ];

  const summary = result.summary;
  if (summary) {
    lines.push(
      "## Manifest",
      "",
      `- ファイル: \`${summary.manifestFileName}\``,
      `- schemaVersion: \`${summary.schemaVersion}\``,
      `- fiscalYear: \`${summary.fiscalYear}\``,
      `- datasetKind: \`${summary.datasetKind}\``,
      `- budgetType: \`${summary.budgetType}\``,
      `- currencyUnit: \`${summary.currencyUnit}\``,
      "",
      "## ファイル検証",
      "",
      "| logical file | resolved file | count | columns | SHA-256 | result |",
      "| --- | --- | ---: | ---: | --- | --- |",
      ...summary.files.map((file) => {
        const hashMatches = file.expectedSha256 === file.actualSha256;
        const countMatches = file.expectedCount === file.actualCount;
        const columnMatches =
          file.expectedColumnCount === undefined ||
          file.expectedColumnCount === file.actualColumnCount;
        return `| \`${file.logicalFileName}\` | \`${
          file.actualFileName
        }\` | ${formatNumber(file.actualCount)} | ${
          file.actualColumnCount ?? "-"
        } | \`${file.actualSha256}\` | ${
          hashMatches && countMatches && columnMatches ? "PASS" : "FAIL"
        } |`;
      }),
      "",
      "## 件数",
      "",
      "| dataset | count |",
      "| --- | ---: |",
      `| program identities | ${formatNumber(
        summary.counts.programIdentities
      )} |`,
      `| programs | ${formatNumber(summary.counts.programs)} |`,
      `| budget items | ${formatNumber(summary.counts.budgetItems)} |`,
      `| revenue details | ${formatNumber(summary.counts.revenueDetails)} |`,
      `| revenue items | ${formatNumber(summary.counts.revenueItems)} |`,
      `| revenue allocations | ${formatNumber(
        summary.counts.revenueAllocations
      )} |`,
      "",
      "## 金額",
      "",
      "単位は千円。",
      "",
      "| source | amount |",
      "| --- | ---: |",
      `| program identities | ${formatNumber(
        summary.totals.programIdentityExpenditure
      )} |`,
      `| programs | ${formatNumber(summary.totals.programExpenditure)} |`,
      `| budget items | ${formatNumber(
        summary.totals.budgetItemExpenditure
      )} |`,
      `| revenue details | ${formatNumber(summary.totals.revenueDetail)} |`,
      `| revenue items | ${formatNumber(summary.totals.revenueItem)} |`,
      "",
      "### 会計別",
      "",
      "| account_code | expenditure | revenue |",
      "| --- | ---: | ---: |",
      ...Object.entries(summary.accountTotals).map(
        ([accountCode, totals]) =>
          `| \`${accountCode}\` | ${formatNumber(
            totals.expenditure
          )} | ${formatNumber(totals.revenue)} |`
      ),
      "",
      "## 参照・allocation",
      "",
      "| check | count |",
      "| --- | ---: |",
      `| programs → identity 参照欠落 | ${formatNumber(
        summary.relations.missingProgramIdentityReferences
      )} |`,
      `| budget items内 program_id 参照欠落 | ${formatNumber(
        summary.relations.missingBudgetItemProgramReferences
      )} |`,
      `| allocation → revenue detail 参照欠落 | ${formatNumber(
        summary.relations.missingAllocationRevenueDetailReferences
      )} |`,
      `| allocation → program identity 参照欠落 | ${formatNumber(
        summary.relations.missingAllocationProgramIdentityReferences
      )} |`,
      `| exact_group | ${formatNumber(
        summary.relations.exactGroupAllocations
      )} |`,
      `| public_identity | ${formatNumber(
        summary.relations.publicIdentityAllocations
      )} |`,
      `| allocationAmountThousandYen 非null | ${formatNumber(
        summary.relations.allocationAmountNonNull
      )} |`,
      `| 不正なamountAttributionStatus | ${formatNumber(
        summary.relations.invalidAmountAttributionStatuses
      )} |`,
      ""
    );
  }

  lines.push("## 検証エラー", "", ...renderIssues(result.issues), "");
  return lines.join("\n");
}
