"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RecommendationOnboardingDialog } from "@/features/recommendations/client/components/recommendation-onboarding-dialog";
import {
  RECOMMENDATION_SMALL_TAGS,
  type RecommendationSmallTag,
} from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { RecommendationAvailability } from "@/features/recommendations/shared/types/recommendation";
import { ComponentShowcase } from "../../../_components/component-showcase";
import { PreviewSection } from "../../../_components/preview-section";

const AVAILABILITY = Object.fromEntries(
  RECOMMENDATION_SMALL_TAGS.map((tag: RecommendationSmallTag) => [tag, 3])
) as RecommendationAvailability;

export default function RecommendationOnboardingDialogPreview() {
  const [requiredOpen, setRequiredOpen] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>("（未操作）");

  return (
    <>
      <h1 className="text-3xl font-bold text-mirai-text mb-8">
        RecommendationOnboardingDialog
      </h1>

      <ComponentShowcase
        title="初回訪問（required）"
        description="1画面で大分類を開いて小分類を3つ選ぶ。×と「今は選ばない」で閉じられる。"
      >
        <PreviewSection label="required=true">
          <Button onClick={() => setRequiredOpen(true)}>モーダルを開く</Button>
          <p className="mt-2 text-sm text-mirai-text-secondary">
            最後のイベント: {lastEvent}
          </p>
          <RecommendationOnboardingDialog
            open={requiredOpen}
            required
            availability={AVAILABILITY}
            profile={null}
            onOpenChange={setRequiredOpen}
            onComplete={async (tags) => {
              setLastEvent(`onComplete: ${tags.join("、")}`);
              setRequiredOpen(false);
            }}
            onDismiss={() => setLastEvent("onDismiss（ランダム表示へ）")}
          />
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase
        title="設定から変更（required=false）"
        description="「今は選ばない」は出さず、閉じても onDismiss を呼ばない。"
      >
        <PreviewSection label="required=false">
          <Button onClick={() => setOptionalOpen(true)}>モーダルを開く</Button>
          <RecommendationOnboardingDialog
            open={optionalOpen}
            required={false}
            availability={AVAILABILITY}
            profile={null}
            onOpenChange={setOptionalOpen}
            onComplete={async (tags) => {
              setLastEvent(`onComplete: ${tags.join("、")}`);
              setOptionalOpen(false);
            }}
            onDismiss={() => setLastEvent("onDismiss（呼ばれないはず）")}
          />
        </PreviewSection>
      </ComponentShowcase>
    </>
  );
}
