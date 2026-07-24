// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  RECOMMENDATION_SMALL_TAGS,
  type RecommendationSmallTag,
} from "../../shared/constants/recommendation-taxonomy";
import type { RecommendationAvailability } from "../../shared/types/recommendation";
import { RecommendationOnboardingDialog } from "./recommendation-onboarding-dialog";

function availabilityWith(
  availableTags: RecommendationSmallTag[]
): RecommendationAvailability {
  return Object.fromEntries(
    RECOMMENDATION_SMALL_TAGS.map((tag) => [
      tag,
      availableTags.includes(tag) ? 1 : 0,
    ])
  ) as RecommendationAvailability;
}

describe("RecommendationOnboardingDialog", () => {
  it("requires a category with at least three available tags and exactly three selections", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(
      <RecommendationOnboardingDialog
        open
        required
        availability={availabilityWith([
          "不登校支援",
          "学校改築",
          "教育DX",
          "特別支援教育",
        ])}
        profile={null}
        onOpenChange={vi.fn()}
        onComplete={onComplete}
      />
    );

    const next = screen.getByRole("button", { name: "次へ" });
    expect(next).toBeDisabled();
    expect(screen.getByRole("button", { name: /産業/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /教育/ }));
    expect(next).toBeEnabled();
    await user.click(next);

    expect(screen.getByText("小分類を3つ選んでください（0/3）")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "不登校支援" }));
    await user.click(screen.getByRole("button", { name: "学校改築" }));
    await user.click(screen.getByRole("button", { name: "教育DX" }));
    expect(screen.getByRole("button", { name: "特別支援教育" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "この3つで始める" }));
    expect(onComplete).toHaveBeenCalledWith([
      "不登校支援",
      "学校改築",
      "教育DX",
    ]);
  });

  it("keeps the required initial dialog open when dismissal is requested", () => {
    const onOpenChange = vi.fn();
    render(
      <RecommendationOnboardingDialog
        open
        required
        availability={availabilityWith([])}
        profile={null}
        onOpenChange={onOpenChange}
        onComplete={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});
