// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeComponentState } from "@/features/public-view-state/client/utils/public-view-state-storage";
import {
  RECOMMENDATION_PROFILE_STORAGE_KEY,
  RECOMMENDATION_PROFILE_UPDATED_EVENT,
} from "@/features/recommendations/client/utils/recommendation-storage";
import { RECOMMENDATION_CATEGORY_OPTIONS } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { BillCardData } from "../../../shared/types";
import type { CouncilThemeSectionData } from "../../../shared/types/council-bill-directory";
import { requestCouncilBillPage } from "../../utils/council-bill-page-api";
import { BillsByMajorCategorySection } from "./bills-by-major-category-section";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("./bill-card", () => ({
  BillCard: ({ bill }: { bill: BillCardData }) => (
    <div data-testid="bill-card">{bill.name}</div>
  ),
}));
vi.mock("../../utils/council-bill-page-api", () => ({
  requestCouncilBillPage: vi.fn(),
}));
vi.mock("../../utils/council-ai-search-storage", () => ({
  getBrowserCouncilSearchInstallationId: () =>
    "11111111-1111-4111-8111-111111111111",
}));

const mockedRequestCouncilBillPage = vi.mocked(requestCouncilBillPage);
const education = getCategory("education");
const disasterPrevention = getCategory("disaster-prevention");
const initialCards = Array.from({ length: 10 }, (_, index) =>
  createCard(`education-${index + 1}`)
);
const data: CouncilThemeSectionData = {
  year: 2026,
  categories: [
    { category: education, count: 12 },
    { category: disasterPrevention, count: 2 },
  ],
  initialCategoryId: "education",
  initialPage: {
    bills: initialCards,
    items: initialCards.map((bill) => ({ kind: "bill", bill })),
    total: 12,
    currentPage: 1,
    totalPages: 2,
  },
};

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
    window.sessionStorage.clear();
    mockedRequestCouncilBillPage.mockReset();
  });

  it("初期HTMLに渡された10件だけを表示する", () => {
    render(<BillsByMajorCategorySection data={data} />);

    expect(
      screen.queryByRole("button", { name: "すべて" })
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId("bill-card")).toHaveLength(10);
    expect(screen.getByText("education-10")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(mockedRequestCouncilBillPage).not.toHaveBeenCalled();
  });

  it("大分類の一般質問を個別案件ではなく1枚の大きなカードで表示する", () => {
    render(
      <BillsByMajorCategorySection
        data={{
          ...data,
          initialPage: {
            bills: [],
            items: [
              {
                kind: "general-question-category",
                category: {
                  categoryId: "education",
                  name: "教育",
                  majorCategory: "教育🏫",
                  description: "学校、教育環境、学びの支援",
                  year: 2026,
                  questionCount: 30,
                  latestSubmittedDate: "2026-02-20",
                },
              },
            ],
            total: 1,
            currentPage: 1,
            totalPages: 1,
          },
        }}
      />
    );

    expect(
      screen.getByRole("link", { name: /教育に関する議員の質問/u })
    ).toHaveAttribute("href", "/bills/questions/2026/education");
    expect(screen.getByText("質問 30件")).toBeVisible();
    expect(screen.queryByTestId("bill-card")).not.toBeInTheDocument();
  });

  it("次ページは10件単位のAPIから読み込む", async () => {
    const user = userEvent.setup();
    mockedRequestCouncilBillPage.mockResolvedValue({
      bills: [createCard("education-11"), createCard("education-12")],
      items: [createCard("education-11"), createCard("education-12")].map(
        (bill) => ({ kind: "bill" as const, bill })
      ),
      total: 12,
      currentPage: 2,
      totalPages: 2,
    });
    render(<BillsByMajorCategorySection data={data} />);

    await user.click(screen.getByRole("button", { name: "次のページ" }));

    expect(await screen.findByText("education-11")).toBeInTheDocument();
    expect(screen.getAllByTestId("bill-card")).toHaveLength(2);
    expect(mockedRequestCouncilBillPage).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "theme",
        year: 2026,
        themeId: "education",
        page: 2,
      }),
      expect.any(AbortSignal)
    );
  });

  it("別ページから戻ると保存済みのテーマとページを復元する", async () => {
    const restoredPage = {
      bills: [createCard("disaster-prevention-11")],
      items: [createCard("disaster-prevention-11")].map((bill) => ({
        kind: "bill" as const,
        bill,
      })),
      total: 11,
      currentPage: 2,
      totalPages: 2,
    };
    writeComponentState("bills-by-category:theme-bills:2026", {
      categoryId: "disaster-prevention",
      page: 2,
    });
    mockedRequestCouncilBillPage.mockResolvedValue(restoredPage);

    render(<BillsByMajorCategorySection data={data} />);

    expect(
      await screen.findByText("disaster-prevention-11")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "防災☔" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(mockedRequestCouncilBillPage).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "theme",
        year: 2026,
        themeId: "disaster-prevention",
        page: 2,
      }),
      expect.any(AbortSignal)
    );
  });

  it("保存済みテーマと同一タブの設定変更を遅延取得する", async () => {
    const disasterPage = {
      bills: [
        createCard("disaster-prevention-1"),
        createCard("disaster-prevention-2"),
      ],
      items: [
        createCard("disaster-prevention-1"),
        createCard("disaster-prevention-2"),
      ].map((bill) => ({ kind: "bill" as const, bill })),
      total: 2,
      currentPage: 1,
      totalPages: 1,
    };
    mockedRequestCouncilBillPage.mockResolvedValue(disasterPage);
    render(<BillsByMajorCategorySection data={data} />);

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
    expect(
      await screen.findByText("disaster-prevention-1")
    ).toBeInTheDocument();
  });
});

function getCategory(
  id: (typeof RECOMMENDATION_CATEGORY_OPTIONS)[number]["id"]
) {
  const category = RECOMMENDATION_CATEGORY_OPTIONS.find(
    (option) => option.id === id
  );
  if (!category) {
    throw new Error(`Unknown category: ${id}`);
  }
  return category;
}

function createCard(id: string): BillCardData {
  return {
    id,
    name: id,
    item_type: "bill",
    major_category: "教育🏫",
    status: "introduced",
    status_label: null,
    status_note: null,
    submitted_date: "2026-07-01",
    thumbnail_url: null,
    is_featured: false,
    is_review_completed: true,
    interview_enabled: false,
    hasPublicInterview: false,
    bill_content: null,
    tags: [],
  };
}
