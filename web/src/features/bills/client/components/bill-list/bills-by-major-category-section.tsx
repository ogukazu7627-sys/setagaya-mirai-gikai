"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { routes } from "@/lib/routes";
import type { BillsByMajorCategory } from "../../../shared/types";
import { MAJOR_CATEGORY_OPTIONS } from "../../../shared/types";
import { BillCard } from "./bill-card";

interface BillsByMajorCategorySectionProps {
  billsByMajorCategory: BillsByMajorCategory[];
  title?: string;
  description?: string;
}

const ALL_TAB = "すべて";

export function BillsByMajorCategorySection({
  billsByMajorCategory,
  title = "テーマから探す",
  description,
}: BillsByMajorCategorySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState(ALL_TAB);

  const visibleGroups = useMemo(() => {
    if (selectedCategory === ALL_TAB) {
      return billsByMajorCategory;
    }

    return billsByMajorCategory.filter(
      ({ category }) => category.label === selectedCategory
    );
  }, [billsByMajorCategory, selectedCategory]);

  if (billsByMajorCategory.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-[22px] font-bold text-black leading-[1.48]">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-mirai-text-secondary">{description}</p>
        )}
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            {[
              ALL_TAB,
              ...MAJOR_CATEGORY_OPTIONS.map((category) => category.label),
            ].map((label) => {
              const isSelected = selectedCategory === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedCategory(label)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-mirai-border bg-white text-mirai-text hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12">
        {visibleGroups.map(({ category, bills }) => (
          <section key={category.id} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[22px] font-bold text-black leading-[1.48]">
                {category.label}
              </h3>
              <p className="text-xs text-mirai-text-secondary">
                {category.description}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {bills.map((bill) => (
                <Link key={bill.id} href={routes.billDetail(bill.id) as Route}>
                  <BillCard bill={bill} />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
