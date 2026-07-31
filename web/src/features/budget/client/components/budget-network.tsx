"use client";

import {
  ArrowLeft,
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CircleDot,
  Factory,
  GraduationCap,
  HandHeart,
  House,
  Landmark,
  Leaf,
  Search,
  Shield,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  BudgetExplorationCategory,
  BudgetExplorationData,
  BudgetExplorationProgram,
  BudgetExplorerView,
} from "../../shared/types/budget-exploration";
import type { BudgetNetworkTopicTone } from "../../shared/types/budget-page";
import {
  type BudgetMapMode,
  type BudgetMapPosition,
  type BudgetMapWorldDimensions,
  getBudgetMapCameraFocus,
  getBudgetMapCategoryLayout,
  getBudgetMapOverviewLayout,
  getBudgetMapStableView,
  getBudgetMapTopicLayout,
  getBudgetMapWorldDimensions,
} from "../../shared/utils/budget-map-layout";
import {
  BUDGET_MAP_MOBILE_STAR_COUNT,
  createBudgetMapStars,
} from "../../shared/utils/budget-map-stars";
import {
  formatBudgetAmount,
  shortenBudgetDepartmentName,
} from "../../shared/utils/budget-page-view";
import { useBudgetMapCamera } from "../hooks/use-budget-map-camera";

type BudgetNetworkProps = {
  exploration: BudgetExplorationData;
  view: BudgetExplorerView;
  onBack: () => void;
  onFocusSearch: () => void;
  onOpenOfficialHierarchy: () => void;
  onSelectCategory: (slug: string) => void;
  onSelectTopic: (categorySlug: string, topicSlug: string) => void;
  onSelectProgram: (budgetProgramIdentityId: string) => void;
};

type NetworkEdge = {
  id: string;
  source: BudgetMapPosition;
  target: BudgetMapPosition;
};

type BudgetMapStyle = CSSProperties & {
  "--budget-map-node-x"?: string;
  "--budget-map-node-y"?: string;
  "--budget-star-x"?: string;
  "--budget-star-y"?: string;
  "--budget-star-size"?: string;
  "--budget-star-opacity"?: string;
  "--budget-star-delay"?: string;
  "--budget-star-duration"?: string;
};

const topicToneClasses: Record<BudgetNetworkTopicTone, string> = {
  cyan: "border-budget-node-cyan bg-budget-node-cyan",
  mint: "border-budget-node-mint bg-budget-node-mint",
  gold: "border-budget-node-gold bg-budget-node-gold",
};

const categoryIcons: Record<string, LucideIcon> = {
  education: GraduationCap,
  "child-rearing": Baby,
  welfare: HandHeart,
  "urban-development": Building2,
  "disaster-prevention": Shield,
  "administration-finance": Landmark,
  "culture-sports": Trophy,
  industry: Factory,
  environment: Leaf,
  "daily-life": House,
};

const backgroundStars = createBudgetMapStars();
const mobileBackgroundStars = backgroundStars.slice(
  0,
  BUDGET_MAP_MOBILE_STAR_COUNT
);

export function BudgetNetwork({
  exploration,
  view,
  onBack,
  onFocusSearch,
  onOpenOfficialHierarchy,
  onSelectCategory,
  onSelectProgram,
  onSelectTopic,
}: BudgetNetworkProps) {
  const mode = useBudgetNetworkMode();
  const stableView = getBudgetMapStableView(view);
  const dimensions = getBudgetMapWorldDimensions(stableView, mode);
  const cameraFocus = getBudgetMapCameraFocus(view, mode, dimensions);
  const { viewportRef, worldRef } = useBudgetMapCamera({
    dimensions,
    focus: cameraFocus,
    isTransitioning: view.kind === "transitioning",
  });

  return (
    <div
      ref={viewportRef}
      className={cn(
        "budget-map-viewport relative size-full overflow-hidden",
        view.kind === "transitioning" && "budget-network-transitioning"
      )}
      data-explorer-state={view.kind}
      data-map-mode={mode}
    >
      <BudgetMapBackground mode={mode} />

      <div
        ref={worldRef}
        id="world"
        data-testid="budget-map-world"
        data-camera-moving="false"
        className="budget-map-world absolute left-0 top-0"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {stableView.kind === "overview" && (
          <OverviewNetwork
            dimensions={dimensions}
            mode={mode}
            onSelectCategory={onSelectCategory}
            transitionTarget={
              view.kind === "transitioning" ? view.target : null
            }
          />
        )}
        {stableView.kind === "category" && (
          <CategoryNetwork
            category={stableView.category}
            dataUnavailable={
              exploration.availability === "temporarily_unavailable"
            }
            dimensions={dimensions}
            mode={mode}
            onFocusSearch={onFocusSearch}
            onOpenOfficialHierarchy={onOpenOfficialHierarchy}
            onSelectCategory={onSelectCategory}
            onSelectTopic={onSelectTopic}
            transitionTarget={
              view.kind === "transitioning" ? view.target : null
            }
          />
        )}
        {stableView.kind === "topic" && (
          <TopicNetwork
            category={stableView.category}
            dimensions={dimensions}
            exploration={exploration}
            mode={mode}
            onSelectProgram={onSelectProgram}
            programs={stableView.topic.programs}
            topicName={stableView.topic.name}
            transitionTarget={
              view.kind === "transitioning" ? view.target : null
            }
          />
        )}
      </div>

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
    </div>
  );
}

function BudgetMapBackground({ mode }: { mode: BudgetMapMode }) {
  const stars = mode === "mobile" ? mobileBackgroundStars : backgroundStars;

  return (
    <div aria-hidden="true" className="budget-map-background absolute inset-0">
      <div className="budget-map-grid absolute inset-0" />
      <div className="budget-map-stars absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className={cn(
              "budget-map-star absolute rounded-full bg-budget-node-cyan",
              star.twinkles && "budget-map-star-twinkle"
            )}
            style={
              {
                "--budget-star-x": `${star.xPercent}%`,
                "--budget-star-y": `${star.yPercent}%`,
                "--budget-star-size": `${star.sizePx}px`,
                "--budget-star-opacity": `${star.opacity}`,
                "--budget-star-delay": `${star.animationDelaySeconds}s`,
                "--budget-star-duration": `${star.animationDurationSeconds}s`,
              } as BudgetMapStyle
            }
          />
        ))}
      </div>
      <div className="budget-map-glow absolute inset-0" />
    </div>
  );
}

function OverviewNetwork({
  dimensions,
  mode,
  onSelectCategory,
  transitionTarget,
}: {
  dimensions: BudgetMapWorldDimensions;
  mode: BudgetMapMode;
  onSelectCategory: (slug: string) => void;
  transitionTarget:
    | Extract<BudgetExplorerView, { kind: "transitioning" }>["target"]
    | null;
}) {
  const layout = getBudgetMapOverviewLayout(mode, dimensions);
  const selectedSlug =
    transitionTarget?.kind === "category"
      ? transitionTarget.category.slug
      : null;

  return (
    <div
      role="group"
      className="budget-map-scene absolute inset-0"
      aria-label="予算を10の分野から探すネットワーク"
    >
      <NetworkEdges
        decorations={layout.decorations}
        dimensions={dimensions}
        edges={layout.edges}
      />
      <div className="budget-map-nodes absolute inset-0">
        {layout.topics.map((topic) => {
          const Icon = categoryIcons[topic.id] ?? CircleDot;
          return (
            <Button
              key={topic.id}
              type="button"
              variant="ghost"
              onClick={() => onSelectCategory(topic.id)}
              style={getNodePositionStyle(topic)}
              className={cn(
                "budget-map-node budget-network-topic budget-map-category-node absolute flex-col gap-1.5 p-0 text-white hover:bg-transparent hover:text-white focus-visible:ring-budget-node-cyan focus-visible:ring-offset-budget-space-deep",
                selectedSlug === topic.id && "budget-network-node-selected"
              )}
              aria-label={`${topic.label}から予算を探す`}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "budget-map-node-icon budget-network-topic-core flex size-10 items-center justify-center rounded-full border-4 shadow-lg",
                  topicToneClasses[topic.tone]
                )}
              >
                <Icon className="size-5 text-budget-space-deep" />
              </span>
              <span className="budget-map-node-label budget-network-topic-label text-sm font-bold">
                {topic.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryNetwork({
  category,
  dataUnavailable,
  dimensions,
  mode,
  onFocusSearch,
  onOpenOfficialHierarchy,
  onSelectCategory,
  onSelectTopic,
  transitionTarget,
}: {
  category: BudgetExplorationCategory;
  dataUnavailable: boolean;
  dimensions: BudgetMapWorldDimensions;
  mode: BudgetMapMode;
  onFocusSearch: () => void;
  onOpenOfficialHierarchy: () => void;
  onSelectCategory: (slug: string) => void;
  onSelectTopic: (categorySlug: string, topicSlug: string) => void;
  transitionTarget:
    | Extract<BudgetExplorerView, { kind: "transitioning" }>["target"]
    | null;
}) {
  const overviewLayout = getBudgetMapOverviewLayout(mode, dimensions);
  const layout = getBudgetMapCategoryLayout(category, mode, dimensions);
  const selectedTopicSlug =
    transitionTarget?.kind === "topic" ? transitionTarget.topic.slug : null;
  const FocusIcon = categoryIcons[category.slug] ?? CircleDot;

  return (
    <div
      role="group"
      className="budget-map-scene absolute inset-0"
      aria-label={`${category.name}に公開された課題`}
    >
      <NetworkEdges
        decorations={overviewLayout.decorations.map((decoration) => ({
          ...decoration,
          size: Math.max(8, decoration.size / 2),
        }))}
        dimensions={dimensions}
        edges={layout.topics.map((topic) => ({
          id: `category-topic-${topic.index}`,
          source: layout.center,
          target: topic,
        }))}
      />

      <div className="budget-map-nodes absolute inset-0">
        {overviewLayout.topics
          .filter((topic) => topic.id !== category.slug)
          .map((topic) => {
            const Icon = categoryIcons[topic.id] ?? CircleDot;
            return (
              <Button
                key={topic.id}
                type="button"
                variant="ghost"
                onClick={() => onSelectCategory(topic.id)}
                style={getNodePositionStyle(topic)}
                className="budget-map-node budget-map-background-category absolute h-12 w-28 gap-1 p-0 text-xs font-bold text-budget-space-copy/45 hover:bg-transparent hover:text-white"
                aria-label={`${topic.label}へ切り替える`}
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {topic.label}
              </Button>
            );
          })}

        <div
          style={getNodePositionStyle(layout.center)}
          className="budget-map-node budget-network-focus-node absolute z-10 flex size-32 flex-col items-center justify-center gap-2 rounded-full border-2 border-budget-node-cyan bg-budget-space-deep/85 px-3 text-center text-lg font-bold text-white shadow-xl"
        >
          <FocusIcon aria-hidden="true" className="size-6" />
          {category.name}
        </div>

        {layout.topics.map(({ topic, ...position }) => {
          if (!topic) {
            return null;
          }
          return (
            <Button
              key={topic.id}
              type="button"
              variant="ghost"
              onClick={() => onSelectTopic(category.slug, topic.slug)}
              style={getNodePositionStyle(position)}
              className={cn(
                "budget-map-node budget-network-topic-card absolute z-20 h-24 w-56 whitespace-normal rounded-md border border-budget-space-line bg-white/95 px-4 py-3 text-center text-sm font-bold leading-5 text-mirai-text shadow-lg hover:bg-white hover:text-primary-strong",
                selectedTopicSlug === topic.slug &&
                  "budget-network-node-selected"
              )}
              aria-label={`${topic.name}に関連する予算事業を見る`}
            >
              <Target
                aria-hidden="true"
                className="size-4 text-primary-strong"
              />
              <span>{topic.name}</span>
            </Button>
          );
        })}

        {category.topics.length === 0 && (
          <div
            style={getNodePositionStyle({
              x: dimensions.width / 2,
              y: dimensions.height * 0.68,
            })}
            className="budget-map-node budget-map-empty-panel absolute z-20 w-[28rem] max-w-[84%] rounded-md border border-budget-space-line bg-budget-space-deep/85 px-5 py-4 text-center text-budget-space-copy backdrop-blur-sm"
          >
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
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenOfficialHierarchy}
          style={getNodePositionStyle({
            x:
              mode === "mobile" ? dimensions.width / 2 : dimensions.width - 190,
            y: dimensions.height - 56,
          })}
          className="budget-map-node absolute z-30 rounded-md border-budget-space-line bg-white/95 text-mirai-text"
        >
          <BookOpen aria-hidden="true" className="size-4" />
          公式予算分類からすべて見る
        </Button>
      </div>
    </div>
  );
}

function TopicNetwork({
  category,
  dimensions,
  exploration,
  mode,
  onSelectProgram,
  programs,
  topicName,
  transitionTarget,
}: {
  category: BudgetExplorationCategory;
  dimensions: BudgetMapWorldDimensions;
  exploration: BudgetExplorationData;
  mode: BudgetMapMode;
  onSelectProgram: (budgetProgramIdentityId: string) => void;
  programs: BudgetExplorationProgram[];
  topicName: string;
  transitionTarget:
    | Extract<BudgetExplorerView, { kind: "transitioning" }>["target"]
    | null;
}) {
  const layout = getBudgetMapTopicLayout(programs.length, mode, dimensions);
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
      className="budget-map-scene absolute inset-0"
      aria-label={`${topicName}に関連する予算事業`}
    >
      <NetworkEdges
        dimensions={dimensions}
        edges={layout.programs.map((position) => ({
          id: `topic-program-${position.index}`,
          source: layout.center,
          target: position,
        }))}
      />

      <div className="budget-map-nodes absolute inset-0">
        <div
          style={getNodePositionStyle(layout.center)}
          className="budget-map-node budget-network-focus-node absolute z-10 flex min-h-28 w-72 flex-col items-center justify-center gap-2 rounded-md border-2 border-budget-node-mint bg-budget-space-deep/90 px-5 py-4 text-center text-lg font-bold leading-6 text-white shadow-xl"
        >
          <Target aria-hidden="true" className="size-5" />
          {topicName}
        </div>

        {programs.map((program, index) => {
          const position = layout.programs[index];
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
              style={getNodePositionStyle(position)}
              className={cn(
                "budget-map-node budget-program-node absolute z-20 flex-col items-stretch gap-1 whitespace-normal rounded-md border border-budget-space-line bg-white/95 py-2 text-left text-mirai-text shadow-lg hover:bg-white hover:text-mirai-text",
                mode === "mobile" ? "h-24 w-40 px-2" : "h-28 w-48 px-3",
                selectedProgramId === program.budgetProgramIdentityId &&
                  "budget-network-node-selected"
              )}
              aria-label={`${program.displayProgramName}、当初予算額${formatBudgetAmount(program.amountThousandYen)}、詳細を見る`}
            >
              <span className="flex min-w-0 items-start gap-1.5">
                <BriefcaseBusiness
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary-strong"
                />
                <span
                  className={cn(
                    "line-clamp-2 font-bold",
                    mode === "mobile"
                      ? "min-h-10 text-sm leading-5"
                      : "min-h-9 text-xs leading-4"
                  )}
                >
                  {program.displayProgramName}
                </span>
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
          <div
            style={getNodePositionStyle({
              x: dimensions.width / 2,
              y: dimensions.height * 0.58,
            })}
            className="budget-map-node budget-map-empty-panel absolute z-20 w-[28rem] max-w-[84%] rounded-md border border-budget-space-line bg-budget-space-deep/85 px-5 py-4 text-center text-budget-space-copy"
          >
            <p className="font-bold text-white">
              公開済みの関連事業はまだありません
            </p>
            <p className="mt-1 text-sm">
              人が確認し、公開した関係だけを表示しています。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NetworkEdges({
  decorations = [],
  dimensions,
  edges,
}: {
  decorations?: Array<BudgetMapPosition & { id: string; size: number }>;
  dimensions: BudgetMapWorldDimensions;
  edges: NetworkEdge[];
}) {
  return (
    <svg
      aria-hidden="true"
      data-testid="budget-map-edges"
      className="budget-map-edges absolute inset-0 size-full"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      width={dimensions.width}
      height={dimensions.height}
    >
      <g fill="none" stroke="var(--budget-space-line)" strokeOpacity="0.42">
        {edges.map((edge) => (
          <path
            key={edge.id}
            d={`M ${edge.source.x} ${edge.source.y} L ${edge.target.x} ${edge.target.y}`}
            strokeWidth="1.25"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <g fill="var(--budget-node-cyan)" fillOpacity="0.42">
        {decorations.map((decoration) => (
          <circle
            key={decoration.id}
            cx={decoration.x}
            cy={decoration.y}
            r={Math.max(2, decoration.size / 5)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

function getNodePositionStyle(position: BudgetMapPosition): BudgetMapStyle {
  return {
    "--budget-map-node-x": `${position.x}px`,
    "--budget-map-node-y": `${position.y}px`,
  };
}

function useBudgetNetworkMode(): BudgetMapMode {
  const [mode, setMode] = useState<BudgetMapMode>("mobile");

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
