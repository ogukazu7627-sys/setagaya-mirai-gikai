// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillCardData } from "../../../shared/types";
import { requestCouncilBillPage } from "../../utils/council-bill-page-api";
import { requestCouncilKeywordSearch } from "../../utils/council-keyword-search-api";
import { CouncilSearchSection } from "./council-search-section";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../../utils/council-keyword-search-api", () => ({
  requestCouncilKeywordSearch: vi.fn(),
}));
vi.mock("../../utils/council-bill-page-api", () => ({
  requestCouncilBillPage: vi.fn(),
}));
vi.mock("../../utils/council-search-storage", () => ({
  getBrowserCouncilSearchInstallationId: () =>
    "11111111-1111-4111-8111-111111111111",
}));

const mockedRequestCouncilKeywordSearch = vi.mocked(
  requestCouncilKeywordSearch
);
const mockedRequestCouncilBillPage = vi.mocked(requestCouncilBillPage);
const committeeNames = ["文教常任委員会"];

describe("CouncilSearchSection", () => {
  beforeEach(() => {
    mockedRequestCouncilKeywordSearch.mockReset();
    mockedRequestCouncilBillPage.mockReset();
    window.history.replaceState(null, "", "/bills");
  });

  it("入力中は検索せず、Enterで初めてキーワード検索する", async () => {
    const user = userEvent.setup();
    const card = createCard(1);
    mockedRequestCouncilKeywordSearch.mockResolvedValue({
      items: [{ kind: "bill", bill: card }],
      total: 1,
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    const input = screen.getByRole("searchbox", {
      name: "キーワード",
    });
    await user.type(input, "学校");

    expect(mockedRequestCouncilKeywordSearch).not.toHaveBeenCalled();
    expect(mockedRequestCouncilBillPage).not.toHaveBeenCalled();
    expect(screen.queryByText("検索結果")).not.toBeInTheDocument();

    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(mockedRequestCouncilKeywordSearch).toHaveBeenCalledOnce()
    );
    expect(screen.getByText("学校改築について1")).toBeInTheDocument();
    expect(screen.getByText("1件")).toBeInTheDocument();
  });

  it("キーワード検索結果を1列5件ずつページ送りする", async () => {
    const user = userEvent.setup();
    const sixCards = Array.from({ length: 6 }, (_, index) =>
      createCard(index + 1)
    );
    mockedRequestCouncilKeywordSearch.mockResolvedValue({
      items: sixCards.map((bill) => ({ kind: "bill", bill })),
      total: 6,
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    await user.type(
      screen.getByRole("searchbox", { name: "キーワード" }),
      "学校{Enter}"
    );

    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(5));
    expect(screen.queryByText("学校改築について6")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次のページ" }));

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("学校改築について6")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("同じ大分類に一致した一般質問は個別カードではなく1枚で表示する", async () => {
    const user = userEvent.setup();
    mockedRequestCouncilKeywordSearch.mockResolvedValue({
      items: [
        {
          kind: "general-question-category",
          category: {
            categoryId: "education",
            name: "教育",
            majorCategory: "教育🏫",
            description: "学校、教育環境、学びの支援",
            year: 2026,
            dietSession: {
              id: "session-1",
              name: "令和8年第1回定例会",
              slug: "2026-1",
              startDate: "2026-02-01",
            },
            questionCount: 30,
            latestSubmittedDate: "2026-02-20",
            focusBillId: "11111111-1111-4111-8111-111111111111",
          },
        },
      ],
      total: 1,
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    await user.type(
      screen.getByRole("searchbox", { name: "キーワード" }),
      "学校{Enter}"
    );

    expect(
      await screen.findByRole("link", { name: /教育に関する議員の質問/u })
    ).toHaveAttribute(
      "href",
      "/bills/questions/2026/education/2026-1?focus=11111111-1111-4111-8111-111111111111"
    );
    expect(screen.getByText("質問 30件")).toBeVisible();
    expect(screen.getByText("1件")).toBeVisible();
    expect(screen.queryByText("question-1")).not.toBeInTheDocument();
    expect(screen.queryByText("question-2")).not.toBeInTheDocument();
  });

  it("フィルターだけの検索は5件のページAPIを使う", async () => {
    const user = userEvent.setup();
    const cards = Array.from({ length: 5 }, (_, index) =>
      createCard(index + 1)
    );
    mockedRequestCouncilBillPage.mockResolvedValue({
      bills: cards,
      items: cards.map((bill) => ({ kind: "bill", bill })),
      total: 7,
      currentPage: 1,
      totalPages: 2,
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    await user.selectOptions(screen.getByLabelText("情報の種類"), "report");

    await waitFor(() =>
      expect(mockedRequestCouncilBillPage).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "filters",
          contentType: "report",
          page: 1,
        }),
        expect.any(AbortSignal)
      )
    );
    expect(mockedRequestCouncilBillPage).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getByText("7件")).toBeInTheDocument();
  });

  it("検索文をURLへ保存せず、フィルター条件だけを維持する", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/bills?q=以前の検索");
    mockedRequestCouncilKeywordSearch.mockResolvedValue({
      items: [],
      total: 0,
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    await user.type(
      screen.getByRole("searchbox", { name: "キーワード" }),
      "防災{Enter}"
    );

    await waitFor(() =>
      expect(mockedRequestCouncilKeywordSearch).toHaveBeenCalledOnce()
    );
    expect(new URL(window.location.href).searchParams.has("q")).toBe(false);
  });

  it("0件状態から条件をクリアして通常表示へ戻せる", async () => {
    const user = userEvent.setup();
    mockedRequestCouncilKeywordSearch.mockResolvedValue({
      items: [],
      total: 0,
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    const input = screen.getByRole("searchbox", {
      name: "キーワード",
    });
    await user.type(input, "存在しない検索語{Enter}");

    expect(
      await screen.findByText("条件に合う案件が見つかりませんでした")
    ).toBeInTheDocument();
    const clearButtons = screen.getAllByRole("button", {
      name: "条件をクリア",
    });
    await user.click(clearButtons.at(-1) as HTMLButtonElement);

    expect(input).toHaveValue("");
    expect(screen.queryByText("検索結果")).not.toBeInTheDocument();
  });

  it("検索失敗後に同じ条件で再試行できる", async () => {
    const user = userEvent.setup();
    const card = createCard(1);
    mockedRequestCouncilKeywordSearch
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({
        items: [{ kind: "bill", bill: card }],
        total: 1,
      });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    await user.type(
      screen.getByRole("searchbox", { name: "キーワード" }),
      "学校{Enter}"
    );
    await user.click(
      await screen.findByRole("button", { name: "もう一度試す" })
    );

    expect(await screen.findByText("学校改築について1")).toBeInTheDocument();
    expect(mockedRequestCouncilKeywordSearch).toHaveBeenCalledTimes(2);
  });

  it("情報種別に委員会を表示しない", () => {
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    const informationType = screen.getByLabelText("情報の種類");
    expect(informationType).not.toHaveTextContent("委員会");
  });

  it("キーワード検索欄に共通の水色グラデーション枠を表示する", () => {
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    const input = screen.getByRole("searchbox", {
      name: "キーワード",
    });
    expect(input.parentElement).toHaveClass("border-mirai-gradient");
  });

  it("検索対象が分かる通常検索向けのプレースホルダーを表示する", () => {
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    expect(
      screen.getByPlaceholderText("案件名、本文タイトル、概要、タグなど")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("子育て世代が知っておくべきこと")
    ).not.toBeInTheDocument();
  });
});

function createCard(index: number): BillCardData {
  return {
    id: `bill-${index}`,
    name: `学校改築に関する報告${index}`,
    item_type: "report",
    major_category: "教育🏫",
    status: "introduced",
    status_label: null,
    status_note: "文教常任委員会で報告",
    submitted_date: `2026-07-${String(index).padStart(2, "0")}`,
    thumbnail_url: null,
    is_featured: false,
    is_review_completed: false,
    interview_enabled: false,
    hasPublicInterview: false,
    bill_content: {
      title: `学校改築について${index}`,
      summary: "学校施設の改築計画を確認します。",
    },
    tags: [{ id: `tag-${index}`, label: "学校" }],
  };
}
