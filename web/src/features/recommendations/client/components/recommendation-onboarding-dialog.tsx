"use client";

import { ArrowLeft, Check, ChevronRight } from "lucide-react";
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

type RecommendationOnboardingDialogProps = {
  open: boolean;
  required: boolean;
  availability: RecommendationAvailability;
  profile: StoredRecommendationProfile | null;
  onOpenChange: (open: boolean) => void;
  onComplete: (tags: RecommendationSmallTag[]) => Promise<void>;
};

export function RecommendationOnboardingDialog({
  open,
  required,
  availability,
  profile,
  onOpenChange,
  onComplete,
}: RecommendationOnboardingDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
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
    setStep(1);
    setSelectedCategoryIds(profile?.selectedParentCategoryIds ?? []);
    setSelectedTags(profile?.selectedSmallTags ?? []);
    setError(null);
  }, [open, profile]);

  const availableSelectedTags = useMemo(
    () =>
      RECOMMENDATION_CATEGORY_OPTIONS.filter((category) =>
        selectedCategoryIds.includes(category.id)
      ).flatMap((category) =>
        category.smallTags.filter((tag) => availability[tag] > 0)
      ),
    [availability, selectedCategoryIds]
  );
  const canContinue =
    selectedCategoryIds.length > 0 && new Set(availableSelectedTags).size >= 3;

  function toggleCategory(categoryId: RecommendationCategoryId) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }

  function goToTags() {
    if (!canContinue) {
      return;
    }
    const allowed = new Set(availableSelectedTags);
    setSelectedTags((current) => current.filter((tag) => allowed.has(tag)));
    setStep(2);
  }

  function toggleTag(tag: RecommendationSmallTag) {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, tag];
    });
  }

  async function complete() {
    if (selectedTags.length !== 3) {
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
        if (!required || nextOpen) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg sm:max-w-2xl"
        showCloseButton={!required}
        onEscapeKeyDown={(event) => {
          if (required) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (required) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {profile ? "興味分野を変更" : "興味のある分野を選ぶ"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "まず、気になる大分類を選んでください。複数選べます。"
              : `小分類を3つ選んでください（${selectedTags.length}/3）`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {RECOMMENDATION_CATEGORY_OPTIONS.map((category) => {
              const availableTagCount = category.smallTags.filter(
                (tag) => availability[tag] > 0
              ).length;
              const selected = selectedCategoryIds.includes(category.id);
              return (
                <Button
                  key={category.id}
                  type="button"
                  variant="outline"
                  aria-pressed={selected}
                  disabled={availableTagCount === 0}
                  onClick={() => toggleCategory(category.id)}
                  className={`h-auto min-h-24 whitespace-normal rounded-lg px-3 py-4 ${
                    selected
                      ? "border-primary bg-mirai-info-blue"
                      : "border-mirai-border"
                  }`}
                >
                  <span className="flex flex-col items-center gap-1">
                    <span aria-hidden="true" className="text-2xl">
                      {category.emoji}
                    </span>
                    <span>{category.name}</span>
                    <span className="text-xs font-normal text-mirai-text-secondary">
                      {availableTagCount > 0
                        ? `${availableTagCount}分野`
                        : "対象案件なし"}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <p className="sr-only" aria-live="polite">
              小分類を{selectedTags.length}件選択中です
            </p>
            {RECOMMENDATION_CATEGORY_OPTIONS.filter((category) =>
              selectedCategoryIds.includes(category.id)
            ).map((category) => (
              <section key={category.id} className="space-y-3">
                <h3 className="text-sm font-bold">
                  <span aria-hidden="true">{category.emoji}</span>{" "}
                  {category.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {category.smallTags.map((tag) => {
                    const selected = selectedTags.includes(tag);
                    const noCandidates = availability[tag] === 0;
                    const selectionFull = selectedTags.length >= 3 && !selected;
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
              </section>
            ))}
          </div>
        )}

        <p className="text-xs leading-relaxed text-mirai-text-secondary">
          選んだ興味分野とおすすめ履歴は、このブラウザを識別する匿名IDにひも付けて保存します。氏名やGoogleアカウントは使用せず、別の端末やブラウザには引き継がれません。
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={saving}
            >
              <ArrowLeft />
              大分類に戻る
            </Button>
          )}
          {step === 1 ? (
            <Button type="button" onClick={goToTags} disabled={!canContinue}>
              次へ
              <ChevronRight />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={complete}
              disabled={selectedTags.length !== 3 || saving}
            >
              {saving ? "保存中..." : "この3つで始める"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
