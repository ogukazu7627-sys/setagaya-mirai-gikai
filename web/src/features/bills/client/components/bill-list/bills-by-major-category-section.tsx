"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getBrowserRecommendationStorage,
  RECOMMENDATION_PROFILE_STORAGE_KEY,
  RECOMMENDATION_PROFILE_UPDATED_EVENT,
  readRecommendationProfile,
} from "@/features/recommendations/client/utils/recommendation-storage";
import { routes } from "@/lib/routes";
import type { BillsByMajorCategory } from "../../../shared/types";
import {
  paginateThemeBills,
  resolveInitialThemeCategoryId,
} from "../../../shared/utils/theme-bills";
import { BillCard } from "./bill-card";

interface BillsByMajorCategorySectionProps {
  billsByMajorCategory: BillsByMajorCategory[];
  title?: string;
  description?: string;
  sectionId?: string;
}

export function BillsByMajorCategorySection({
  billsByMajorCategory,
  title = "テーマから探す",
  description,
  sectionId = "theme-bills",
}: BillsByMajorCategorySectionProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    () => resolveInitialThemeCategoryId(billsByMajorCategory, [])
  );
  const [requestedPage, setRequestedPage] = useState(1);

  useEffect(() => {
    function syncCategoryWithProfile() {
      const storage = getBrowserRecommendationStorage();
      const stored = storage ? readRecommendationProfile(storage) : null;
      const preferredCategoryIds =
        stored?.status === "valid"
          ? stored.profile.selectedParentCategoryIds
          : [];
      const nextCategoryId = resolveInitialThemeCategoryId(
        billsByMajorCategory,
        preferredCategoryIds
      );

      setSelectedCategoryId(nextCategoryId);
      setRequestedPage(1);
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
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        RECOMMENDATION_PROFILE_UPDATED_EVENT,
        syncCategoryWithProfile
      );
    };
  }, [billsByMajorCategory]);

  const selectedGroup = useMemo(
    () =>
      billsByMajorCategory.find(
        ({ category }) => category.id === selectedCategoryId
      ) ?? billsByMajorCategory[0],
    [billsByMajorCategory, selectedCategoryId]
  );
  const page = useMemo(
    () => paginateThemeBills(selectedGroup?.bills ?? [], requestedPage),
    [requestedPage, selectedGroup]
  );

  if (billsByMajorCategory.length === 0) {
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
            {billsByMajorCategory.map(({ category }) => {
              const isSelected = selectedGroup?.category.id === category.id;
              return (
                <Button
                  key={category.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setRequestedPage(1);
                  }}
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

      {selectedGroup && (
        <div className="flex flex-col gap-12">
          <section
            key={selectedGroup.category.id}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[22px] font-bold text-black leading-[1.48]">
                {selectedGroup.category.label}
              </h3>
              <p className="text-xs text-mirai-text-secondary">
                {selectedGroup.category.description}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {page.bills.map((bill) => (
                <Link key={bill.id} href={routes.billDetail(bill.id) as Route}>
                  <BillCard bill={bill} />
                </Link>
              ))}
            </div>

            {page.totalPages > 1 && (
              <nav
                aria-label={`${selectedGroup.category.name}の案件ページ`}
                className="flex items-center justify-center gap-4"
              >
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="前のページ"
                  disabled={page.currentPage === 1}
                  onClick={() =>
                    setRequestedPage((current) => Math.max(1, current - 1))
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
                    setRequestedPage((current) =>
                      Math.min(page.totalPages, current + 1)
                    )
                  }
                  className="border-mirai-border shadow-none"
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </nav>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
