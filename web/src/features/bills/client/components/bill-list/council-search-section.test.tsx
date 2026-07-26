// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CouncilSearchDocument } from "../../../shared/types/council-search";
import { CouncilSearchSection } from "./council-search-section";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const documents: CouncilSearchDocument[] = [
  {
    kind: "bill",
    id: "bill-1",
    title: "学校改築について",
    officialName: "学校改築に関する報告",
    summary: "学校施設の改築計画を確認します。",
    itemType: "report",
    majorCategoryId: "education",
    majorCategoryLabel: "教育",
    committeeName: "文教常任委員会",
    tags: ["学校"],
    submittedDate: "2026-07-01",
    thumbnailUrl: null,
  },
];

describe("CouncilSearchSection", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/bills");
  });

  it("does not show a latest-items section before the user searches", () => {
    render(<CouncilSearchSection documents={documents} />);

    expect(screen.queryByText("新着の案件")).not.toBeInTheDocument();
    expect(screen.queryByText("検索結果")).not.toBeInTheDocument();
    expect(screen.queryByText("学校改築について")).not.toBeInTheDocument();
  });

  it("shows matching items after the user enters a search condition", async () => {
    const user = userEvent.setup();
    render(<CouncilSearchSection documents={documents} />);

    await user.type(
      screen.getByRole("searchbox", { name: "キーワード" }),
      "学校"
    );

    expect(screen.getByText("検索結果")).toBeInTheDocument();
    expect(screen.getByText("学校改築について")).toBeInTheDocument();
    expect(screen.getByText("1件")).toBeInTheDocument();
  });
});
