// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomePublicCommentSection } from "./home-public-comment-section";

describe("HomePublicCommentSection", () => {
  it("shows the active public comment interviews and their deadlines", () => {
    render(<HomePublicCommentSection />);

    expect(
      screen.getByRole("heading", { name: "AIパブコメインタビュー" })
    ).toBeVisible();
    expect(
      screen.getByText(/世田谷区へ提出する意見の下書きをつくれます/)
    ).toBeVisible();

    expect(
      screen.getByRole("link", { name: /民泊・旅館業の条例改正素案/ })
    ).toHaveAttribute("href", "/public-comment/minpaku");
    expect(
      screen.getByRole("link", {
        name: /いじめの予防と解消に向けた条例素案/,
      })
    ).toHaveAttribute("href", "/public-comment/ijime");
    expect(
      screen.getByRole("link", {
        name: /障害理解・地域共生条例の改正素案/,
      })
    ).toHaveAttribute("href", "/public-comment/disability");

    expect(screen.getByText(/意見募集 10月6日/)).toBeVisible();
    expect(screen.getByText(/意見募集 10月7日/)).toBeVisible();
    expect(screen.getByText(/意見募集 10月8日/)).toBeVisible();
  });
});
