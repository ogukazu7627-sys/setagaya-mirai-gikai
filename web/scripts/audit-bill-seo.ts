import { createAdminClient } from "@mirai-gikai/supabase";
import { auditBillSeoRecords } from "../src/features/bills/shared/utils/bill-seo-audit";

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, name, bill_contents(title, summary, difficulty_level)")
    .eq("publish_status", "published")
    .order("name");

  if (error) {
    throw new Error(`公開案件の取得に失敗しました: ${error.message}`);
  }

  const records = (data ?? []).map((bill) => {
    const contents = Array.isArray(bill.bill_contents)
      ? bill.bill_contents
      : bill.bill_contents
        ? [bill.bill_contents]
        : [];
    const normalContent =
      contents.find((content) => content.difficulty_level === "normal") ?? null;

    return {
      id: bill.id,
      name: bill.name,
      bill_content: normalContent,
    };
  });
  const result = auditBillSeoRecords(records);

  console.log(
    `SEO監査: 公開案件 ${result.total}件 / 要確認 ${result.entriesWithIssues}件 / エラー ${result.errorCount}件 / 警告 ${result.warningCount}件`
  );

  for (const entry of result.entries) {
    if (entry.issues.length === 0) {
      continue;
    }

    console.log(`\n[${entry.id}] ${entry.name}`);
    console.log(`  title (${entry.titleLength}文字): ${entry.title}`);
    console.log(
      `  description (${entry.descriptionLength}文字): ${entry.description}`
    );
    for (const issue of entry.issues) {
      console.log(`  ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
    }
  }

  if (result.errorCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
