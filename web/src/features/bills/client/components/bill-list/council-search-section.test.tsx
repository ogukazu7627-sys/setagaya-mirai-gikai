// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillCardData } from "../../../shared/types";
import type { CouncilSearchDocument } from "../../../shared/types/council-search";
import { CouncilSearchSection } from "./council-search-section";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function createDocument(index: number): CouncilSearchDocument {
  const id = `bill-${index}`;
  const title = `学校改築について${index}`;
  const card: BillCardData = {
    id,
    name: `学校改築に関する報告${index}`,
    item_type: "report",
    major_category: "教育",
    status: "introduced",
    status_label: null,
    status_note: "文教常任委員会で報告",
    submitted_date: "2026-07-01",
    thumbnail_url: null,
    is_featured: false,
    is_review_completed: false,
    interview_enabled: false,
    hasPublicInterview: false,
    bill_content: {
      title,
      summary: "学校施設の改築計画を確認します。",
    },
    tags: [{ id: `tag-${index}`, label: "学校" }],
  };

  return {
    kind: "bill",
    id,
    title,
    officialName: card.name,
    summary: "学校施設の改築計画を確認します。",
    itemType: "report",
    majorCategoryId: "education",
    majorCategoryLabel: "教育",
    committeeName: "文教常任委員会",
    tags: ["学校"],
    submittedDate: "2026-07-01",
    thumbnailUrl: null,
    card,
  };
}

const documents = [createDocument(1)];

describe("CouncilSearchSection", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/bills");
  });

  it("does not show a latest-items section before the user searches", () => {
    render(<CouncilSearchSection documents={documents} />);

    expect(screen.queryByText("新着の案件")).not.toBeInTheDocument();
    expect(screen.queryByText("検索結果")).not.toBeInTheDocument();
    expect(screen.queryByText("学校改築について1")).not.toBeInTheDocument();
  });

  it("shows matching items after the user enters a search condition", async () => {
    const user = userEvent.setup();
    render(<CouncilSearchSection documents={documents} />);

    await user.type(
      screen.getByRole("searchbox", { name: "キーワード" }),
      "学校"
    );

    expect(screen.getByText("検索結果")).toBeInTheDocument();
    expect(screen.getByText("学校改築について1")).toBeInTheDocument();
    expect(screen.getByText("1件")).toBeInTheDocument();
  });

  it("shows one column with five results per page", async () => {
    const user = userEvent.setup();
    render(
      <CouncilSearchSection
        documents={Array.from({ length: 6 }, (_, index) =>
          createDocument(index + 1)
        )}
      />
    );

    await user.type(
      screen.getByRole("searchbox", { name: "キーワード" }),
      "学校"
    );

    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getByText("学校改築について5")).toBeInTheDocument();
    expect(screen.queryByText("学校改築について6")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次のページ" }));

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("学校改築について6")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });
});
