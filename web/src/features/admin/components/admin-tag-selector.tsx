"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

type TagOption = {
  id: string;
  label: string;
  major_category?: string | null;
};

interface AdminTagSelectorProps {
  tags: TagOption[];
  selectedTagIds: string[];
}

const MAX_TAG_COUNT = 3;

function splitTagLabels(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n、]/)
        .map((label) => label.trim())
        .filter(Boolean)
    )
  );
}

export function AdminTagSelector({
  tags,
  selectedTagIds,
}: AdminTagSelectorProps) {
  const defaultValue = useMemo(() => {
    const selectedIds = new Set(selectedTagIds);
    return tags
      .filter((tag) => selectedIds.has(tag.id))
      .map((tag) => tag.label)
      .sort((a, b) => a.localeCompare(b, "ja"))
      .join("\n");
  }, [selectedTagIds, tags]);
  const [tagInputValue, setTagInputValue] = useState(defaultValue);
  const tagLabels = splitTagLabels(tagInputValue);
  const hasTooManyTags = tagLabels.length > MAX_TAG_COUNT;

  return (
    <section className="grid gap-4 rounded-xl border bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-bold">タグ設定</h2>
          <p className="mt-1 text-sm text-mirai-text-secondary">
            小分類タグは毎回入力します。保存時に同じ名前のタグがあれば再利用し、なければ内部で作成します。
          </p>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-sm font-bold ${
            hasTooManyTags
              ? "border-red-500 bg-red-50 text-red-700"
              : "bg-white"
          }`}
        >
          {tagLabels.length}/{MAX_TAG_COUNT}
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="small-tag-labels" className="text-sm font-bold">
          小分類タグ
        </label>
        <Textarea
          id="small-tag-labels"
          value={tagInputValue}
          onChange={(event) => setTagInputValue(event.target.value)}
          rows={3}
          placeholder={"例: 教材費\n例: 学習環境"}
          className={
            hasTooManyTags
              ? "border-red-500 bg-red-50 focus-visible:ring-red-500"
              : ""
          }
        />
        <p className="text-xs text-mirai-text-secondary">
          改行・カンマ・読点で区切れます。タグは最大3つまでです。
        </p>
        {hasTooManyTags ? (
          <p className="text-xs font-bold text-red-600">
            タグは最大3つまでです。数を減らしてから保存してください。
          </p>
        ) : null}
      </div>

      {tagLabels.length > 0 ? (
        <div className="grid gap-2 rounded-lg bg-mirai-surface-light p-3">
          <p className="text-xs font-bold text-mirai-text-secondary">
            保存される小分類タグ
          </p>
          <div className="flex flex-wrap gap-2">
            {tagLabels.map((label) => (
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
          小分類タグを付けない場合は空欄のまま保存できます。
        </div>
      )}

      {tagLabels.map((label) => (
        <input key={label} type="hidden" name="new_tag_labels" value={label} />
      ))}
    </section>
  );
}
