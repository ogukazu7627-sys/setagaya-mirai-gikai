"use client";

import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  BudgetExplorationAvailability,
  BudgetExplorationData,
  BudgetExplorationDataset,
  BudgetExplorerTransitionTarget,
  BudgetExplorerView,
} from "../../../shared/types/budget-exploration";
import { getBudgetExplorerSceneLabel } from "../../../shared/utils/budget-explorer-view";
import { getBudgetMapStableView } from "../../../shared/utils/budget-map-layout";
import { getBudgetMapProgramPageSize } from "../../../shared/utils/budget-map-programs";
import {
  createBudgetMapV2Stars,
  getBudgetMapV2StarCount,
} from "../../../shared/utils/budget-map-v2-particles";
import {
  buildBudgetMapV2Scene,
  getBudgetMapV2StarSeed,
} from "../../../shared/utils/budget-map-v2-scene";
import {
  createBudgetMapV2WarpShells,
  getBudgetMapV2CameraStep,
  getBudgetMapV2DiveFocus,
} from "../../../shared/utils/budget-map-v2-transition";
import { getBudgetOfficialClassificationContext } from "../../../shared/utils/budget-official-classification";
import { formatJapaneseFiscalYear } from "../../../shared/utils/budget-page-view";
import { useBudgetMapV2Camera } from "../../hooks/use-budget-map-v2-camera";
import {
  useBudgetMapV2Mode,
  useBudgetMapV2ReduceMotion,
} from "../../hooks/use-budget-map-v2-environment";
import { useBudgetMapV2Phase } from "../../hooks/use-budget-map-v2-phase";
import {
  BudgetMapV2EdgeLayer,
  BudgetMapV2FlowLayer,
  BudgetMapV2Stars,
  type BudgetMapV2Style,
  BudgetMapV2WarpLayer,
} from "./budget-map-v2-layers";
import {
  BudgetMapV2CategoryNodeButton,
  BudgetMapV2DistantNodeButton,
  BudgetMapV2ProgramNodeButton,
  BudgetMapV2TopicNodeButton,
} from "./budget-map-v2-nodes";

/**
 * 触れる予算・宇宙マップ v2 の描画層。
 *
 * iframe 内で完結し、親ページの DOM には触れない。
 * ヒーロー文や注記は親ページの責務なのでここには置かない。
 * Canvas / WebGL は使わず、DOM + SVG + CSS transform だけで描く。
 */

const WARP_SHELLS = createBudgetMapV2WarpShells();

type BudgetMapV2NetworkProps = {
  exploration: BudgetExplorationData;
  view: BudgetExplorerView;
  onBack: () => void;
  onFocusSearch: () => void;
  onOpenOfficialHierarchy: () => void;
  onSelectCategory: (slug: string) => void;
  onSelectTopic: (categorySlug: string, topicSlug: string) => void;
  onSelectProgram: (budgetProgramIdentityId: string) => void;
};

export function BudgetMapV2Network({
  exploration,
  view,
  onBack,
  onFocusSearch,
  onOpenOfficialHierarchy,
  onSelectCategory,
  onSelectProgram,
  onSelectTopic,
}: BudgetMapV2NetworkProps) {
  const mode = useBudgetMapV2Mode();
  const reduceMotion = useBudgetMapV2ReduceMotion();
  const stableView = getBudgetMapStableView(view);
  const transitionTarget = view.kind === "transitioning" ? view.target : null;
  const {
    kind: transitionKind,
    phase,
    showWarp,
  } = useBudgetMapV2Phase({
    stableView,
    transitionTarget,
    reduceMotion,
  });

  const pageSize = getBudgetMapProgramPageSize(mode);
  // 課題やページサイズが変わったら1ページ目へ戻す。
  // effect ではなくレンダー中に調整し、古いページを1フレームも見せない。
  const pageResetKey = `${
    stableView.kind === "topic" ? stableView.topic.id : stableView.kind
  }:${pageSize}`;
  const [programPage, setProgramPage] = useState({
    key: pageResetKey,
    index: 0,
  });
  if (programPage.key !== pageResetKey) {
    setProgramPage({ key: pageResetKey, index: 0 });
  }
  const programPageIndex =
    programPage.key === pageResetKey ? programPage.index : 0;
  const setProgramPageIndex = (updater: (current: number) => number) => {
    setProgramPage((current) => ({
      key: pageResetKey,
      index: Math.max(0, updater(current.index)),
    }));
  };

  const scene = useMemo(
    () =>
      buildBudgetMapV2Scene({
        view: stableView,
        categories: exploration.categories,
        mode,
        withMotionParticles: !reduceMotion,
        programPageIndex,
        programPageSize: pageSize,
      }),
    [
      exploration.categories,
      mode,
      pageSize,
      programPageIndex,
      reduceMotion,
      stableView,
    ]
  );

  const stars = useMemo(
    () =>
      createBudgetMapV2Stars(
        getBudgetMapV2StarSeed(scene.kind),
        getBudgetMapV2StarCount(mode)
      ),
    [mode, scene.kind]
  );

  const diveFocus = useMemo(
    () => getDiveFocus(scene, transitionTarget),
    [scene, transitionTarget]
  );
  const cameraStep = getBudgetMapV2CameraStep({
    phase,
    kind: transitionKind,
    restFocus: scene.cameraFocus,
    diveFocus,
    reduceMotion,
  });
  const { viewportRef, worldRef } = useBudgetMapV2Camera({
    dimensions: scene.world,
    focus: cameraStep.focus,
    zoom: cameraStep.zoom,
    durationMs: cameraStep.durationMs,
    easing: cameraStep.easing,
  });

  const isBusy = phase !== "idle";
  const selectedSlug =
    transitionTarget?.kind === "category"
      ? transitionTarget.category.slug
      : null;
  const selectedTopicSlug =
    transitionTarget?.kind === "topic" ? transitionTarget.topic.slug : null;
  const selectedProgramId =
    transitionTarget?.kind === "program"
      ? transitionTarget.budgetProgramIdentityId
      : null;

  const handleSelectCategory = (slug: string) => {
    if (isBusy) {
      return;
    }
    onSelectCategory(slug);
  };
  const handleSelectTopic = (topicSlug: string) => {
    if (isBusy || stableView.kind !== "category") {
      return;
    }
    onSelectTopic(stableView.category.slug, topicSlug);
  };
  const handleSelectProgram = (budgetProgramIdentityId: string) => {
    if (isBusy) {
      return;
    }
    onSelectProgram(budgetProgramIdentityId);
  };

  return (
    <div
      ref={viewportRef}
      className="budget-map-v2-viewport"
      data-scene={scene.kind}
      data-phase={phase}
      data-map-mode={mode}
      data-testid="budget-map-v2-viewport"
    >
      <BudgetMapV2Stars stars={stars} />
      <div aria-hidden="true" className="budget-map-v2-vignette" />

      <div
        ref={worldRef}
        id="world"
        data-testid="budget-map-v2-world"
        data-camera-moving="false"
        className="budget-map-v2-world"
        style={{ width: scene.world.width, height: scene.world.height }}
      >
        <div
          role="group"
          aria-label={getBudgetExplorerSceneLabel(stableView)}
          className="budget-map-v2-scene"
        >
          <BudgetMapV2EdgeLayer
            branches={scene.branches}
            coreDots={scene.coreDots}
            dimensions={scene.world}
            edges={scene.edges}
          />
          <BudgetMapV2FlowLayer particles={scene.flow} />

          <div className="absolute inset-0">
            <BudgetMapV2Core
              activeDataset={exploration.activeDataset}
              scene={scene}
              view={stableView}
            />

            {scene.distantCategories.map((node) => (
              <BudgetMapV2DistantNodeButton
                key={node.slug}
                disabled={isBusy}
                node={node}
                onSelect={handleSelectCategory}
              />
            ))}

            {scene.categories.map((node) => (
              <BudgetMapV2CategoryNodeButton
                key={node.slug}
                disabled={isBusy}
                node={node}
                onSelect={handleSelectCategory}
                selected={selectedSlug === node.slug}
              />
            ))}

            {scene.topics.map((node) => (
              <BudgetMapV2TopicNodeButton
                key={node.slug}
                disabled={isBusy}
                node={node}
                onSelect={handleSelectTopic}
                selected={selectedTopicSlug === node.slug}
              />
            ))}

            {scene.programs.map((node) => (
              <BudgetMapV2ProgramNodeButton
                key={node.budgetProgramIdentityId}
                disabled={isBusy}
                node={node}
                onSelect={handleSelectProgram}
                selected={selectedProgramId === node.budgetProgramIdentityId}
              />
            ))}
          </div>
        </div>
      </div>

      {showWarp && <BudgetMapV2WarpLayer shells={WARP_SHELLS} />}

      <BudgetMapV2Chrome
        availability={exploration.availability}
        isBusy={isBusy}
        onBack={onBack}
        onFocusSearch={onFocusSearch}
        onOpenOfficialHierarchy={onOpenOfficialHierarchy}
        onPageChange={setProgramPageIndex}
        scene={scene}
        view={stableView}
      />
    </div>
  );
}

type SceneModel = ReturnType<typeof buildBudgetMapV2Scene>;
type StableView = ReturnType<typeof getBudgetMapStableView>;

/**
 * 中心の表示。overview は粒子球体のみ、category / topic は中実コアを重ねる。
 * 「令和8年度・当初予算」であることを常に画面上へ出す。
 */
function BudgetMapV2Core({
  activeDataset,
  scene,
  view,
}: {
  activeDataset: BudgetExplorationDataset | null;
  scene: SceneModel;
  view: StableView;
}) {
  const coreStyle = {
    "--budget-map-node-x": `${scene.coreCenter.x}px`,
    "--budget-map-node-y": `${scene.coreCenter.y}px`,
    "--budget-v2-hue": `${scene.coreHue}`,
  } as BudgetMapV2Style;
  const glowSize = scene.solidCoreDiameter
    ? scene.solidCoreDiameter * 1.7
    : 212;

  return (
    <>
      <div
        aria-hidden="true"
        className="budget-map-v2-core-glow"
        style={
          {
            ...coreStyle,
            "--budget-v2-glow-size": `${glowSize}px`,
          } as BudgetMapV2Style
        }
      />
      {scene.solidCoreDiameter !== null && (
        <div
          aria-hidden="true"
          className="budget-map-v2-solid-core"
          style={
            {
              ...coreStyle,
              "--budget-v2-core-size": `${scene.solidCoreDiameter}px`,
            } as BudgetMapV2Style
          }
        >
          <Target className="size-[22px]" strokeWidth={1.4} />
        </div>
      )}
      <div
        role="img"
        aria-label={getCoreLabel(view, activeDataset?.fiscalYear ?? null)}
        className="budget-map-v2-core-caption"
        style={
          {
            ...coreStyle,
            "--budget-map-node-x": `${scene.captionCenter.x}px`,
            "--budget-map-node-y": `${scene.captionCenter.y}px`,
          } as BudgetMapV2Style
        }
      >
        <BudgetMapV2CoreCaption
          activeDataset={activeDataset}
          scene={scene}
          view={view}
        />
      </div>
    </>
  );
}

function BudgetMapV2CoreCaption({
  activeDataset,
  scene,
  view,
}: {
  activeDataset: BudgetExplorationDataset | null;
  scene: SceneModel;
  view: StableView;
}) {
  const fiscalYearLabel = activeDataset
    ? `${formatJapaneseFiscalYear(activeDataset.fiscalYear)}・当初予算`
    : "当初予算";

  if (view.kind === "overview") {
    return (
      <>
        <span className="text-[10.5px] font-bold tracking-[0.2em] text-budget-space-eyebrow">
          {fiscalYearLabel}
        </span>
        <strong className="font-mirai-serif text-[19px] font-normal leading-tight tracking-[0.16em] text-white">
          世田谷区の予算
        </strong>
      </>
    );
  }

  if (view.kind === "category") {
    return (
      <>
        <span className="font-mirai-serif text-[22px] tracking-[0.2em] text-white sm:text-[27px]">
          {view.category.name}
        </span>
        <span className="text-[11px] tracking-[0.08em] text-budget-space-copy/75">
          公開中のテーマ {view.category.topics.length}件
        </span>
        <span className="text-[10px] font-bold tracking-[0.14em] text-budget-space-eyebrow">
          {fiscalYearLabel}
        </span>
      </>
    );
  }

  const page = scene.programPage;
  return (
    <>
      <span className="max-w-[300px] text-[15px] font-bold leading-snug text-white sm:text-[19px]">
        {view.topic.name}
      </span>
      <span className="text-[10.5px] tracking-[0.08em] text-budget-space-copy/80 sm:text-[12px]">
        関連する予算事業 {page?.totalCount ?? 0}件
        {page && page.totalCount > 0
          ? ` ／ ${page.startNumber}〜${page.endNumber}件を表示`
          : ""}
      </span>
      <span className="text-[10px] font-bold tracking-[0.14em] text-budget-space-eyebrow">
        {fiscalYearLabel}
      </span>
    </>
  );
}

function BudgetMapV2Chrome({
  availability,
  isBusy,
  onBack,
  onFocusSearch,
  onOpenOfficialHierarchy,
  onPageChange,
  scene,
  view,
}: {
  availability: BudgetExplorationAvailability;
  isBusy: boolean;
  onBack: () => void;
  onFocusSearch: () => void;
  onOpenOfficialHierarchy: () => void;
  onPageChange: (updater: (current: number) => number) => void;
  scene: SceneModel;
  view: StableView;
}) {
  const page = scene.programPage;
  const showEmptyCategory =
    view.kind === "category" && scene.topics.length === 0;
  const showUnavailableOverview =
    view.kind === "overview" && availability !== "available";
  const showEmptyTopic = view.kind === "topic" && (page?.totalCount ?? 0) === 0;
  const emptyCopy = getExplorationEmptyCopy(availability);
  const officialClassification = getBudgetOfficialClassificationContext(
    view.kind === "overview" ? null : view.category.slug
  );

  return (
    <>
      {view.kind !== "overview" && (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isBusy}
          aria-label="戻る"
          className="budget-map-v2-chrome-button budget-map-v2-back hover:bg-transparent"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {view.kind === "topic" ? "テーマ一覧" : "すべての分野"}
        </Button>
      )}

      {view.kind === "category" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenOfficialHierarchy}
          className="budget-map-v2-official rounded-md border-budget-space-line bg-white/95 text-mirai-text hover:bg-white"
        >
          <BookOpen aria-hidden="true" className="size-4" />
          {officialClassification.label}
        </Button>
      )}

      {(showUnavailableOverview || showEmptyCategory) && (
        <div className="budget-map-v2-empty-panel">
          <p className="font-bold text-white">{emptyCopy.title}</p>
          <p className="mt-1 text-sm leading-6">{emptyCopy.description}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFocusSearch}
              className="min-h-11 rounded-md border-budget-space-line"
            >
              <Search aria-hidden="true" className="size-4" />
              予算を検索
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenOfficialHierarchy}
              className="min-h-11 rounded-md border-budget-space-line"
            >
              <BookOpen aria-hidden="true" className="size-4" />
              {officialClassification.label}
            </Button>
          </div>
        </div>
      )}

      {showEmptyTopic && (
        <div className="budget-map-v2-empty-panel">
          <p className="font-bold text-white">
            公開済みの関連事業はまだありません
          </p>
          <p className="mt-1 text-sm leading-6">
            人が確認し、公開した関係だけを表示しています。
          </p>
        </div>
      )}

      {page && page.pageCount > 1 && (
        <div
          role="group"
          aria-label="関連事業の星系を切り替える"
          className="budget-map-v2-pagination"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy || page.pageIndex === 0}
            onClick={() => onPageChange((current) => current - 1)}
            className="min-h-11 rounded-md px-2 text-white hover:bg-budget-space-mid hover:text-white"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            前の星系
          </Button>
          <span aria-live="polite" className="budget-map-v2-pagination-count">
            {page.startNumber}〜{page.endNumber} / {page.totalCount}件
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy || page.pageIndex >= page.pageCount - 1}
            onClick={() => onPageChange((current) => current + 1)}
            className="min-h-11 rounded-md px-2 text-white hover:bg-budget-space-mid hover:text-white"
          >
            次の星系
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}
    </>
  );
}

function getCoreLabel(view: StableView, fiscalYear: number | null): string {
  switch (view.kind) {
    case "overview":
      return fiscalYear === null
        ? "当初予算、世田谷区の予算"
        : `${formatJapaneseFiscalYear(fiscalYear)}当初予算、世田谷区の予算`;
    case "category":
      return `選択中の分野、${view.category.name}`;
    case "topic":
      return `選択中のテーマ、${view.topic.name}`;
  }
}

function getExplorationEmptyCopy(availability: BudgetExplorationAvailability): {
  title: string;
  description: string;
} {
  switch (availability) {
    case "no_active_dataset":
      return {
        title: "公開中の予算データはまだありません",
        description:
          "予算データの公開準備が整うまで、検索・公式予算分類も空の状態になります。",
      };
    case "temporarily_unavailable":
      return {
        title: "テーマデータを現在取得できません",
        description:
          "時間をおいて再度確認するか、検索または公式予算分類をお試しください。",
      };
    case "available":
      return {
        title: "この分野のテーマは整理中です",
        description:
          "人が確認したものだけを公開しています。架空のテーマでは埋めません。",
      };
  }
}

/**
 * dive で寄る先。中心から選択したノードの方向へ進んだ、球体の目的地側の縁。
 */
function getDiveFocus(
  scene: SceneModel,
  target: BudgetExplorerTransitionTarget | null
): { x: number; y: number } | null {
  if (!target) {
    return null;
  }
  const destination = findDestination(scene, target);
  if (!destination) {
    return null;
  }
  // 事業選択はノードそのものへ寄る。
  if (target.kind === "program") {
    return destination;
  }
  return getBudgetMapV2DiveFocus(scene.coreCenter, destination);
}

function findDestination(
  scene: SceneModel,
  target: BudgetExplorerTransitionTarget
): { x: number; y: number } | null {
  switch (target.kind) {
    case "category": {
      const node = scene.categories.find(
        (candidate) => candidate.slug === target.category.slug
      );
      return node ? { x: node.x, y: node.y } : null;
    }
    case "topic": {
      const node = scene.topics.find(
        (candidate) => candidate.slug === target.topic.slug
      );
      return node ? { x: node.x, y: node.y } : null;
    }
    case "program": {
      const node = scene.programs.find(
        (candidate) =>
          candidate.budgetProgramIdentityId === target.budgetProgramIdentityId
      );
      return node ? { x: node.x, y: node.y } : null;
    }
    case "overview":
      return null;
  }
}
