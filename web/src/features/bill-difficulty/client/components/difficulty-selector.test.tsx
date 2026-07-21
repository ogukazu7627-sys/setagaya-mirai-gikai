// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
  setDifficultyLevel: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
    replace: mocks.replace,
  }),
}));

vi.mock("../../server/actions/set-difficulty-level", () => ({
  setDifficultyLevel: mocks.setDifficultyLevel,
}));

import { DifficultySelector } from "./difficulty-selector";

describe("DifficultySelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setDifficultyLevel.mockResolvedValue(undefined);
    window.history.replaceState(null, "", "/bills/bill-1");
  });

  it("難易度を保存したあと、ページ全体をリロードせず現在ページを更新する", async () => {
    const user = userEvent.setup();

    render(<DifficultySelector currentLevel="normal" />);

    await user.click(screen.getByRole("switch", { name: "難易度を切り替え" }));

    await waitFor(() => {
      expect(mocks.setDifficultyLevel).toHaveBeenCalledWith("hard");
    });
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("difficultyクエリがある場合はURLだけ整えてから現在ページを更新する", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      "",
      "/bills/bill-1?difficulty=hard&source=share#faq"
    );

    render(<DifficultySelector currentLevel="hard" />);

    await user.click(screen.getByRole("switch", { name: "難易度を切り替え" }));

    await waitFor(() => {
      expect(mocks.setDifficultyLevel).toHaveBeenCalledWith("normal");
    });
    expect(mocks.replace).toHaveBeenCalledWith(
      "/bills/bill-1?source=share#faq",
      { scroll: false }
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
