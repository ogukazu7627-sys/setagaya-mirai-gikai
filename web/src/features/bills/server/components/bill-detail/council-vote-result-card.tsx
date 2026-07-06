import { BillItemTypeBadge } from "../../../client/components/bill-list/bill-item-type-badge";
import { BillStatusBadge } from "../../../client/components/bill-list/bill-status-badge";
import type { BillWithContent } from "../../../shared/types";

interface CouncilVoteResultCardProps {
  bill: BillWithContent;
}

function formatReiwaDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 2019) return `${year}年${Number(match[2])}月${Number(match[3])}日`;
  return `令和${year - 2018}年${Number(match[2])}月${Number(match[3])}日`;
}

function extractCommittee(statusNote: string | null | undefined): string | null {
  if (!statusNote) return null;
  return statusNote.match(/（(.+?)）/)?.[1] ?? statusNote.match(/(文教常任委員会)/)?.[1] ?? null;
}

function extractVote(statusNote: string | null | undefined): string | null {
  if (!statusNote) return null;
  if (statusNote.includes("全員賛成")) return "全員賛成";
  const match = statusNote.match(/(賛成多数|賛成少数|全会一致)/);
  return match?.[1] ?? null;
}

function getResultRows(bill: BillWithContent): Array<[string, string]> {
  const statusLabel = bill.status_label ?? "確認中";
  const committee = extractCommittee(bill.status_note);
  const decisionDate = formatReiwaDate(bill.status_note);

  switch (bill.item_type) {
    case "report":
      return [
        ["扱い", "採決対象ではありません"],
        ["状況", "委員会で報告済み"],
        ...(committee ? [["報告先", committee] as [string, string]] : []),
      ];
    case "petition":
      return [
        ["結果", statusLabel.includes("付託") ? "継続審議" : statusLabel],
        ...(committee ? [["付託委員会", committee] as [string, string]] : []),
      ];
    case "question":
      return [
        ["扱い", "採決対象ではありません"],
        ["状況", bill.status_label ?? "本会議で質問・答弁済み"],
      ];
    case "bill":
    default:
      return [
        ["結果", statusLabel],
        ["賛否", extractVote(bill.status_note) ?? "確認中"],
        ...(committee ? [["担当委員会", committee] as [string, string]] : []),
        ...(decisionDate ? [["議決日", decisionDate] as [string, string]] : []),
      ];
  }
}

export function CouncilVoteResultCard({ bill }: CouncilVoteResultCardProps) {
  const rows = getResultRows(bill);

  return (
    <>
      <h2 className="text-[22px] font-bold mb-4">議会での結果</h2>
      <div className="relative p-1 rounded-2xl bg-mirai-gradient">
        <div className="bg-white rounded-lg px-6 py-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <BillItemTypeBadge itemType={bill.item_type} />
              <BillStatusBadge
                status={bill.status}
                statusLabel={bill.status_label}
              />
            </div>
            <dl className="grid gap-3 text-sm">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[96px_1fr] gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
                >
                  <dt className="font-bold text-mirai-text-secondary">
                    {label}
                  </dt>
                  <dd className="font-medium text-mirai-text">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
