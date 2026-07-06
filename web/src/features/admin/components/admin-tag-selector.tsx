"use client";

import { Fragment, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  MAJOR_CATEGORY_OPTIONS,
  type MajorCategoryLabel,
} from "@/features/bills/shared/types";

type TagOption = {
  id: string;
  label: string;
  major_category?: string | null;
};

interface AdminTagSelectorProps {
  tags: TagOption[];
  selectedTagIds: string[];
  defaultMajorCategory?: string | null;
}

const MAX_TAG_COUNT = 3;

function splitTagLabels(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((label) => label.trim())
        .filter(Boolean)
    )
  );
}

export function AdminTagSelector({
  tags,
  selectedTagIds,
  defaultMajorCategory,
}: AdminTagSelectorProps) {
  const initialCategory =
    MAJOR_CATEGORY_OPTIONS.find(
      (category) => category.label === defaultMajorCategory
    )?.label ?? MAJOR_CATEGORY_OPTIONS[0].label;
  const [activeCategory, setActiveCategory] =
    useState<MajorCategoryLabel>(initialCategory);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(selectedTagIds.slice(0, MAX_TAG_COUNT))
  );
  // 保存前に追加されたタグは、既存タグと同じ一覧で扱うため一時状態として保持する。
  const [pendingTags, setPendingTags] = useState<
    Array<{ label: string; majorCategory: MajorCategoryLabel }>
  >([]);
  const [newTagValue, setNewTagValue] = useState("");
  const [newTagError, setNewTagError] = useState<string | null>(null);

  const visibleTags = useMemo(
    () =>
      tags
        .filter((tag) => tag.major_category === activeCategory)
        .sort((a, b) => a.label.localeCompare(b.label, "ja")),
    [activeCategory, tags]
  );
  const selectedTags = useMemo(
    () =>
      tags
        .filter((tag) => selectedIds.has(tag.id))
        .sort((a, b) => a.label.localeCompare(b.label, "ja")),
    [selectedIds, tags]
  );
  const visiblePendingTags = useMemo(
    () =>
      pendingTags
        .filter((tag) => tag.majorCategory === activeCategory)
        .sort((a, b) => a.label.localeCompare(b.label, "ja")),
    [activeCategory, pendingTags]
  );
  const selectedCount = selectedIds.size + pendingTags.length;
  const remainingCount = Math.max(0, MAX_TAG_COUNT - selectedCount);
  const isAtLimit = selectedCount >= MAX_TAG_COUNT;
  const categoryTagCounts = useMemo(
    () =>
      new Map(
        MAJOR_CATEGORY_OPTIONS.map((category) => [
          category.label,
          tags.filter((tag) => tag.major_category === category.label).length +
            pendingTags.filter((tag) => tag.majorCategory === category.label)
              .length,
        ])
      ),
    [pendingTags, tags]
  );

  const selectedTagsByCategory = useMemo(() => {
    const counts = new Map<MajorCategoryLabel, number>();
    for (const tag of selectedTags) {
      const category = MAJOR_CATEGORY_OPTIONS.find(
        (option) => option.label === tag.major_category
      )?.label;
      if (!category) continue;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    for (const tag of pendingTags) {
      counts.set(tag.majorCategory, (counts.get(tag.majorCategory) ?? 0) + 1);
    }
    return counts;
  }, [pendingTags, selectedTags]);

  function toggleTag(tagId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(tagId)) {
        next.delete(tagId);
        return next;
      }
      if (next.size + pendingTags.length >= MAX_TAG_COUNT) {
        return next;
      }
      next.add(tagId);
      return next;
    });
  }

  function addPendingTags() {
    const labels = splitTagLabels(newTagValue);
    if (labels.length === 0 || isAtLimit) return;

    const existingLabels = new Set(tags.map((tag) => tag.label));
    const pendingLabels = new Set(pendingTags.map((tag) => tag.label));
    const duplicateLabel = labels.find(
      (label) => existingLabels.has(label) || pendingLabels.has(label)
    );
    if (duplicateLabel) {
      // 既存タグ名の再作成を防ぎ、管理者には上の小分類タグから選んでもらう。
      setNewTagError(
        `「${duplicateLabel}」はすでに小分類タグにあります。上の一覧から選択してください。`
      );
      return;
    }

    const nextSelectedIds = new Set(selectedIds);
    const nextPendingTags = [...pendingTags];

    for (const label of labels) {
      if (nextSelectedIds.size + nextPendingTags.length >= MAX_TAG_COUNT) {
        break;
      }

      nextPendingTags.push({ label, majorCategory: activeCategory });
    }

    setSelectedIds(nextSelectedIds);
    setPendingTags(nextPendingTags);
    setNewTagValue("");
    setNewTagError(null);
  }

  function removePendingTag(label: string, majorCategory: MajorCategoryLabel) {
    setPendingTags((current) =>
      current.filter(
        (tag) => !(tag.label === label && tag.majorCategory === majorCategory)
      )
    );
  }

  return (
    <section className="grid gap-5 rounded-xl border bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-bold">タグ設定</h2>
          <p className="mt-1 text-sm text-mirai-text-secondary">
            大分類を選んでから小分類タグを付けます。新しいタグもこの欄で追加できます。
          </p>
        </div>
        <div className="rounded-full border px-3 py-1 text-sm font-bold">
          {selectedCount}/{MAX_TAG_COUNT}
        </div>
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-bold">大分類</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MAJOR_CATEGORY_OPTIONS.map((category) => {
            const isActive = category.label === activeCategory;
            const categorySelectedCount =
              selectedTagsByCategory.get(category.label) ?? 0;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.label)}
                className={`shrink-0 rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                  isActive
                    ? "border-black bg-black text-white"
                    : "bg-white hover:bg-muted"
                }`}
              >
                {category.label}
                <span className="ml-1 text-xs opacity-75">
                  {categorySelectedCount > 0 ? `${categorySelectedCount}/` : ""}
                  {categoryTagCounts.get(category.label) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <input
          type="hidden"
          name="new_tag_major_category"
          value={activeCategory}
        />
        <p className="text-xs text-mirai-text-secondary">
          選択中の大分類: {activeCategory}
          。追加したタグは、この大分類の小分類タグとして一覧に入ります。
        </p>
      </div>

      {pendingTags.map((tag) => (
        <Fragment key={`${tag.majorCategory}-${tag.label}`}>
          <input type="hidden" name="new_tag_labels" value={tag.label} />
          <input
            type="hidden"
            name="new_tag_major_categories"
            value={tag.majorCategory}
          />
        </Fragment>
      ))}

      {selectedTags.length > 0 || pendingTags.length > 0 ? (
        <div className="grid gap-2 rounded-lg bg-mirai-surface-light p-3">
          <p className="text-xs font-bold text-mirai-text-secondary">
            この案件に付ける小分類タグ
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border bg-white px-3 py-1 text-xs font-bold"
              >
                {tag.label}
              </span>
            ))}
            {pendingTags.map((tag) => (
              <span
                key={`${tag.majorCategory}-${tag.label}`}
                className="rounded-full border bg-white px-3 py-1 text-xs font-bold"
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">小分類タグ</h3>
          <span className="text-xs font-bold text-mirai-text-secondary">
            あと{remainingCount}個
          </span>
        </div>
        {visibleTags.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {visibleTags.map((tag) => {
              const checked = selectedIds.has(tag.id);
              const disabled = !checked && isAtLimit;
              return (
                <label
                  key={tag.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-bold transition-colors ${
                    checked
                      ? "border-black bg-mirai-surface-light"
                      : "bg-white hover:bg-muted"
                  } ${disabled ? "opacity-45" : ""}`}
                >
                  <input
                    type="checkbox"
                    name="tag_ids"
                    value={tag.id}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleTag(tag.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>{tag.label}</span>
                </label>
              );
            })}
            {visiblePendingTags.map((tag) => (
              <label
                key={`${tag.majorCategory}-${tag.label}`}
                className="flex items-center gap-3 rounded-lg border border-dashed bg-mirai-surface-light px-3 py-3 text-sm font-bold transition-colors"
              >
                <input
                  type="checkbox"
                  checked
                  onChange={() =>
                    removePendingTag(tag.label, tag.majorCategory)
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span>{tag.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <>
            {visiblePendingTags.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {visiblePendingTags.map((tag) => (
                  <label
                    key={`${tag.majorCategory}-${tag.label}`}
                    className="flex items-center gap-3 rounded-lg border border-dashed bg-mirai-surface-light px-3 py-3 text-sm font-bold transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() =>
                        removePendingTag(tag.label, tag.majorCategory)
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    <span>{tag.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-white px-4 py-6 text-sm text-mirai-text-secondary">
                この大分類にはまだ小分類タグがありません。下の「新規タグを追加」から追加できます。
              </div>
            )}
          </>
        )}
        {isAtLimit && (
          <p className="mt-2 text-xs font-bold text-mirai-text-secondary">
            タグは最大3つまでです。別のタグを選ぶ場合は、先にチェックを外してください。
          </p>
        )}
      </div>

      <div className="grid gap-2 border-t pt-4">
        <label htmlFor="new-tag-labels" className="text-sm font-bold">
          新規タグを追加
        </label>
        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
          <Textarea
            id="new-tag-labels"
            value={newTagValue}
            onChange={(event) => {
              setNewTagValue(event.target.value);
              setNewTagError(null);
            }}
            rows={2}
            placeholder={"例: 教材費\n例: 学習環境"}
            className={
              newTagError
                ? "border-red-500 bg-red-50 focus-visible:ring-red-500"
                : ""
            }
          />
          <button
            type="button"
            onClick={addPendingTags}
            disabled={isAtLimit || splitTagLabels(newTagValue).length === 0}
            className="rounded-full border border-black bg-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-mirai-text disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted disabled:text-mirai-text-secondary"
          >
            追加
          </button>
        </div>
        {newTagError ? (
          <p className="text-xs font-bold text-red-600">{newTagError}</p>
        ) : null}
        <p className="text-xs text-mirai-text-secondary">
          {`追加すると上の小分類タグ一覧に入ります。保存時に「${activeCategory}」の小分類タグとして登録されます。`}
        </p>
      </div>
    </section>
  );
}
