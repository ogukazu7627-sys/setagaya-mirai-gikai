// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillCardData } from "../../../shared/types";
import { requestCouncilAiSearch } from "../../utils/council-ai-search-api";
import { requestCouncilBillPage } from "../../utils/council-bill-page-api";
import { CouncilSearchSection } from "./council-search-section";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../../utils/council-ai-search-api", () => ({
  requestCouncilAiSearch: vi.fn(),
}));
vi.mock("../../utils/council-bill-page-api", () => ({
  requestCouncilBillPage: vi.fn(),
}));
vi.mock("../../utils/council-ai-search-storage", () => ({
  getBrowserCouncilSearchInstallationId: () =>
    "11111111-1111-4111-8111-111111111111",
}));

const mockedRequestCouncilAiSearch = vi.mocked(requestCouncilAiSearch);
const mockedRequestCouncilBillPage = vi.mocked(requestCouncilBillPage);
const committeeNames = ["文教常任委員会"];

describe("CouncilSearchSection", () => {
  beforeEach(() => {
    mockedRequestCouncilAiSearch.mockReset();
    mockedRequestCouncilBillPage.mockReset();
    window.history.replaceState(null, "", "/bills");
  });

  it("入力中は検索せず、Enterで初めてAI検索する", async () => {
    const user = userEvent.setup();
    const card = createCard(1);
    mockedRequestCouncilAiSearch.mockResolvedValue({
      billIds: [card.id],
      bills: [card],
      total: 1,
      mode: "hybrid",
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    const input = screen.getByRole("textbox", {
      name: "知りたいことを入力",
    });
    await user.type(input, "学校");

    expect(mockedRequestCouncilAiSearch).not.toHaveBeenCalled();
    expect(mockedRequestCouncilBillPage).not.toHaveBeenCalled();
    expect(screen.queryByText("検索結果")).not.toBeInTheDocument();

    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(mockedRequestCouncilAiSearch).toHaveBeenCalledOnce()
    );
    expect(screen.getByText("学校改築について1")).toBeInTheDocument();
    expect(screen.getByText("1件")).toBeInTheDocument();
  });

  it("AI検索結果を1列5件ずつページ送りする", async () => {
    const user = userEvent.setup();
    const sixCards = Array.from({ length: 6 }, (_, index) =>
      createCard(index + 1)
    );
    mockedRequestCouncilAiSearch.mockResolvedValue({
      billIds: sixCards.map(({ id }) => id),
      bills: sixCards,
      total: 6,
      mode: "hybrid",
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    await user.type(
      screen.getByRole("textbox", { name: "知りたいことを入力" }),
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

  it("フィルターだけの検索は5件のページAPIを使う", async () => {
    const user = userEvent.setup();
    const cards = Array.from({ length: 5 }, (_, index) =>
      createCard(index + 1)
    );
    mockedRequestCouncilBillPage.mockResolvedValue({
      bills: cards,
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
    mockedRequestCouncilAiSearch.mockResolvedValue({
      billIds: [],
      bills: [],
      total: 0,
      mode: "keyword-fallback",
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    await user.type(
      screen.getByRole("textbox", { name: "知りたいことを入力" }),
      "防災{Enter}"
    );

    await waitFor(() =>
      expect(mockedRequestCouncilAiSearch).toHaveBeenCalledOnce()
    );
    expect(new URL(window.location.href).searchParams.has("q")).toBe(false);
  });

  it("0件状態から条件をクリアして通常表示へ戻せる", async () => {
    const user = userEvent.setup();
    mockedRequestCouncilAiSearch.mockResolvedValue({
      billIds: [],
      bills: [],
      total: 0,
      mode: "keyword-fallback",
    });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    const input = screen.getByRole("textbox", {
      name: "知りたいことを入力",
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
    mockedRequestCouncilAiSearch
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({
        billIds: [card.id],
        bills: [card],
        total: 1,
        mode: "hybrid",
      });
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    await user.type(
      screen.getByRole("textbox", { name: "知りたいことを入力" }),
      "学校{Enter}"
    );
    await user.click(
      await screen.findByRole("button", { name: "もう一度試す" })
    );

    expect(await screen.findByText("学校改築について1")).toBeInTheDocument();
    expect(mockedRequestCouncilAiSearch).toHaveBeenCalledTimes(2);
  });

  it("情報種別に委員会を表示しない", () => {
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    const informationType = screen.getByLabelText("情報の種類");
    expect(informationType).not.toHaveTextContent("委員会");
  });

  it("AI検索欄に共通の水色グラデーション枠を表示する", () => {
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    const input = screen.getByRole("textbox", {
      name: "知りたいことを入力",
    });
    expect(input.parentElement).toHaveClass("border-mirai-gradient");
  });

  it("AI検索欄に若者向けの入力例を表示する", () => {
    render(<CouncilSearchSection committeeNames={committeeNames} />);

    expect(
      screen.getByPlaceholderText("例：若者が知るべきこと")
    ).toBeInTheDocument();
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
