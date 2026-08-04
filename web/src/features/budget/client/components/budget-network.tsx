"use client";

import {
  ArrowLeft,
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Factory,
  GraduationCap,
  HandHeart,
  House,
  Landmark,
  Leaf,
  type LucideIcon,
  Search,
  Shield,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  BudgetExplorationAvailability,
  BudgetExplorationCategory,
  BudgetExplorationData,
  BudgetExplorationProgram,
  BudgetExplorerView,
} from "../../shared/types/budget-exploration";
import { getBudgetCategoryCoreLabelLayout } from "../../shared/utils/budget-category-core-label";
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
import { getBudgetMapTransitionDuration } from "../../shared/utils/budget-map-motion";
import {
  getBudgetMapAmountTier,
  getBudgetMapProgramPage,
  getBudgetMapProgramPageSize,
} from "../../shared/utils/budget-map-programs";
import {
  BUDGET_MAP_MOBILE_STAR_COUNT,
  createBudgetMapStars,
} from "../../shared/utils/budget-map-stars";
import { getBudgetOfficialClassificationContext } from "../../shared/utils/budget-official-classification";
import {
  formatBudgetAmount,
  formatJapaneseFiscalYear,
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
  selectedProgramIdentityId?: string | null;
};

type NetworkEdge = {
  id: string;
  source: BudgetMapPosition;
  target: BudgetMapPosition;
  strength?: "primary" | "secondary";
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
  selectedProgramIdentityId = null,
}: BudgetNetworkProps) {
  const mode = useBudgetNetworkMode();
  const stableView = getBudgetMapStableView(view);
  const dimensions = getBudgetMapWorldDimensions(stableView, mode);
  const cameraFocus = getBudgetMapCameraFocus(view, mode, dimensions);
  const transitionTarget = view.kind === "transitioning" ? view.target : null;
  const { viewportRef, worldRef } = useBudgetMapCamera({
    dimensions,
    durationMs: transitionTarget
      ? getBudgetMapTransitionDuration(transitionTarget)
      : 360,
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
      data-transition-target={transitionTarget?.kind}
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
            transitionTarget={transitionTarget}
          />
        )}
        {stableView.kind === "category" && (
          <CategoryNetwork
            category={stableView.category}
            availability={exploration.availability}
            dimensions={dimensions}
            fiscalYear={exploration.activeDataset?.fiscalYear ?? null}
            mode={mode}
            onFocusSearch={onFocusSearch}
            onOpenOfficialHierarchy={onOpenOfficialHierarchy}
            onSelectTopic={onSelectTopic}
            transitionTarget={transitionTarget}
          />
        )}
        {stableView.kind === "topic" && (
          <TopicNetwork
            key={stableView.topic.id}
            category={stableView.category}
            dimensions={dimensions}
            exploration={exploration}
            mode={mode}
            onSelectProgram={onSelectProgram}
            programs={stableView.topic.programs}
            selectedProgramIdentityId={selectedProgramIdentityId}
            topicName={stableView.topic.name}
            transitionTarget={transitionTarget}
          />
        )}
      </div>

      {stableView.kind !== "overview" && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          disabled={view.kind === "transitioning"}
          aria-label="戻る"
          title="戻る"
          className="budget-map-back absolute left-4 top-36 z-40 size-11 rounded-md border border-budget-space-line bg-budget-space-deep/90 text-white hover:bg-budget-space-mid hover:text-white sm:left-9"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
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
        <div
          role="img"
          aria-label="令和8年度当初予算、世田谷区の予算"
          style={getNodePositionStyle(layout.center)}
          className="budget-map-node budget-map-overview-core absolute z-10 flex flex-col items-center justify-center text-center text-white"
        >
          <span aria-hidden="true" className="budget-map-core-orbit" />
          <Sparkles aria-hidden="true" className="size-5" />
          <span className="mt-2 text-xs font-bold text-budget-space-eyebrow">
            令和8年度
          </span>
          <strong className="mt-1 text-base leading-5">世田谷区の予算</strong>
          <span className="mt-1 text-xs text-budget-space-copy">当初予算</span>
        </div>

        {layout.topics.map((topic) => {
          const Icon = categoryIcons[topic.id] ?? CircleDot;
          return (
            <Button
              key={topic.id}
              type="button"
              variant="ghost"
              data-tone={topic.tone}
              onClick={() => onSelectCategory(topic.id)}
              style={getNodePositionStyle(topic)}
              className={cn(
                "budget-map-node budget-network-topic budget-map-category-node absolute z-20 flex-col gap-1.5 p-0 text-white hover:bg-transparent hover:text-white focus-visible:ring-budget-node-cyan focus-visible:ring-offset-budget-space-deep",
                selectedSlug === topic.id && "budget-network-node-selected"
              )}
              aria-label={`${topic.label}から予算を探す`}
            >
              <span
                aria-hidden="true"
                className="budget-map-node-icon budget-network-topic-core flex items-center justify-center rounded-full"
              >
                <Icon className="size-4 text-budget-space-deep" />
              </span>
              <span className="budget-map-node-label budget-network-topic-label text-sm font-bold">
                {topic.label}
              </span>
            </Button>
          );
        })}

        <p
          style={getNodePositionStyle({
            x: dimensions.width / 2,
            y: dimensions.height - (mode === "mobile" ? 13 : 18),
          })}
          className="budget-map-node budget-map-edge-note absolute z-20 w-80 max-w-[88%] text-center text-xs leading-5 text-budget-space-copy/75"
        >
          線は画面上の配置を示す装飾です。公式分類やお金の流れ、優先順位を示しません。
        </p>
      </div>
    </div>
  );
}

function CategoryNetwork({
  category,
  availability,
  dimensions,
  fiscalYear,
  mode,
  onFocusSearch,
  onOpenOfficialHierarchy,
  onSelectTopic,
  transitionTarget,
}: {
  category: BudgetExplorationCategory;
  availability: BudgetExplorationAvailability;
  dimensions: BudgetMapWorldDimensions;
  fiscalYear: number | null;
  mode: BudgetMapMode;
  onFocusSearch: () => void;
  onOpenOfficialHierarchy: () => void;
  onSelectTopic: (categorySlug: string, topicSlug: string) => void;
  transitionTarget:
    | Extract<BudgetExplorerView, { kind: "transitioning" }>["target"]
    | null;
}) {
  const officialClassification = getBudgetOfficialClassificationContext(
    category.slug
  );
  const layout = getBudgetMapCategoryLayout(category, mode, dimensions);
  const selectedTopicSlug =
    transitionTarget?.kind === "topic" ? transitionTarget.topic.slug : null;
  const FocusIcon = categoryIcons[category.slug] ?? CircleDot;
  const fiscalYearLabel = fiscalYear
    ? `${formatJapaneseFiscalYear(fiscalYear)}当初予算`
    : "当初予算";
  const categoryLabelLayout = getBudgetCategoryCoreLabelLayout(category.slug);

  return (
    <div
      role="group"
      className="budget-map-scene absolute inset-0"
      aria-label={`${category.name}に公開されたテーマ`}
    >
      <NetworkEdges
        dimensions={dimensions}
        edges={layout.topics.map((topic) => ({
          id: `category-topic-${topic.nodeId}`,
          source: layout.center,
          target: topic,
          strength: "primary",
        }))}
      />

      <div className="budget-map-nodes absolute inset-0">
        <div
          role="img"
          aria-label={`選択中の分野、${category.name}、${fiscalYearLabel}`}
          data-tone={category.tone}
          style={getNodePositionStyle(layout.center)}
          className="budget-map-node budget-network-focus-node budget-map-category-core absolute z-10 flex flex-col items-center justify-center gap-1.5 rounded-full text-center font-bold text-white"
        >
          <span aria-hidden="true" className="budget-map-core-orbit" />
          <FocusIcon aria-hidden="true" className="size-6" />
          <span
            className="budget-map-category-core-name max-w-[6.25rem] text-lg leading-tight"
            data-label-layout={categoryLabelLayout}
          >
            {category.name}
          </span>
          <span className="text-[10px] font-medium leading-tight text-budget-space-copy">
            {fiscalYearLabel}
          </span>
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
              data-tone={category.tone}
              onClick={() => onSelectTopic(category.slug, topic.slug)}
              style={getNodePositionStyle(position)}
              className={cn(
                "budget-map-node budget-network-topic-card budget-map-topic-node absolute z-20 whitespace-normal text-left text-white hover:text-white",
                selectedTopicSlug === topic.slug &&
                  "budget-network-node-selected"
              )}
              aria-label={`${topic.name}に関連する予算事業を見る`}
            >
              <span
                aria-hidden="true"
                className="budget-map-topic-beacon flex shrink-0 items-center justify-center rounded-full"
              >
                <Target className="size-3.5" />
              </span>
              <span className="line-clamp-2 text-sm font-bold leading-5">
                {topic.name}
              </span>
            </Button>
          );
        })}

        {category.topics.length === 0 && (
          <div
            style={getNodePositionStyle({
              x: dimensions.width / 2,
              y: mode === "mobile" ? 410 : dimensions.height * 0.76,
            })}
            className="budget-map-node budget-map-empty-panel absolute z-20 w-[28rem] max-w-[84%] rounded-md border border-budget-space-line bg-budget-space-deep/90 px-5 py-4 text-center text-budget-space-copy"
          >
            <p className="font-bold text-white">
              {availability === "no_active_dataset"
                ? "公開中の予算データはまだありません"
                : availability === "temporarily_unavailable"
                  ? "テーマデータを現在取得できません"
                  : "この分野は、まだテーマ整理中です"}
            </p>
            <p className="mt-1 text-sm leading-6">
              {availability === "no_active_dataset"
                ? "予算データの公開準備が整うまで空の状態で表示します。"
                : availability === "temporarily_unavailable"
                  ? "時間をおいて再度確認するか、検索または公式予算分類をお試しください。"
                  : "架空のテーマで埋めず、確認できたものから公開します。"}
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
              mode === "mobile" ? dimensions.width / 2 : dimensions.width - 180,
            y: dimensions.height - 42,
          })}
          className="budget-map-node absolute z-30 rounded-md border-budget-space-line bg-white/95 text-mirai-text"
        >
          <BookOpen aria-hidden="true" className="size-4" />
          {officialClassification.label}
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
  selectedProgramIdentityId,
  topicName,
  transitionTarget,
}: {
  category: BudgetExplorationCategory;
  dimensions: BudgetMapWorldDimensions;
  exploration: BudgetExplorationData;
  mode: BudgetMapMode;
  onSelectProgram: (budgetProgramIdentityId: string) => void;
  programs: BudgetExplorationProgram[];
  selectedProgramIdentityId: string | null;
  topicName: string;
  transitionTarget:
    | Extract<BudgetExplorerView, { kind: "transitioning" }>["target"]
    | null;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = getBudgetMapProgramPageSize(mode);
  const page = getBudgetMapProgramPage(programs, pageIndex, pageSize);
  const layout = getBudgetMapTopicLayout(
    page.items.map((program) => program.budgetProgramIdentityId),
    mode,
    dimensions
  );
  const categoryNameBySlug = new Map(
    exploration.categories.map((candidate) => [candidate.slug, candidate.name])
  );
  const selectedProgramId =
    transitionTarget?.kind === "program"
      ? transitionTarget.budgetProgramIdentityId
      : selectedProgramIdentityId;
  const visibleAmounts = page.items.map((program) => program.amountThousandYen);

  return (
    <div
      role="group"
      className="budget-map-scene absolute inset-0"
      aria-label={`${topicName}に関連する予算事業`}
    >
      <NetworkEdges
        dimensions={dimensions}
        edges={layout.programs.map((position) => ({
          id: `topic-program-${position.nodeId}`,
          source: layout.center,
          target: position,
          strength: "primary",
        }))}
      />

      <div className="budget-map-nodes absolute inset-0">
        <div
          role="img"
          aria-label={`選択中のテーマ、${topicName}`}
          data-tone={category.tone}
          style={getNodePositionStyle(layout.center)}
          className="budget-map-node budget-network-focus-node budget-map-topic-core absolute z-10 flex flex-col items-center justify-center gap-2 text-center text-white"
        >
          <span aria-hidden="true" className="budget-map-core-orbit" />
          <Target aria-hidden="true" className="size-5" />
          <span className="line-clamp-2 max-w-60 text-base font-bold leading-6">
            {topicName}
          </span>
        </div>

        {page.items.map((program, index) => {
          const position = layout.programs[index];
          if (!position) {
            return null;
          }
          const otherCategoryNames = program.categorySlugs
            .filter((slug) => slug !== category.slug)
            .map((slug) => categoryNameBySlug.get(slug))
            .filter((name): name is string => name !== undefined);
          const amountTier = getBudgetMapAmountTier(
            program.amountThousandYen,
            visibleAmounts
          );

          return (
            <Button
              key={program.budgetProgramIdentityId}
              type="button"
              variant="ghost"
              data-amount-tier={amountTier}
              data-zero-amount={program.isZeroAmount}
              onClick={() => onSelectProgram(program.budgetProgramIdentityId)}
              style={getNodePositionStyle(position)}
              className={cn(
                "budget-map-node budget-program-node absolute z-20 whitespace-normal text-left text-white hover:text-white",
                selectedProgramId === program.budgetProgramIdentityId &&
                  "budget-network-node-selected"
              )}
              aria-label={`${program.displayProgramName}、当初予算額${formatBudgetAmount(program.amountThousandYen)}、担当${shortenBudgetDepartmentName(program.departmentDisplayName)}、概要を見る`}
            >
              <span
                aria-hidden="true"
                className="budget-program-node-core flex shrink-0 items-center justify-center rounded-full"
              >
                <BriefcaseBusiness className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm font-bold leading-5">
                  {program.displayProgramName}
                </span>
                <span
                  className={cn(
                    "mt-1 block tabular-nums text-xs font-bold text-budget-node-mint",
                    program.isZeroAmount && "text-budget-node-gold"
                  )}
                >
                  {formatBudgetAmount(program.amountThousandYen)}
                </span>
                <span className="budget-program-department mt-1 truncate text-xs text-budget-space-copy/75">
                  {shortenBudgetDepartmentName(program.departmentDisplayName)}
                </span>
                {otherCategoryNames.length > 0 && (
                  <span className="budget-program-category-row mt-1 flex min-w-0 gap-1 overflow-hidden">
                    {otherCategoryNames.slice(0, 1).map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="budget-program-category-badge max-w-24 truncate px-1.5 py-0 text-[10px]"
                      >
                        {name}
                      </Badge>
                    ))}
                    {otherCategoryNames.length > 1 && (
                      <Badge
                        variant="outline"
                        className="budget-program-category-badge px-1.5 py-0 text-[10px]"
                      >
                        +{otherCategoryNames.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
              </span>
            </Button>
          );
        })}

        {programs.length === 0 && (
          <div
            style={getNodePositionStyle({
              x: dimensions.width / 2,
              y: mode === "mobile" ? 390 : dimensions.height * 0.74,
            })}
            className="budget-map-node budget-map-empty-panel absolute z-20 w-[28rem] max-w-[84%] rounded-md border border-budget-space-line bg-budget-space-deep/90 px-5 py-4 text-center text-budget-space-copy"
          >
            <p className="font-bold text-white">
              公開済みの関連事業はまだありません
            </p>
            <p className="mt-1 text-sm">
              人が確認し、公開した関係だけを表示しています。
            </p>
          </div>
        )}

        {page.pageCount > 1 && (
          <div
            role="group"
            aria-label="関連事業のページを切り替える"
            style={getNodePositionStyle({
              x: dimensions.width / 2,
              y: dimensions.height - 25,
            })}
            className="budget-map-node budget-map-pagination absolute z-30 flex items-center gap-2 rounded-md border border-budget-space-line bg-budget-space-deep/95 px-2 py-1.5 text-white"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page.pageIndex === 0}
              onClick={() => setPageIndex((current) => current - 1)}
              className="min-h-11 rounded-md px-2 text-white hover:bg-budget-space-mid hover:text-white"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              前のページ
            </Button>
            <span
              aria-live="polite"
              className="min-w-20 text-center text-xs tabular-nums text-budget-space-copy"
            >
              {page.pageIndex + 1} / {page.pageCount} ページ
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page.pageIndex >= page.pageCount - 1}
              onClick={() => setPageIndex((current) => current + 1)}
              className="min-h-11 rounded-md px-2 text-white hover:bg-budget-space-mid hover:text-white"
            >
              次のページ
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
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
      <g fill="none">
        {edges.map((edge) => (
          <path
            key={edge.id}
            className={cn(
              "budget-map-edge",
              edge.strength === "primary"
                ? "budget-map-edge-primary"
                : "budget-map-edge-secondary"
            )}
            d={createEdgePath(edge)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <g className="budget-map-decorations">
        {decorations.map((decoration) => (
          <circle
            key={decoration.id}
            cx={decoration.x}
            cy={decoration.y}
            r={Math.max(1.5, decoration.size / 6)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

function createEdgePath(edge: NetworkEdge): string {
  const midpointX = (edge.source.x + edge.target.x) / 2;
  const midpointY = (edge.source.y + edge.target.y) / 2;
  const direction = edge.id.length % 2 === 0 ? 1 : -1;
  const offsetX = (edge.target.y - edge.source.y) * 0.04 * direction;
  const offsetY = (edge.source.x - edge.target.x) * 0.04 * direction;
  return `M ${edge.source.x} ${edge.source.y} Q ${midpointX + offsetX} ${midpointY + offsetY} ${edge.target.x} ${edge.target.y}`;
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
    const mediaQuery = window.matchMedia("(min-width: 1000px)");
    const updateMode = () => {
      setMode(mediaQuery.matches ? "desktop" : "mobile");
    };
    updateMode();
    mediaQuery.addEventListener("change", updateMode);
    return () => mediaQuery.removeEventListener("change", updateMode);
  }, []);

  return mode;
}
