import { createAdminClient } from "@mirai-gikai/supabase";
import { syncBillSeoProfileSafely } from "../src/features/bill-seo/server/services/generate-bill-seo";

type ScriptOptions = {
  all: boolean;
  billId: string | null;
  dryRun: boolean;
  force: boolean;
  limit: number | null;
};

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (!options.all && !options.billId) {
    throw new Error("--all または --bill-id <UUID> を指定してください。");
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("bills")
    .select("id, name, publish_status")
    .eq("publication_category", "report")
    .order("updated_at", { ascending: true });
  if (options.billId) query = query.eq("id", options.billId);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) {
    throw new Error(`SEO生成対象の取得に失敗しました: ${error.message}`);
  }

  const bills = data ?? [];
  console.log(
    `案件別SEO生成: 対象 ${bills.length}件${options.dryRun ? "（確認のみ）" : ""}`
  );
  let ready = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, bill] of bills.entries()) {
    const label = `[${index + 1}/${bills.length}] ${bill.id} ${bill.name}`;
    if (options.dryRun) {
      console.log(`${label} (${bill.publish_status})`);
      continue;
    }

    const result = await syncBillSeoProfileSafely(bill.id, {
      force: options.force,
    });
    if (result.status === "ready") ready += 1;
    if (result.status === "skipped") skipped += 1;
    if (result.status === "failed") failed += 1;
    console.log(
      `${label}: ${result.status}${result.warning ? ` - ${result.warning}` : ""}`
    );

    if (result.warning?.includes("日次コスト上限")) {
      console.log("日次コスト上限に達したため、残りは次回実行へ繰り越します。");
      break;
    }
  }

  console.log(`完了: 生成 ${ready}件 / 変更なし ${skipped}件 / 失敗 ${failed}件`);
  if (failed > 0) process.exitCode = 1;
}

function parseOptions(args: string[]): ScriptOptions {
  const billIdIndex = args.indexOf("--bill-id");
  const limitIndex = args.indexOf("--limit");
  const limitValue = limitIndex >= 0 ? Number(args[limitIndex + 1]) : null;
  if (
    limitValue !== null &&
    (!Number.isInteger(limitValue) || limitValue <= 0)
  ) {
    throw new Error("--limit は1以上の整数で指定してください。");
  }

  return {
    all: args.includes("--all"),
    billId: billIdIndex >= 0 ? (args[billIdIndex + 1] ?? null) : null,
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    limit: limitValue,
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
