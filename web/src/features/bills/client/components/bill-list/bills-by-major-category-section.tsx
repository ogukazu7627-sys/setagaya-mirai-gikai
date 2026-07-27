"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RecommendationCategoryId } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import {
  getBrowserRecommendationStorage,
  RECOMMENDATION_PROFILE_STORAGE_KEY,
  RECOMMENDATION_PROFILE_UPDATED_EVENT,
  readRecommendationProfile,
} from "@/features/recommendations/client/utils/recommendation-storage";
import { routes } from "@/lib/routes";
import type {
  CouncilBillCardPage,
  CouncilThemeSectionData,
} from "../../../shared/types/council-bill-directory";
import { requestCouncilBillPage } from "../../utils/council-bill-page-api";
import { getBrowserCouncilSearchInstallationId } from "../../utils/council-ai-search-storage";
import { BillCard } from "./bill-card";

interface BillsByMajorCategorySectionProps {
  data: CouncilThemeSectionData;
  title?: string;
  description?: string;
  sectionId?: string;
}

type ThemePageStatus = "idle" | "loading" | "error";

export function BillsByMajorCategorySection({
  data,
  title = "テーマから探す",
  description,
  sectionId = "theme-bills",
}: BillsByMajorCategorySectionProps) {
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<RecommendationCategoryId | null>(data.initialCategoryId);
  const [page, setPage] = useState<CouncilBillCardPage>(data.initialPage);
  const [status, setStatus] = useState<ThemePageStatus>("idle");
  const requestControllerRef = useRef<AbortController | null>(null);
  const selectedCategoryIdRef = useRef<RecommendationCategoryId | null>(
    data.initialCategoryId
  );

  const loadPage = useCallback(
    async (categoryId: RecommendationCategoryId, requestedPage: number) => {
      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;
      selectedCategoryIdRef.current = categoryId;
      setSelectedCategoryId(categoryId);
      setStatus("loading");

      try {
        const response = await requestCouncilBillPage(
          {
            installationId: getBrowserCouncilSearchInstallationId(),
            mode: "theme",
            year: data.year,
            themeId: categoryId,
            page: requestedPage,
          },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setPage(response);
          setStatus("idle");
        }
      } catch (error) {
        if (
          !controller.signal.aborted &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setStatus("error");
        }
      }
    },
    [data.year]
  );

  useEffect(() => {
    requestControllerRef.current?.abort();
    selectedCategoryIdRef.current = data.initialCategoryId;
    setSelectedCategoryId(data.initialCategoryId);
    setPage(data.initialPage);
    setStatus("idle");
  }, [data]);

  useEffect(() => {
    function syncCategoryWithProfile() {
      const storage = getBrowserRecommendationStorage();
      const stored = storage ? readRecommendationProfile(storage) : null;
      const preferredCategoryIds =
        stored?.status === "valid"
          ? stored.profile.selectedParentCategoryIds
          : [];
      const availableCategoryIds = new Set(
        data.categories.map(({ category }) => category.id)
      );
      const nextCategoryId =
        preferredCategoryIds.find((id) => availableCategoryIds.has(id)) ??
        data.initialCategoryId;

      if (nextCategoryId && nextCategoryId !== selectedCategoryIdRef.current) {
        void loadPage(nextCategoryId, 1);
      }
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === null ||
        event.key === RECOMMENDATION_PROFILE_STORAGE_KEY
      ) {
        syncCategoryWithProfile();
      }
    }

    syncCategoryWithProfile();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      RECOMMENDATION_PROFILE_UPDATED_EVENT,
      syncCategoryWithProfile
    );

    return () => {
      requestControllerRef.current?.abort();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        RECOMMENDATION_PROFILE_UPDATED_EVENT,
        syncCategoryWithProfile
      );
    };
  }, [data.categories, data.initialCategoryId, loadPage]);

  const selectedCategory =
    data.categories.find(({ category }) => category.id === selectedCategoryId)
      ?.category ?? data.categories[0]?.category;

  if (!selectedCategory) {
    return null;
  }

  return (
    <section id={sectionId} className="scroll-mt-20 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-[22px] font-bold text-black leading-[1.48]">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-mirai-text-secondary">{description}</p>
        )}
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            {data.categories.map(({ category }) => {
              const isSelected = selectedCategory.id === category.id;
              return (
                <Button
                  key={category.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-pressed={isSelected}
                  disabled={status === "loading" && isSelected}
                  onClick={() => void loadPage(category.id, 1)}
                  className={`h-auto whitespace-nowrap px-4 py-2 shadow-none ${
                    isSelected
                      ? "border-primary bg-primary text-white hover:bg-primary hover:text-white"
                      : "border-mirai-border bg-white text-mirai-text hover:bg-gray-50"
                  }`}
                >
                  {category.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12">
        <section key={selectedCategory.id} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[22px] font-bold text-black leading-[1.48]">
              {selectedCategory.label}
            </h3>
            <p className="text-xs text-mirai-text-secondary">
              {selectedCategory.description}
            </p>
          </div>

          {status === "loading" ? (
            <ThemeBillsSkeleton />
          ) : status === "error" ? (
            <div
              role="alert"
              className="border-y border-mirai-border py-10 text-center"
            >
              <p className="font-bold text-mirai-text">
                案件を読み込めませんでした
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  selectedCategoryId &&
                  void loadPage(selectedCategoryId, page.currentPage)
                }
                className="mt-4 border-mirai-border shadow-none"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                もう一度試す
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {page.bills.map((bill) => (
                <Link
                  key={bill.id}
                  href={routes.billDetail(bill.id) as Route}
                  prefetch={false}
                >
                  <BillCard bill={bill} />
                </Link>
              ))}
            </div>
          )}

          {status === "idle" && page.totalPages > 1 && (
            <nav
              aria-label={`${selectedCategory.name}の案件ページ`}
              className="flex items-center justify-center gap-4"
            >
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="前のページ"
                disabled={page.currentPage === 1}
                onClick={() =>
                  selectedCategoryId &&
                  void loadPage(selectedCategoryId, page.currentPage - 1)
                }
                className="border-mirai-border shadow-none"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span
                className="min-w-14 text-center text-sm font-bold text-mirai-text"
                aria-live="polite"
              >
                {page.currentPage} / {page.totalPages}
              </span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="次のページ"
                disabled={page.currentPage === page.totalPages}
                onClick={() =>
                  selectedCategoryId &&
                  void loadPage(selectedCategoryId, page.currentPage + 1)
                }
                className="border-mirai-border shadow-none"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </section>
      </div>
    </section>
  );
}

function ThemeBillsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">案件を読み込み中</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={`theme-bill-skeleton-${index + 1}`}
          className="min-h-56 animate-pulse rounded-lg border border-mirai-border bg-white p-6"
        >
          <div className="h-6 w-20 rounded bg-mirai-surface-gray" />
          <div className="mt-5 h-7 w-4/5 rounded bg-mirai-surface-gray" />
          <div className="mt-5 h-4 w-2/5 rounded bg-mirai-surface-gray" />
          <div className="mt-7 h-4 w-full rounded bg-mirai-surface-gray" />
        </div>
      ))}
    </div>
  );
}
