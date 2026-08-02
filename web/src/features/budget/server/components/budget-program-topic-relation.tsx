import "server-only";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/routes";
import type { BudgetProgramTopicRelation as BudgetProgramTopicRelationType } from "../../shared/types/budget";
import { getBudgetTopicKindLabel } from "../../shared/utils/budget-explorer-view";
import { describeBudgetProgramEvidenceFields } from "../../shared/utils/budget-program-evidence";

const relationTypeLabels: Record<
  BudgetProgramTopicRelationType["relationType"],
  string
> = {
  responds_to: "課題への対応",
  supports: "取組を支える",
  maintains: "機能や環境を維持する",
  enables: "実現を可能にする",
};

const evidenceLevelLabels: Record<
  BudgetProgramTopicRelationType["evidenceLevel"],
  string
> = {
  A_official_direct: "A：公式資料に直接の記載",
  B_strong_structural: "B：公式項目の構造から強い関連",
  C_editorial: "C：みらい議会の編集判断",
};

export function BudgetProgramTopicRelation({
  topic,
}: {
  topic: BudgetProgramTopicRelationType;
}) {
  const evidenceItems = describeBudgetProgramEvidenceFields(
    topic.evidenceFields
  );

  return (
    <article className="rounded-md border border-budget-overview-border bg-white px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="light">みらい議会の整理</Badge>
        <Badge variant="outline">
          {getBudgetTopicKindLabel(topic.topicKind)}
        </Badge>
        {topic.categories.map((category) => (
          <Badge key={category.slug} asChild variant="outline">
            <Link href={routes.budgetTopic(category.slug, topic.slug)}>
              {category.name}
            </Link>
          </Badge>
        ))}
      </div>
      <h3 className="mt-3 text-lg font-bold text-mirai-text">{topic.name}</h3>
      <p className="mt-2 text-sm leading-6 text-mirai-text-secondary">
        {`みらい議会では、この事業を「${topic.name}」に関連する予算事業として整理しています。`}
      </p>
      <dl className="mt-4 grid gap-x-6 gap-y-3 border-y border-budget-overview-border py-4 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="font-bold text-mirai-text-muted">関係の種類</dt>
        <dd className="text-mirai-text">
          {relationTypeLabels[topic.relationType]}
        </dd>
        <dt className="font-bold text-mirai-text-muted">説明</dt>
        <dd className="leading-6 text-mirai-text">{topic.explanation}</dd>
        <dt className="font-bold text-mirai-text-muted">根拠レベル</dt>
        <dd className="text-mirai-text">
          {evidenceLevelLabels[topic.evidenceLevel]}
        </dd>
      </dl>
      {evidenceItems.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-mirai-text-muted">
            根拠に使った公式項目
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-mirai-text-secondary">
            {evidenceItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {topic.evidenceSourceUrl && (
        <a
          href={topic.evidenceSourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary-strong underline-offset-4 hover:underline"
        >
          根拠資料を確認
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      )}
    </article>
  );
}
