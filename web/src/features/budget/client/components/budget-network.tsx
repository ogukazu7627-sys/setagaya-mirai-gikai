"use client";

import { ArrowLeft, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type {
  BudgetExplorationCategory,
  BudgetExplorationData,
  BudgetExplorationProgram,
  BudgetExplorerView,
} from "../../shared/types/budget-exploration";
import type {
  BudgetNetworkPosition,
  BudgetNetworkTopicTone,
} from "../../shared/types/budget-page";
import { getBudgetNetworkLayout } from "../../shared/utils/budget-network-layout";
import {
  formatBudgetAmount,
  shortenBudgetDepartmentName,
} from "../../shared/utils/budget-page-view";
import {
  getBudgetCategoryCenterY,
  getBudgetCategoryStageHeightRem,
  getBudgetCategoryTopicPositions,
  getBudgetTopicProgramPositions,
  getBudgetTopicStageClassName,
  getBudgetTopicStageHeightRem,
} from "../../shared/utils/budget-topic-network-layout";

type BudgetNetworkProps = {
  exploration: BudgetExplorationData;
  view: BudgetExplorerView;
  onBack: () => void;
  onFocusSearch: () => void;
  onSelectCategory: (slug: string) => void;
  onSelectTopic: (categorySlug: string, topicSlug: string) => void;
  onSelectProgram: (budgetProgramIdentityId: string) => void;
};

type NetworkEdge = {
  id: string;
  source: BudgetNetworkPosition;
  target: BudgetNetworkPosition;
};

const topicToneClasses: Record<BudgetNetworkTopicTone, string> = {
  cyan: "border-budget-node-cyan bg-budget-node-cyan",
  mint: "border-budget-node-mint bg-budget-node-mint",
  gold: "border-budget-node-gold bg-budget-node-gold",
};

export function BudgetNetwork({
  exploration,
  view,
  onBack,
  onFocusSearch,
  onSelectCategory,
  onSelectProgram,
  onSelectTopic,
}: BudgetNetworkProps) {
  const mode = useBudgetNetworkMode();
  const stableView = view.kind === "transitioning" ? view.current : view;
  const programCount =
    stableView.kind === "topic" ? stableView.topic.programs.length : 0;
  const stageClassName =
    stableView.kind === "topic"
      ? getBudgetTopicStageClassName(programCount, mode)
      : stableView.kind === "category"
        ? "budget-network-stage-category"
        : "budget-network-stage";
  const stageStyle =
    mode === "mobile" && stableView.kind === "topic"
      ? { height: `${getBudgetTopicStageHeightRem(programCount, mode)}rem` }
      : mode === "mobile" && stableView.kind === "category"
        ? {
            height: `${getBudgetCategoryStageHeightRem(
              stableView.category.topics.length,
              mode
            )}rem`,
          }
        : undefined;

  return (
    <div
      className={cn(
        "relative",
        stageClassName,
        view.kind === "transitioning" && "budget-network-transitioning"
      )}
      data-explorer-state={view.kind}
      style={stageStyle}
    >
      {stableView.kind !== "overview" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={view.kind === "transitioning"}
          className="absolute left-4 top-48 z-30 rounded-md border border-budget-space-line bg-budget-space-deep/70 text-white backdrop-blur-sm hover:bg-budget-space-mid hover:text-white sm:left-9 sm:top-36"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          戻る
        </Button>
      )}

      {stableView.kind === "overview" && (
        <OverviewNetwork
          mode={mode}
          onSelectCategory={onSelectCategory}
          transitionTarget={view.kind === "transitioning" ? view.target : null}
        />
      )}
      {stableView.kind === "category" && (
        <CategoryNetwork
          category={stableView.category}
          dataUnavailable={
            exploration.availability === "temporarily_unavailable"
          }
          mode={mode}
          onFocusSearch={onFocusSearch}
          onSelectCategory={onSelectCategory}
          onSelectTopic={onSelectTopic}
          transitionTarget={view.kind === "transitioning" ? view.target : null}
        />
      )}
      {stableView.kind === "topic" && (
        <TopicNetwork
          category={stableView.category}
          exploration={exploration}
          mode={mode}
          onSelectProgram={onSelectProgram}
          programs={stableView.topic.programs}
          topicName={stableView.topic.name}
          transitionTarget={view.kind === "transitioning" ? view.target : null}
        />
      )}
    </div>
  );
}

function OverviewNetwork({
  mode,
  onSelectCategory,
  transitionTarget,
}: {
  mode: "mobile" | "desktop";
  onSelectCategory: (slug: string) => void;
  transitionTarget:
    | Exclude<BudgetExplorerView, { kind: "transitioning" }>
    | Extract<BudgetExplorerView, { kind: "transitioning" }>["target"]
    | null;
}) {
  const { topics, decorations, edges } = getBudgetNetworkLayout(mode);
  const selectedSlug =
    transitionTarget?.kind === "category"
      ? transitionTarget.category.slug
      : null;

  return (
    <div
      role="group"
      className="absolute inset-0"
      aria-label="予算を10の分野から探すネットワーク"
    >
      <NetworkChart
        decorations={decorations}
        edges={edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        }))}
      />
      <div className="absolute inset-0">
        {topics.map((topic) => (
          <Button
            key={topic.id}
            type="button"
            variant="ghost"
            onClick={() => onSelectCategory(topic.id)}
            style={{ left: `${topic.x}%`, top: `${topic.y}%` }}
            className={cn(
              "budget-network-topic absolute h-16 w-24 -translate-x-1/2 -translate-y-1/2 flex-col gap-1 p-0 text-white hover:bg-transparent hover:text-white focus-visible:ring-budget-node-cyan focus-visible:ring-offset-budget-space-deep sm:w-28",
              selectedSlug === topic.id && "budget-network-node-selected"
            )}
            aria-label={`${topic.label}から予算を探す`}
          >
            <span
              aria-hidden="true"
              className={cn(
                "budget-network-topic-core block size-8 rounded-full border-4 shadow-lg",
                topicToneClasses[topic.tone]
              )}
            />
            <span className="budget-network-topic-label text-xs font-bold sm:text-sm">
              {topic.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function CategoryNetwork({
  category,
  dataUnavailable,
  mode,
  onFocusSearch,
  onSelectCategory,
  onSelectTopic,
  transitionTarget,
}: {
  category: BudgetExplorationCategory;
  dataUnavailable: boolean;
  mode: "mobile" | "desktop";
  onFocusSearch: () => void;
  onSelectCategory: (slug: string) => void;
  onSelectTopic: (categorySlug: string, topicSlug: string) => void;
  transitionTarget:
    | Extract<BudgetExplorerView, { kind: "transitioning" }>["target"]
    | null;
}) {
  const overviewLayout = getBudgetNetworkLayout(mode);
  const topicPositions = getBudgetCategoryTopicPositions(
    category.topics.length,
    mode
  );
  const center = {
    x: 50,
    y: getBudgetCategoryCenterY(category.topics.length, mode),
  };
  const topicEdges = topicPositions.map((position) => ({
    id: `category-topic-${position.index}`,
    source: center,
    target: position,
  }));
  const selectedTopicSlug =
    transitionTarget?.kind === "topic" ? transitionTarget.topic.slug : null;

  return (
    <div
      role="group"
      className="absolute inset-0"
      aria-label={`${category.name}に公開された課題`}
    >
      <NetworkChart
        decorations={overviewLayout.decorations.map((decoration) => ({
          ...decoration,
          size: Math.max(8, decoration.size / 2),
        }))}
        edges={topicEdges}
      />
      {overviewLayout.topics
        .filter((topic) => topic.id !== category.slug)
        .map((topic) => (
          <Button
            key={topic.id}
            type="button"
            variant="ghost"
            onClick={() => onSelectCategory(topic.id)}
            style={{ left: `${topic.x}%`, top: `${topic.y}%` }}
            className="absolute h-10 w-20 -translate-x-1/2 -translate-y-1/2 p-0 text-xs font-bold text-budget-space-copy/45 hover:bg-transparent hover:text-white sm:w-24"
            aria-label={`${topic.label}へ切り替える`}
          >
            {topic.label}
          </Button>
        ))}

      <div
        style={{ left: `${center.x}%`, top: `${center.y}%` }}
        className="budget-network-focus-node absolute z-10 flex size-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-budget-node-cyan bg-budget-space-deep/85 px-3 text-center text-base font-bold text-white shadow-xl sm:size-32 sm:text-lg"
      >
        {category.name}
      </div>

      {category.topics.map((topic, index) => {
        const position = topicPositions[index];
        if (!position) {
          return null;
        }
        return (
          <Button
            key={topic.id}
            type="button"
            variant="ghost"
            onClick={() => onSelectTopic(category.slug, topic.slug)}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            className={cn(
              "budget-network-topic-card absolute z-20 h-20 w-[min(11rem,42vw)] -translate-x-1/2 -translate-y-1/2 whitespace-normal rounded-md border border-budget-space-line bg-white/95 px-4 py-3 text-center text-sm font-bold leading-5 text-mirai-text shadow-lg hover:bg-white hover:text-primary-strong lg:w-52",
              selectedTopicSlug === topic.slug && "budget-network-node-selected"
            )}
            aria-label={`${topic.name}に関連する予算事業を見る`}
          >
            {topic.name}
          </Button>
        );
      })}

      {category.topics.length === 0 && (
        <div className="absolute left-1/2 top-[70%] z-20 w-[min(90%,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-budget-space-line bg-budget-space-deep/85 px-5 py-4 text-center text-budget-space-copy backdrop-blur-sm">
          <p className="font-bold text-white">
            {dataUnavailable
              ? "課題データを現在取得できません"
              : "この分野は、まだ課題整理中です"}
          </p>
          <p className="mt-1 text-sm leading-6">
            {dataUnavailable
              ? "検索または公式予算分類から、公開中の予算データを確認できます。"
              : "架空の課題で埋めず、確認できたものから公開します。"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFocusSearch}
            className="mt-3 rounded-md border-budget-space-line"
          >
            <Search aria-hidden="true" className="size-4" />
            予算を検索
          </Button>
        </div>
      )}

      <Button
        asChild
        variant="outline"
        size="sm"
        className="absolute bottom-5 right-4 z-30 rounded-md border-budget-space-line bg-white/95 text-mirai-text sm:right-9"
      >
        <Link href={routes.budgetOfficialHierarchy()}>
          <BookOpen aria-hidden="true" className="size-4" />
          公式予算分類からすべて見る
        </Link>
      </Button>
    </div>
  );
}

function TopicNetwork({
  category,
  exploration,
  mode,
  onSelectProgram,
  programs,
  topicName,
  transitionTarget,
}: {
  category: BudgetExplorationCategory;
  exploration: BudgetExplorationData;
  mode: "mobile" | "desktop";
  onSelectProgram: (budgetProgramIdentityId: string) => void;
  programs: BudgetExplorationProgram[];
  topicName: string;
  transitionTarget:
    | Extract<BudgetExplorerView, { kind: "transitioning" }>["target"]
    | null;
}) {
  const positions = getBudgetTopicProgramPositions(programs.length, mode);
  const center = { x: 50, y: mode === "mobile" ? 20 : 58 };
  const categoryNameBySlug = new Map(
    exploration.categories.map((candidate) => [candidate.slug, candidate.name])
  );
  const selectedProgramId =
    transitionTarget?.kind === "program"
      ? transitionTarget.budgetProgramIdentityId
      : null;

  return (
    <div
      role="group"
      className="absolute inset-0"
      aria-label={`${topicName}に関連する予算事業`}
    >
      <NetworkChart
        edges={positions.map((position) => ({
          id: `topic-program-${position.index}`,
          source: center,
          target: position,
        }))}
      />
      <div
        style={{ left: `${center.x}%`, top: `${center.y}%` }}
        className="budget-network-focus-node absolute z-10 flex min-h-24 w-60 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 border-budget-node-mint bg-budget-space-deep/90 px-5 py-4 text-center text-base font-bold leading-6 text-white shadow-xl sm:w-72 sm:text-lg"
      >
        {topicName}
      </div>

      {programs.map((program, index) => {
        const position = positions[index];
        if (!position) {
          return null;
        }
        const otherCategoryNames = program.categorySlugs
          .filter((slug) => slug !== category.slug)
          .map((slug) => categoryNameBySlug.get(slug))
          .filter((name): name is string => name !== undefined);
        return (
          <Button
            key={program.budgetProgramIdentityId}
            type="button"
            variant="ghost"
            onClick={() => onSelectProgram(program.budgetProgramIdentityId)}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            className={cn(
              "budget-program-node absolute z-20 h-28 w-[min(9rem,43vw)] -translate-x-1/2 -translate-y-1/2 flex-col items-stretch gap-1 whitespace-normal rounded-md border border-budget-space-line bg-white/95 px-3 py-2 text-left text-mirai-text shadow-lg hover:bg-white hover:text-mirai-text",
              selectedProgramId === program.budgetProgramIdentityId &&
                "budget-network-node-selected"
            )}
            aria-label={`${program.displayProgramName}、当初予算額${formatBudgetAmount(program.amountThousandYen)}、詳細を見る`}
          >
            <span className="line-clamp-2 min-h-9 text-xs font-bold leading-4">
              {program.displayProgramName}
            </span>
            <span className="block truncate text-xs font-medium text-mirai-text-muted">
              {shortenBudgetDepartmentName(program.departmentDisplayName)}
            </span>
            <span className="block tabular-nums text-xs font-bold text-primary-strong">
              {formatBudgetAmount(program.amountThousandYen)}
            </span>
            {otherCategoryNames.length > 0 && (
              <span className="flex min-w-0 gap-1 overflow-hidden">
                {otherCategoryNames.slice(0, 1).map((name) => (
                  <Badge
                    key={name}
                    variant="secondary"
                    className="max-w-20 truncate px-1.5 py-0 text-[10px]"
                  >
                    {name}
                  </Badge>
                ))}
                {otherCategoryNames.length > 1 && (
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px]"
                  >
                    +{otherCategoryNames.length - 1}
                  </Badge>
                )}
              </span>
            )}
          </Button>
        );
      })}

      {programs.length === 0 && (
        <div className="absolute left-1/2 top-1/2 z-20 w-[min(90%,28rem)] -translate-x-1/2 rounded-md border border-budget-space-line bg-budget-space-deep/85 px-5 py-4 text-center text-budget-space-copy">
          <p className="font-bold text-white">
            公開済みの関連事業はまだありません
          </p>
          <p className="mt-1 text-sm">
            人が確認し、公開した関係だけを表示しています。
          </p>
        </div>
      )}
    </div>
  );
}

function NetworkChart({
  decorations = [],
  edges,
}: {
  decorations?: Array<{
    id: string;
    x: number;
    y: number;
    size: number;
  }>;
  edges: NetworkEdge[];
}) {
  const decorationPoints = decorations.map((decoration) => ({
    id: decoration.id,
    x: decoration.x,
    y: 100 - decoration.y,
    size: decoration.size,
  }));

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            hide
            allowDataOverflow
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            hide
            allowDataOverflow
          />
          <ZAxis type="number" dataKey="size" range={[22, 120]} />
          {edges.map((edge) => (
            <ReferenceLine
              key={edge.id}
              segment={[
                { x: edge.source.x, y: 100 - edge.source.y },
                { x: edge.target.x, y: 100 - edge.target.y },
              ]}
              stroke="var(--budget-space-line)"
              strokeOpacity={0.42}
              strokeWidth={1.25}
              ifOverflow="visible"
            />
          ))}
          <Scatter
            data={decorationPoints}
            fill="var(--budget-node-cyan)"
            fillOpacity={0.42}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function useBudgetNetworkMode(): "mobile" | "desktop" {
  const [mode, setMode] = useState<"mobile" | "desktop">(() => {
    if (typeof window === "undefined") {
      return "mobile";
    }
    return window.matchMedia("(min-width: 1024px)").matches
      ? "desktop"
      : "mobile";
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateMode = () => {
      setMode(mediaQuery.matches ? "desktop" : "mobile");
    };
    updateMode();
    mediaQuery.addEventListener("change", updateMode);
    return () => mediaQuery.removeEventListener("change", updateMode);
  }, []);

  return mode;
}
