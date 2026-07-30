import "server-only";

import type { Json } from "@mirai-gikai/supabase";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CircleDollarSign,
  FileText,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import type { BudgetProgramDetail } from "../../shared/types/budget";
import {
  formatBudgetAmount,
  formatRawThousandYen,
} from "../../shared/utils/budget-page-view";

export function BudgetProgramDetailPage({
  detail,
}: {
  detail: BudgetProgramDetail;
}) {
  const { identity, budgetItem } = detail;

  return (
    <main className="min-h-dvh bg-mirai-surface">
      <header className="budget-detail-enter border-b border-mirai-border bg-white px-4 py-8 sm:px-8 sm:py-11">
        <div className="mx-auto max-w-5xl">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 rounded-md text-primary-strong"
          >
            <Link href={routes.budget()}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              触れる予算へ戻る
            </Link>
          </Button>
          <p className="mt-7 text-sm font-bold text-budget-overview-accent">
            {identity.accountName}・{identity.kan.name}
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-mirai-text sm:text-4xl">
            {identity.displayProgramName}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <p className="tabular-nums text-2xl font-bold text-primary-strong">
              {formatBudgetAmount(identity.amountThousandYen)}
            </p>
            <p className="flex items-center gap-2 text-sm text-mirai-text-secondary">
              <Building2 aria-hidden="true" className="size-4" />
              {identity.departmentDisplayName || "担当部署表示なし"}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="outline">{identity.kan.name}</Badge>
            <Badge variant="outline">{identity.kou.name}</Badge>
            <Badge variant="outline">{identity.moku.name}</Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <section aria-labelledby="budget-program-members-title">
          <SectionHeading
            icon={FileText}
            id="budget-program-members-title"
            title="事業の内訳"
            description="公式CSVに記録された内訳事業です。"
          />
          <ul className="mt-5 divide-y divide-mirai-border border-y border-mirai-border bg-white">
            {detail.memberPrograms.map((program) => (
              <li
                key={program.programId}
                className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-bold text-mirai-text">
                    {program.detailProgramName ||
                      program.budgetProgramName ||
                      program.majorProgramName}
                  </p>
                  <p className="mt-1 text-xs text-mirai-text-muted">
                    {program.departmentDisplayName ||
                      identity.departmentDisplayName ||
                      "担当部署表示なし"}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums text-sm font-bold text-mirai-text">
                  {formatBudgetAmount(program.amountThousandYen)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="budget-item-sections-title" className="mt-12">
          <SectionHeading
            icon={CircleDollarSign}
            id="budget-item-sections-title"
            title={`${budgetItem.moku.name}全体の費目内訳`}
            description="節はこの事業単独ではなく、同じ「目」全体の内訳です。個別事業への配分は示していません。"
          />
          <div className="mt-5 overflow-x-auto border-y border-mirai-border bg-white">
            <table className="w-full min-w-96 text-left text-sm">
              <thead className="border-b border-mirai-border bg-mirai-surface-gray text-mirai-text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">
                    節
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">
                    予算額
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mirai-border">
                {detail.sections.map((section) => (
                  <tr key={section.sectionId}>
                    <td className="px-4 py-3 text-mirai-text">
                      {section.setsuCode} {section.setsuName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-mirai-text">
                      {formatRawThousandYen(section.amountThousandYen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {detail.relatedRevenueDetails.length > 0 && (
          <section
            aria-labelledby="budget-related-revenue-title"
            className="mt-12"
          >
            <SectionHeading
              icon={Landmark}
              id="budget-related-revenue-title"
              title="関連の記載がある歳入"
              description="公式資料に関係が記載されていますが、この事業への配分額は示されていません。歳入額を事業の金額として扱うことはできません。"
            />
            <ul className="mt-5 divide-y divide-budget-overview-border border-y border-budget-overview-border bg-budget-overview">
              {detail.relatedRevenueDetails.map((revenue) => (
                <li key={revenue.allocationLinkId} className="px-4 py-4">
                  <p className="font-bold text-mirai-text">
                    {revenue.setsu.name}・{revenue.saisetsu.name}
                  </p>
                  <p className="mt-1 text-xs text-mirai-text-secondary">
                    {revenue.accountName} / {revenue.sourceFundingCategoryName}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {detail.otherPrograms.length > 0 && (
          <section
            aria-labelledby="budget-other-programs-title"
            className="mt-12"
          >
            <SectionHeading
              icon={BookOpen}
              id="budget-other-programs-title"
              title={`同じ「${budgetItem.moku.name}」にある事業`}
              description="公式予算分類上、同じ目に属する別の事業です。"
            />
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {detail.otherPrograms.map((program) => (
                <li key={program.budgetProgramIdentityId}>
                  <Link
                    href={routes.budgetProgramDetail(
                      program.budgetProgramIdentityId
                    )}
                    className="flex h-full items-start justify-between gap-4 rounded-md border border-mirai-border bg-white px-4 py-4 transition-colors hover:border-primary"
                  >
                    <span className="font-bold text-mirai-text">
                      {program.displayProgramName}
                    </span>
                    <span className="shrink-0 tabular-nums text-xs text-mirai-text-secondary">
                      {formatBudgetAmount(program.amountThousandYen)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="budget-sources-title" className="mt-12">
          <SectionHeading
            icon={FileText}
            id="budget-sources-title"
            title="出典"
            description="令和8年度当初予算の公式CSV・公式PDFをもとにしています。"
          />
          <ul className="mt-4 space-y-2 text-sm text-mirai-text-secondary">
            {detail.sourceReferences.map((source, index) => (
              <li key={`${describeSourceReference(source)}-${index}`}>
                {describeSourceReference(source)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({
  icon: Icon,
  id,
  title,
  description,
}: {
  icon: typeof FileText;
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Icon
          aria-hidden="true"
          className="size-5 text-budget-overview-accent"
        />
        <h2 id={id} className="text-xl font-bold text-mirai-text">
          {title}
        </h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-mirai-text-secondary">
        {description}
      </p>
    </div>
  );
}

function describeSourceReference(source: Json): string {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return "出典情報あり";
  }
  const sourceType = readSourceValue(source, "sourceType", "source_type");
  const sourceFile = readSourceValue(source, "sourceFile", "source_file");
  const sourceRowNumber = readSourceValue(
    source,
    "sourceRowNumber",
    "source_row_number"
  );
  const pdfPage = readSourceValue(source, "pdfPage", "pdf_page");
  const budgetBookPage = readSourceValue(
    source,
    "budgetBookPage",
    "budget_book_page"
  );
  const parts = [
    sourceType === "official_csv"
      ? "公式CSV"
      : sourceType === "official_pdf"
        ? "公式PDF"
        : "派生データ",
    sourceFile,
    sourceRowNumber ? `元CSV ${sourceRowNumber}行` : "",
    pdfPage ? `PDF ${pdfPage}ページ` : "",
    budgetBookPage ? `冊子 ${budgetBookPage}ページ` : "",
  ].filter(Boolean);
  return parts.join(" / ");
}

function readSourceValue(
  source: { [key: string]: Json | undefined },
  camelKey: string,
  snakeKey: string
): string {
  const value = source[camelKey] ?? source[snakeKey];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}
