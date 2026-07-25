// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECOMMENDATION_PROFILE_STORAGE_KEY,
  RECOMMENDATION_PROFILE_UPDATED_EVENT,
} from "@/features/recommendations/client/utils/recommendation-storage";
import type {
  BillsByMajorCategory,
  BillWithContent,
} from "../../../shared/types";
import { MAJOR_CATEGORY_OPTIONS } from "../../../shared/types";
import { BillsByMajorCategorySection } from "./bills-by-major-category-section";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("./bill-card", () => ({
  BillCard: ({ bill }: { bill: BillWithContent }) => (
    <div data-testid="bill-card">{bill.name}</div>
  ),
}));

function createBill(name: string): BillWithContent {
  return {
    id: name,
    name,
    bill_content: null,
  } as unknown as BillWithContent;
}

function createGroup(
  categoryId: (typeof MAJOR_CATEGORY_OPTIONS)[number]["id"],
  billCount: number
): BillsByMajorCategory {
  const category = MAJOR_CATEGORY_OPTIONS.find(
    (option) => option.id === categoryId
  );
  if (!category) {
    throw new Error(`Unknown category: ${categoryId}`);
  }

  return {
    category,
    bills: Array.from({ length: billCount }, (_, index) =>
      createBill(`${categoryId}-${index + 1}`)
    ),
  };
}

const groups = [
  createGroup("education", 12),
  createGroup("disaster-prevention", 2),
];

const storedProfile = {
  installationId: "11111111-1111-4111-8111-111111111111",
  selectedParentCategoryIds: ["disaster-prevention", "education"],
  selectedSmallTags: ["防災情報", "不登校支援", "学校改築"],
  completedAt: "2026-07-25T00:00:00.000Z",
  preferenceVersion: 1,
};

describe("BillsByMajorCategorySection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("removes the all tab and selects the first saved category", async () => {
    window.localStorage.setItem(
      RECOMMENDATION_PROFILE_STORAGE_KEY,
      JSON.stringify(storedProfile)
    );

    render(<BillsByMajorCategorySection billsByMajorCategory={groups} />);

    expect(
      screen.queryByRole("button", { name: "すべて" })
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "防災☔" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    expect(screen.getAllByTestId("bill-card")).toHaveLength(2);
    expect(screen.getByText("disaster-prevention-1")).toBeInTheDocument();
  });

  it("shows at most ten bills and moves through pages", async () => {
    const user = userEvent.setup();
    render(<BillsByMajorCategorySection billsByMajorCategory={groups} />);

    expect(screen.getAllByTestId("bill-card")).toHaveLength(10);
    expect(screen.getByText("education-10")).toBeInTheDocument();
    expect(screen.queryByText("education-11")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次のページ" }));

    expect(screen.getAllByTestId("bill-card")).toHaveLength(2);
    expect(screen.getByText("education-11")).toBeInTheDocument();
    expect(screen.getByText("education-12")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("returns to the first page when the category changes", async () => {
    const user = userEvent.setup();
    render(<BillsByMajorCategorySection billsByMajorCategory={groups} />);

    await user.click(screen.getByRole("button", { name: "次のページ" }));
    expect(screen.getByText("education-11")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "防災☔" }));
    await user.click(screen.getByRole("button", { name: "教育🏫" }));

    expect(screen.getByText("education-1")).toBeInTheDocument();
    expect(screen.queryByText("education-11")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("updates the selected category after onboarding in the same tab", async () => {
    render(<BillsByMajorCategorySection billsByMajorCategory={groups} />);
    expect(screen.getByRole("button", { name: "教育🏫" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    window.localStorage.setItem(
      RECOMMENDATION_PROFILE_STORAGE_KEY,
      JSON.stringify(storedProfile)
    );
    act(() => {
      window.dispatchEvent(new Event(RECOMMENDATION_PROFILE_UPDATED_EVENT));
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "防災☔" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
  });
});
