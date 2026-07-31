import "server-only";

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Building2,
  CircleDollarSign,
  FileText,
  Landmark,
  Layers3,
  ListTree,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import type { BudgetProgramDetail } from "../../shared/types/budget";
import type { BudgetProgramReturnContext } from "../../shared/types/budget-exploration";
import {
  formatBudgetAmount,
  formatJapaneseFiscalYear,
  formatRawThousandYen,
} from "../../shared/utils/budget-page-view";
import { resolveBudgetProgramReturnDestination } from "../../shared/utils/budget-program-return-context";
import { describeBudgetSourceReference } from "../../shared/utils/budget-source-reference";
import {
  HierarchyItem,
  ProgramNameRow,
  SectionHeading,
} from "./budget-program-detail-primitives";
import { BudgetProgramTopicRelation } from "./budget-program-topic-relation";

type BudgetProgramDetailPageProps = {
  detail: BudgetProgramDetail;
  returnContext?: BudgetProgramReturnContext | null;
};

export function BudgetProgramDetailPage({
  detail,
  returnContext = null,
}: BudgetProgramDetailPageProps) {
  const { identity, budgetItem } = detail;
  const fiscalYearLabel = formatJapaneseFiscalYear(
    detail.activeDataset.fiscalYear
  );
  const returnDestination = resolveBudgetProgramReturnDestination(
    returnContext,
    detail.publishedTopics
  );

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
            <Link href={returnDestination.href}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              {returnDestination.label}
            </Link>
          </Button>

          <div className="mt-7">
            <Badge variant="outline">公式情報</Badge>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-mirai-text sm:text-4xl">
              {identity.displayProgramName}
            </h1>
          </div>

          <div className="mt-7 border-l-4 border-primary pl-4">
            <p className="text-sm font-bold text-mirai-text-secondary">
              {fiscalYearLabel}当初予算額
            </p>
            <p className="mt-1 tabular-nums text-3xl font-bold text-primary-strong">
              {formatBudgetAmount(identity.amountThousandYen)}
            </p>
            <p className="mt-1 tabular-nums text-xs text-mirai-text-muted">
              {formatRawThousandYen(identity.amountThousandYen)}
            </p>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="budget-program-topics-title"
        className="border-b border-budget-overview-border bg-budget-overview px-4 py-10 sm:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            icon={MessagesSquare}
            id="budget-program-topics-title"
            title="この事業が関係する課題"
            description="ここは公式予算分類ではなく、人が確認した情報をもとに、みらい議会が市民向けに整理した探索レイヤーです。"
            kind="editorial"
          />
          {detail.publishedTopics.length > 0 ? (
            <div className="mt-6 space-y-4">
              {detail.publishedTopics.map((topic) => (
                <BudgetProgramTopicRelation key={topic.id} topic={topic} />
              ))}
            </div>
          ) : (
            <p className="mt-5 border-y border-budget-overview-border py-4 text-sm text-mirai-text-secondary">
              この事業に公開済みの課題整理はまだありません。
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <section aria-labelledby="budget-official-hierarchy-title">
          <SectionHeading
            icon={ListTree}
            id="budget-official-hierarchy-title"
            title="公式の会計・款・項・目"
            description="予算書における、この事業の公式な分類です。"
            kind="official"
          />
          <dl className="mt-5 grid border-y border-mirai-border bg-white sm:grid-cols-2">
            <HierarchyItem label="会計" value={identity.accountName} />
            <HierarchyItem
              label="款"
              value={`${identity.kan.code} ${identity.kan.name}`}
            />
            <HierarchyItem
              label="項"
              value={`${identity.kou.code} ${identity.kou.name}`}
            />
            <HierarchyItem
              label="目"
              value={`${identity.moku.code} ${identity.moku.name}`}
            />
          </dl>
        </section>

        <section
          aria-labelledby="budget-program-department-title"
          className="mt-12"
        >
          <SectionHeading
            icon={Building2}
            id="budget-program-department-title"
            title="担当部署"
            description="公開用の部署表示名です。"
            kind="official"
          />
          <p className="mt-5 border-y border-mirai-border bg-white px-4 py-4 font-bold text-mirai-text">
            {identity.departmentDisplayName || "公開用の担当部署名は未整備です"}
          </p>
        </section>

        <section
          aria-labelledby="budget-program-members-title"
          className="mt-12"
        >
          <SectionHeading
            icon={Layers3}
            id="budget-program-members-title"
            title="内部の事業明細"
            description="公式CSVに記録された大事業・予算事業・内訳事業です。"
            kind="official"
          />
          <ul className="mt-5 divide-y divide-mirai-border border-y border-mirai-border bg-white">
            {detail.memberPrograms.map((program) => (
              <li key={program.programId} className="px-4 py-5">
                <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[8rem_1fr_auto]">
                  <ProgramNameRow
                    label="大事業"
                    value={program.majorProgramName}
                  />
                  <ProgramNameRow
                    label="予算事業"
                    value={program.budgetProgramName}
                  />
                  <ProgramNameRow
                    label="内訳事業"
                    value={program.detailProgramName}
                  />
                  <dt className="text-xs font-bold text-mirai-text-muted">
                    当初予算額
                  </dt>
                  <dd className="sm:col-span-2 sm:text-right">
                    <span className="tabular-nums font-bold text-mirai-text">
                      {formatBudgetAmount(program.amountThousandYen)}
                    </span>
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="budget-other-programs-title"
          className="mt-12"
        >
          <SectionHeading
            icon={BookOpen}
            id="budget-other-programs-title"
            title={`同じ「${budgetItem.moku.name}」に含まれる他事業`}
            description="公式予算分類上、同じ「目」に属する別の予算事業です。"
            kind="official"
          />
          {detail.otherPrograms.length > 0 ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {detail.otherPrograms.map((program) => (
                <li key={program.budgetProgramIdentityId}>
                  <Link
                    href={routes.budgetProgramDetail(
                      program.budgetProgramIdentityId,
                      returnContext ?? undefined
                    )}
                    className="flex h-full items-start justify-between gap-4 rounded-md border border-mirai-border bg-white px-4 py-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span>
                      <span className="block font-bold text-mirai-text">
                        {program.displayProgramName}
                      </span>
                      <span className="mt-1 block text-xs text-mirai-text-muted">
                        {program.departmentDisplayName ||
                          "公開用の担当部署名は未整備です"}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-xs text-mirai-text-secondary">
                      {formatBudgetAmount(program.amountThousandYen)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 border-y border-mirai-border bg-white px-4 py-4 text-sm text-mirai-text-secondary">
              同じ目に含まれる他の予算事業はありません。
            </p>
          )}
        </section>

        <section aria-labelledby="budget-item-sections-title" className="mt-12">
          <SectionHeading
            icon={CircleDollarSign}
            id="budget-item-sections-title"
            title="目全体の節別内訳"
            description="以下は、この事業が属する予算項目全体の節別内訳です。個別事業だけの内訳ではありません。"
            kind="official"
          />
          {detail.sections.length > 0 ? (
            <div className="mt-5 overflow-x-auto border-y border-mirai-border bg-white">
              <table className="w-full min-w-96 text-left text-sm">
                <thead className="border-b border-mirai-border bg-mirai-surface-gray text-mirai-text-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">
                      節
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-bold">
                      目全体の予算額
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
          ) : (
            <p className="mt-5 border-y border-mirai-border bg-white px-4 py-4 text-sm text-mirai-text-secondary">
              公開PDF由来の節別内訳はありません。
            </p>
          )}
        </section>

        <section
          aria-labelledby="budget-related-revenue-title"
          className="mt-12"
        >
          <SectionHeading
            icon={Landmark}
            id="budget-related-revenue-title"
            title="関連する歳入"
            description="予算書上で関係が記載された歳入です。事業ごとの配分額は公開資料から確認できません。"
            kind="official"
          />
          {detail.relatedRevenueDetails.length > 0 ? (
            <ul className="mt-5 divide-y divide-budget-overview-border border-y border-budget-overview-border bg-budget-overview">
              {detail.relatedRevenueDetails.map((revenue) => (
                <li key={revenue.allocationLinkId} className="px-4 py-4">
                  <p className="font-bold text-mirai-text">
                    {revenue.setsu.name}・{revenue.saisetsu.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-mirai-text-secondary">
                    {revenue.accountName} / {revenue.kan.name} &gt;{" "}
                    {revenue.kou.name} &gt; {revenue.moku.name}
                  </p>
                  <p className="mt-1 text-xs text-mirai-text-muted">
                    財源区分：{revenue.sourceFundingCategoryName}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 border-y border-mirai-border bg-white px-4 py-4 text-sm text-mirai-text-secondary">
              予算書上で、この事業との関係が確認された歳入はありません。
            </p>
          )}
        </section>

        <section aria-labelledby="budget-sources-title" className="mt-12">
          <SectionHeading
            icon={FileText}
            id="budget-sources-title"
            title="出典"
            description={`${fiscalYearLabel}当初予算の公式CSV・公式PDFをもとにしています。`}
            kind="official"
          />
          {detail.sourceReferences.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-mirai-text-secondary">
              {detail.sourceReferences.map((source, index) => (
                <li key={`${describeBudgetSourceReference(source)}-${index}`}>
                  {describeBudgetSourceReference(source)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-mirai-text-secondary">
              出典参照情報はありません。
            </p>
          )}
        </section>

        <section
          aria-labelledby="budget-cautions-title"
          className="mt-12 border-y border-mirai-border bg-white px-4 py-6"
        >
          <SectionHeading
            icon={AlertCircle}
            id="budget-cautions-title"
            title="注意事項"
            description="このページの金額と関係情報を読む際の前提です。"
          />
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-mirai-text-secondary">
            <li>
              {fiscalYearLabel}当初予算であり、実際の支出額ではありません。
            </li>
            <li>決算額や契約額を示すものではありません。</li>
            <li>支払先や事業者を示すものではありません。</li>
            <li>
              関連歳入は関係の記載であり、この事業への配分額を示すものではありません。
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
