"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MajorCategoryLabel } from "@/features/bills/shared/types";
import {
  getAdminFixedTagGroups,
  isAllowedAdminTagLabel,
  MAX_ADMIN_TAG_COUNT,
} from "../shared/fixed-admin-tags";

type TagOption = {
  id: string;
  label: string;
  major_category?: string | null;
};

interface AdminTagSelectorProps {
  tags: TagOption[];
  selectedTagIds: string[];
  majorCategory: MajorCategoryLabel;
}

export function AdminTagSelector({
  tags,
  selectedTagIds,
  majorCategory,
}: AdminTagSelectorProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [currentMajorCategory, setCurrentMajorCategory] =
    useState<MajorCategoryLabel>(majorCategory);
  const defaultSelectedLabels = useMemo(() => {
    const selectedIds = new Set(selectedTagIds);
    return tags
      .filter((tag) => selectedIds.has(tag.id))
      .map((tag) => tag.label)
      .filter((label) => isAllowedAdminTagLabel(label, majorCategory))
      .sort((a, b) => a.localeCompare(b, "ja"));
  }, [majorCategory, selectedTagIds, tags]);
  const [selectedLabels, setSelectedLabels] = useState(defaultSelectedLabels);
  const tagGroups = getAdminFixedTagGroups(currentMajorCategory);
  const allowedLabels = new Set(
    tagGroups.flatMap((group) => Array.from(group.tagLabels))
  );
  const visibleSelectedLabels = selectedLabels.filter((label) =>
    allowedLabels.has(label)
  );
  const hasTooManyTags = visibleSelectedLabels.length > MAX_ADMIN_TAG_COUNT;
  const isSelectionDisabled =
    visibleSelectedLabels.length >= MAX_ADMIN_TAG_COUNT;

  useEffect(() => {
    const form = sectionRef.current?.closest("form");
    const majorCategorySelect = form?.querySelector<HTMLSelectElement>(
      'select[name="major_category"]'
    );
    if (!majorCategorySelect) return;

    const syncMajorCategory = () => {
      setCurrentMajorCategory(majorCategorySelect.value as MajorCategoryLabel);
    };

    syncMajorCategory();
    majorCategorySelect.addEventListener("change", syncMajorCategory);
    return () => {
      majorCategorySelect.removeEventListener("change", syncMajorCategory);
    };
  }, []);

  function toggleLabel(label: string) {
    setSelectedLabels((current) => {
      if (current.includes(label)) {
        return current.filter((selectedLabel) => selectedLabel !== label);
      }
      return [...current, label];
    });
  }

  return (
    <section
      ref={sectionRef}
      className="grid gap-4 rounded-xl border bg-white p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-bold">タグ設定</h2>
          <p className="mt-1 text-sm text-mirai-text-secondary">
            小分類タグは固定候補から選びます。地域タグは大分類とは別に選択できます。
          </p>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-sm font-bold ${
            hasTooManyTags
              ? "border-red-500 bg-red-50 text-red-700"
              : "bg-white"
          }`}
        >
          {visibleSelectedLabels.length}/{MAX_ADMIN_TAG_COUNT}
        </div>
      </div>

      <div className="grid gap-4">
        {tagGroups.map((group) => (
          <fieldset key={group.label} className="grid gap-2">
            <legend className="text-sm font-bold">{group.label}</legend>
            <div className="flex flex-wrap gap-2">
              {group.tagLabels.map((label) => {
                const checked = visibleSelectedLabels.includes(label);
                return (
                  <label
                    key={label}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold ${
                      checked
                        ? "border-primary-accent bg-primary-accent/10 text-primary"
                        : "bg-white"
                    } ${
                      !checked && isSelectionDisabled
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && isSelectionDisabled}
                      onChange={() => toggleLabel(label)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
        <p className="text-xs text-mirai-text-secondary">
          タグは最大3つまでです。大分類を変更すると選べる小分類タグも切り替わります。
        </p>
        {hasTooManyTags ? (
          <p className="text-xs font-bold text-red-600">
            タグは最大3つまでです。数を減らしてから保存してください。
          </p>
        ) : null}
      </div>

      {visibleSelectedLabels.length > 0 ? (
        <div className="grid gap-2 rounded-lg bg-mirai-surface-light p-3">
          <p className="text-xs font-bold text-mirai-text-secondary">
            保存される小分類タグ
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleSelectedLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border bg-white px-3 py-1 text-xs font-bold"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-white px-4 py-5 text-sm text-mirai-text-secondary">
          小分類タグを付けない場合は未選択のまま保存できます。
        </div>
      )}

      {visibleSelectedLabels.map((label) => (
        <input key={label} type="hidden" name="new_tag_labels" value={label} />
      ))}
    </section>
  );
}
