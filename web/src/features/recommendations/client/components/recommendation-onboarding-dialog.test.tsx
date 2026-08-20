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

/** 大分類の見出しボタンは小分類名（例「教育DX」）と紛れるため aria-controls で特定する。 */
function categoryHeader(categoryId: string): HTMLButtonElement {
  const header = document.querySelector<HTMLButtonElement>(
    `[aria-controls="recommendation-category-${categoryId}"]`
  );
  if (!header) {
    throw new Error(`category header not found: ${categoryId}`);
  }
  return header;
}

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
  it("expands small tags in place and requires at least three selections", async () => {
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
        onDismiss={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "この0つで始める" })
    ).toBeDisabled();
    expect(categoryHeader("industry")).toBeDisabled();
    // 大分類を開くまで小分類は出さない。
    expect(screen.queryByRole("button", { name: "不登校支援" })).toBeNull();

    const educationHeader = categoryHeader("education");
    await user.click(educationHeader);
    // 同じ画面のまま小分類が開く（別ステップへ遷移しない）。
    expect(educationHeader).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "不登校支援" }));
    await user.click(screen.getByRole("button", { name: "学校改築" }));
    expect(
      screen.getByRole("button", { name: "この2つで始める" })
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "教育DX" }));
    expect(
      screen.getByRole("button", { name: "この3つで始める" })
    ).toBeEnabled();

    // 3件を超えても選べる（上限で無効化しない）。
    await user.click(screen.getByRole("button", { name: "特別支援教育" }));
    const complete = screen.getByRole("button", { name: "この4つで始める" });
    expect(complete).toBeEnabled();

    await user.click(complete);
    expect(onComplete).toHaveBeenCalledWith([
      "不登校支援",
      "学校改築",
      "教育DX",
      "特別支援教育",
    ]);
  });

  it("shows the chosen small tags on the collapsed category header", async () => {
    const user = userEvent.setup();
    render(
      <RecommendationOnboardingDialog
        open
        required
        availability={availabilityWith(["不登校支援", "学校改築", "教育DX"])}
        profile={null}
        onOpenChange={vi.fn()}
        onComplete={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    const educationHeader = categoryHeader("education");
    await user.click(educationHeader);
    await user.click(screen.getByRole("button", { name: "不登校支援" }));
    await user.click(screen.getByRole("button", { name: "教育DX" }));

    // 件数ではなく、選んだ分野名そのものを見出しに出す。
    expect(educationHeader).toHaveTextContent("不登校支援");
    expect(educationHeader).toHaveTextContent("教育DX");
    expect(educationHeader).not.toHaveTextContent("件選択中");

    // 閉じても見出しに残るので、開かずに選択内容が分かる。
    await user.click(educationHeader);
    expect(educationHeader).toHaveAttribute("aria-expanded", "false");
    expect(educationHeader).toHaveTextContent("不登校支援");
  });

  it("lets the first-time visitor dismiss the dialog without choosing interests", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onDismiss = vi.fn();
    render(
      <RecommendationOnboardingDialog
        open
        required
        availability={availabilityWith([])}
        profile={null}
        onOpenChange={onOpenChange}
        onComplete={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not report a dismissal when the dialog is reopened from settings", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onDismiss = vi.fn();
    render(
      <RecommendationOnboardingDialog
        open
        required={false}
        availability={availabilityWith(["不登校支援"])}
        profile={null}
        onOpenChange={onOpenChange}
        onComplete={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    expect(screen.queryByRole("button", { name: "今は選ばない" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
