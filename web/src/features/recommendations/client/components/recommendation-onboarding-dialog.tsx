"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RECOMMENDATION_CATEGORY_OPTIONS,
  type RecommendationCategoryId,
  type RecommendationSmallTag,
} from "../../shared/constants/recommendation-taxonomy";
import type {
  RecommendationAvailability,
  StoredRecommendationProfile,
} from "../../shared/types/recommendation";

export const REQUIRED_SMALL_TAG_COUNT = 3;

type RecommendationOnboardingDialogProps = {
  open: boolean;
  required: boolean;
  availability: RecommendationAvailability;
  profile: StoredRecommendationProfile | null;
  onOpenChange: (open: boolean) => void;
  onComplete: (tags: RecommendationSmallTag[]) => Promise<void>;
  /** 興味分野を設定せずに閉じたとき（初回のみ）に呼ばれる。 */
  onDismiss: () => void;
};

export function RecommendationOnboardingDialog({
  open,
  required,
  availability,
  profile,
  onOpenChange,
  onComplete,
  onDismiss,
}: RecommendationOnboardingDialogProps) {
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<
    RecommendationCategoryId[]
  >([]);
  const [selectedTags, setSelectedTags] = useState<RecommendationSmallTag[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setExpandedCategoryIds(profile?.selectedParentCategoryIds ?? []);
    setSelectedTags(profile?.selectedSmallTags ?? []);
    setError(null);
  }, [open, profile]);

  const availableTagCountByCategory = useMemo(
    () =>
      new Map(
        RECOMMENDATION_CATEGORY_OPTIONS.map((category) => [
          category.id,
          category.smallTags.filter((tag) => availability[tag] > 0).length,
        ])
      ),
    [availability]
  );

  const canComplete = selectedTags.length === REQUIRED_SMALL_TAG_COUNT;

  function toggleCategory(categoryId: RecommendationCategoryId) {
    setExpandedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }

  function toggleTag(tag: RecommendationSmallTag) {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }
      if (current.length >= REQUIRED_SMALL_TAG_COUNT) {
        return current;
      }
      return [...current, tag];
    });
  }

  function requestClose() {
    onOpenChange(false);
    if (required) {
      onDismiss();
    }
  }

  async function complete() {
    if (!canComplete) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onComplete(selectedTags);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "興味分野を保存できませんでした"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        requestClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {profile ? "興味分野を変更" : "興味のある分野を選ぶ"}
          </DialogTitle>
          <DialogDescription>
            気になる大分類を押すと小分類が開きます。小分類を
            {REQUIRED_SMALL_TAG_COUNT}つ選んでください（{selectedTags.length}/
            {REQUIRED_SMALL_TAG_COUNT}）
          </DialogDescription>
        </DialogHeader>

        <p className="sr-only" aria-live="polite">
          小分類を{selectedTags.length}件選択中です
        </p>

        <div className="space-y-2">
          {RECOMMENDATION_CATEGORY_OPTIONS.map((category) => {
            const availableTagCount =
              availableTagCountByCategory.get(category.id) ?? 0;
            const expanded = expandedCategoryIds.includes(category.id);
            const selectedCount = category.smallTags.filter((tag) =>
              selectedTags.includes(tag)
            ).length;
            const panelId = `recommendation-category-${category.id}`;
            return (
              <div
                key={category.id}
                className="overflow-hidden rounded-lg border border-mirai-border"
              >
                <button
                  type="button"
                  aria-controls={panelId}
                  aria-expanded={expanded}
                  disabled={availableTagCount === 0}
                  onClick={() => toggleCategory(category.id)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left font-bold text-mirai-text disabled:text-mirai-text-muted"
                >
                  <span aria-hidden="true" className="text-xl">
                    {category.emoji}
                  </span>
                  <span className="flex-1">{category.name}</span>
                  {selectedCount > 0 && (
                    <span className="rounded-full bg-mirai-info-blue px-2 py-0.5 text-xs font-bold text-primary">
                      {selectedCount}件選択中
                    </span>
                  )}
                  <span className="text-xs font-normal text-mirai-text-secondary">
                    {availableTagCount > 0
                      ? `${availableTagCount}分野`
                      : "対象案件なし"}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 shrink-0 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expanded && availableTagCount > 0 && (
                  <div
                    id={panelId}
                    className="flex flex-wrap gap-2 border-t border-mirai-border px-4 py-3"
                  >
                    {category.smallTags.map((tag) => {
                      const selected = selectedTags.includes(tag);
                      const noCandidates = availability[tag] === 0;
                      const selectionFull =
                        selectedTags.length >= REQUIRED_SMALL_TAG_COUNT &&
                        !selected;
                      return (
                        <Button
                          key={tag}
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-pressed={selected}
                          disabled={noCandidates || selectionFull}
                          onClick={() => toggleTag(tag)}
                          className={`h-auto min-h-10 whitespace-normal rounded-full ${
                            selected
                              ? "border-primary bg-mirai-info-blue"
                              : "border-mirai-border"
                          }`}
                        >
                          {selected && <Check aria-hidden="true" />}
                          {tag}
                          {noCandidates && (
                            <span className="text-xs font-normal">
                              （対象案件なし）
                            </span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-mirai-text-secondary">
          選んだ興味分野とおすすめ履歴は、このブラウザを識別する匿名IDにひも付けて保存します。氏名やGoogleアカウントは使用せず、別の端末やブラウザには引き継がれません。
        </p>
        {required && (
          <p className="text-xs leading-relaxed text-mirai-text-secondary">
            閉じると、興味分野を使わないおすすめをランダムに表示します。設定はあとからでも変更できます。
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          {required && (
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={saving}
            >
              今は選ばない
            </Button>
          )}
          <Button
            type="button"
            onClick={complete}
            disabled={!canComplete || saving}
          >
            {saving ? "保存中..." : `この${REQUIRED_SMALL_TAG_COUNT}つで始める`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
