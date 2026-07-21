import type { BillSource, BillWithContent } from "../../../shared/types";

interface OfficialSourcesSectionProps {
  bill: BillWithContent;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  bill_pdf: "議案PDF",
  committee_agenda: "委員会資料",
  session_result: "定例会結果",
  vote_result: "賛否一覧",
  petition_result: "請願・陳情",
  question_summary: "質問",
  official_page: "公式ページ",
};

function normalizeSources(sources: unknown): BillSource[] {
  if (!Array.isArray(sources)) return [];
  return sources.filter(
    (source): source is BillSource =>
      typeof source === "object" &&
      source != null &&
      "title" in source &&
      typeof source.title === "string" &&
      "source_type" in source &&
      typeof source.source_type === "string"
  );
}

function formatDateLabel(source: BillSource): string | null {
  if (source.published_at) return `公開日: ${source.published_at}`;
  if (source.accessed_at) return `確認日: ${source.accessed_at}`;
  return null;
}

export function OfficialSourcesSection({ bill }: OfficialSourcesSectionProps) {
  const sources = normalizeSources(bill.sources);

  if (sources.length === 0) return null;

  return (
    <section className="my-8">
      <h2 className="mb-2 text-[22px] font-bold">補足資料</h2>
      <p className="mb-4 text-sm text-mirai-text-secondary">
        この案件を確認するときに参考になる公式資料・出典です。
      </p>
      <div className="bg-white rounded-lg border p-6">
        <ul className="flex flex-col gap-4">
          {sources.map((source, index) => {
            const dateLabel = formatDateLabel(source);
            const typeLabel =
              SOURCE_TYPE_LABELS[source.source_type] ?? source.source_type;
            return (
              <li
                key={`${source.title}-${index}`}
                className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
              >
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold underline underline-offset-4 hover:opacity-70"
                  >
                    {source.title}
                  </a>
                ) : (
                  <span className="text-sm font-bold">{source.title}</span>
                )}
                <div className="flex flex-wrap gap-2 text-xs font-medium text-mirai-text-secondary">
                  <span>{typeLabel}</span>
                  {dateLabel && <span>{dateLabel}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
