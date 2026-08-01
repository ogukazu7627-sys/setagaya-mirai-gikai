"use client";

import { BookOpen, LoaderCircle, RefreshCw, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type {
  BudgetExplorationData,
  BudgetExplorerView,
} from "../../shared/types/budget-exploration";
import { getBudgetMapStableView } from "../../shared/utils/budget-map-layout";
import {
  createBudgetMapHostMessage,
  parseBudgetMapMessage,
} from "../../shared/utils/budget-map-message";
import {
  BUDGET_MAP_DEFAULT_VARIANT,
  type BudgetMapVariant,
} from "../../shared/utils/budget-map-variant";

type BudgetMapIframeProps = {
  exploration: BudgetExplorationData;
  /** 描画層の切り替え。既定は v2、比較用に v1 を残している。 */
  variant?: BudgetMapVariant;
  view: BudgetExplorerView;
  onBack: () => void;
  onFocusSearch: () => void;
  onOpenOfficialHierarchy: () => void;
  onRefreshDataset: () => void;
  onSelectCategory: (slug: string) => void;
  onSelectProgram: (budgetProgramIdentityId: string) => void;
  onSelectTopic: (categorySlug: string, topicSlug: string) => void;
};

export const BUDGET_MAP_LOAD_TIMEOUT_MS = 10_000;

type BudgetMapFrameStatus = "loading" | "loaded" | "error" | "dataset-mismatch";

export function BudgetMapIframe({
  exploration,
  variant = BUDGET_MAP_DEFAULT_VARIANT,
  view,
  onBack,
  onFocusSearch,
  onOpenOfficialHierarchy,
  onRefreshDataset,
  onSelectCategory,
  onSelectProgram,
  onSelectTopic,
}: BudgetMapIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameAttempt, setFrameAttempt] = useState(0);
  const [frameStatus, setFrameStatus] =
    useState<BudgetMapFrameStatus>("loading");
  const activeDatasetId = exploration.activeDataset?.id ?? null;
  const previousDatasetIdRef = useRef(activeDatasetId);
  const isLoaded = frameStatus === "loaded";
  const stableView = getBudgetMapStableView(view);

  useLayoutEffect(() => {
    if (previousDatasetIdRef.current === activeDatasetId) {
      return;
    }
    previousDatasetIdRef.current = activeDatasetId;
    setFrameAttempt(0);
    setFrameStatus("loading");
  }, [activeDatasetId]);

  const syncView = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      createBudgetMapHostMessage(view, activeDatasetId),
      window.location.origin
    );
  }, [activeDatasetId, view]);

  useEffect(() => {
    syncView();
  }, [syncView]);

  useEffect(() => {
    if (frameStatus !== "loading") {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFrameStatus("error");
    }, BUDGET_MAP_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [frameStatus]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return;
      }
      const message = parseBudgetMapMessage(event.data);
      if (!message) {
        return;
      }
      if (message.activeDatasetId !== activeDatasetId) {
        setFrameStatus("dataset-mismatch");
        return;
      }

      switch (message.action) {
        case "ready":
          setFrameStatus("loaded");
          syncView();
          return;
        case "dataset-mismatch":
          setFrameStatus("dataset-mismatch");
          return;
        case "back":
          if (!isLoaded) {
            return;
          }
          onBack();
          return;
        case "focus-search":
          if (!isLoaded) {
            return;
          }
          onFocusSearch();
          return;
        case "open-official-hierarchy":
          if (!isLoaded) {
            return;
          }
          onOpenOfficialHierarchy();
          return;
        case "select-category":
          if (!isLoaded) {
            return;
          }
          if (
            exploration.categories.some(
              (category) => category.slug === message.categorySlug
            )
          ) {
            onSelectCategory(message.categorySlug);
          }
          return;
        case "select-topic": {
          if (!isLoaded) {
            return;
          }
          const category = exploration.categories.find(
            (candidate) => candidate.slug === message.categorySlug
          );
          if (
            category?.topics.some((topic) => topic.slug === message.topicSlug)
          ) {
            onSelectTopic(message.categorySlug, message.topicSlug);
          }
          return;
        }
        case "select-program":
          if (!isLoaded) {
            return;
          }
          if (
            exploration.categories.some((category) =>
              category.topics.some((topic) =>
                topic.programs.some(
                  (program) =>
                    program.budgetProgramIdentityId ===
                    message.budgetProgramIdentityId
                )
              )
            )
          ) {
            onSelectProgram(message.budgetProgramIdentityId);
          }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    exploration,
    activeDatasetId,
    isLoaded,
    onBack,
    onFocusSearch,
    onOpenOfficialHierarchy,
    onSelectCategory,
    onSelectProgram,
    onSelectTopic,
    syncView,
  ]);

  const handleLoad = () => {
    syncView();
  };

  const retryLoad = () => {
    setFrameStatus("loading");
    setFrameAttempt((current) => current + 1);
  };

  const hasFrameFailure =
    frameStatus === "error" || frameStatus === "dataset-mismatch";
  const datasetMismatch = frameStatus === "dataset-mismatch";

  return (
    <div
      className="budget-map-frame-shell overflow-hidden"
      aria-busy={frameStatus === "loading"}
      data-map-loaded={isLoaded}
      data-map-status={frameStatus}
    >
      <iframe
        key={`${activeDatasetId ?? "none"}:${frameAttempt}`}
        ref={iframeRef}
        src={routes.budgetMap(variant, activeDatasetId)}
        title="触れる予算の探索マップ"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="same-origin"
        data-explorer-state={view.kind}
        onLoad={handleLoad}
        onError={() => setFrameStatus("error")}
        tabIndex={isLoaded ? 0 : -1}
        className={cn(
          "budget-map-frame block w-full border-0",
          `budget-map-frame-${stableView.kind}`,
          !isLoaded && "budget-map-frame-loading"
        )}
      />
      {frameStatus === "loading" && (
        <div className="budget-map-loading-scrim absolute inset-0 z-20 flex items-center justify-center text-budget-space-copy">
          <div
            role="status"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-4 motion-safe:animate-spin"
            />
            予算宇宙を準備しています
          </div>
        </div>
      )}
      {hasFrameFailure && (
        <div className="budget-map-loading-scrim absolute inset-0 z-20 flex items-center justify-center px-5 text-budget-space-copy">
          <div role="alert" className="max-w-lg text-center">
            <p className="font-bold text-white">
              {datasetMismatch
                ? "予算データが更新されました"
                : "予算マップを読み込めませんでした"}
            </p>
            <p className="mt-2 text-sm leading-6">
              {datasetMismatch
                ? "親ページと予算マップのデータ版が異なるため、操作を停止しました。ページを更新してください。"
                : "再読み込みするか、予算検索・公式予算分類から同じ情報へ進めます。"}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={datasetMismatch ? onRefreshDataset : retryLoad}
                className="min-h-11 rounded-md"
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                {datasetMismatch ? "ページを更新" : "再読み込み"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onFocusSearch}
                className="min-h-11 rounded-md"
              >
                <Search aria-hidden="true" className="size-4" />
                予算検索
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenOfficialHierarchy}
                className="min-h-11 rounded-md"
              >
                <BookOpen aria-hidden="true" className="size-4" />
                公式分類から探す
              </Button>
            </div>
          </div>
        </div>
      )}
      <noscript>
        <div className="budget-map-loading-scrim absolute inset-0 z-30 flex items-center justify-center px-5 text-center text-budget-space-copy">
          <div>
            <p className="font-bold text-white">
              予算マップの表示にはJavaScriptが必要です
            </p>
            <p className="mt-2 text-sm">
              <a className="underline" href="#budget-search-title">
                予算検索
              </a>
              または
              <a className="underline" href={routes.budgetOfficialHierarchy()}>
                公式予算分類
              </a>
              を利用できます。
            </p>
          </div>
        </div>
      </noscript>
    </div>
  );
}
