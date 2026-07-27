// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileDifficultySelector } from "./mobile-difficulty-selector";

const difficultySelectorMock = vi.hoisted(() => vi.fn());

vi.mock("./difficulty-selector", () => ({
  DifficultySelector: ({
    currentLevel,
    label,
  }: {
    currentLevel: string;
    label: string;
  }) => {
    difficultySelectorMock({ currentLevel, label });
    return <button type="button">{label}</button>;
  },
}));

describe("MobileDifficultySelector", () => {
  it("is available through 767px and passes the current level to the shared control", () => {
    const { container } = render(
      <MobileDifficultySelector currentLevel="hard" className="ml-auto" />
    );

    expect(container.firstElementChild).toHaveClass(
      "min-[768px]:hidden",
      "ml-auto"
    );
    expect(screen.getByRole("button", { name: "詳しく" })).toBeInTheDocument();
    expect(difficultySelectorMock).toHaveBeenCalledWith({
      currentLevel: "hard",
      label: "詳しく",
    });
  });
});
