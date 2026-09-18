// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicCommentHubPage } from "./public-comment-hub-page";

describe("PublicCommentHubPage", () => {
  it("shows all public comment interviews with their deadlines and links", () => {
    render(<PublicCommentHubPage />);

    expect(
      screen.getByRole("heading", { name: "AIパブコメインタビュー" })
    ).toBeVisible();
    expect(screen.getByText("全10件")).toBeVisible();
    expect(
      screen.getByText(/ここで作成した意見は自動送信されません/)
    ).toBeVisible();

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(10);

    const expectedCampaigns = [
      [
        "第10期高齢者保健福祉計画・介護保険事業計画（素案）",
        "/public-comment/elderly-care-plan",
      ],
      [
        "第3期認知症とともに生きる希望計画（素案）",
        "/public-comment/dementia-hope-plan",
      ],
      ["民泊・旅館業の条例改正素案", "/public-comment/minpaku"],
      ["がけ・擁壁等防災対策方針（素案）", "/public-comment/retaining-wall"],
      ["第三次男女共同参画プラン（素案）", "/public-comment/gender-equality"],
      ["世田谷区自殺対策計画（素案）", "/public-comment/suicide-prevention"],
      [
        "第12次世田谷区交通安全計画（素案）",
        "/public-comment/traffic-safety-plan",
      ],
      ["障害理解・地域共生条例の改正素案", "/public-comment/disability"],
      [
        "次期せたがやインクルージョンプラン（素案）",
        "/public-comment/inclusion-plan",
      ],
      ["いじめの予防と解消に向けた条例素案", "/public-comment/ijime"],
    ] as const;

    for (const [index, [title, href]] of expectedCampaigns.entries()) {
      const card = cards[index];
      expect(card).toBeDefined();
      expect(within(card).getByRole("heading", { name: title })).toBeVisible();
      expect(
        within(card).getByRole("link", {
          name: "AIインタビューをはじめる",
        })
      ).toHaveAttribute("href", href);
    }

    expect(screen.getAllByText(/2026年9月29日/)).toHaveLength(2);
    expect(screen.getAllByText(/2026年10月6日/)).toHaveLength(5);
    expect(screen.getAllByText(/2026年10月7日/)).toHaveLength(2);
    expect(screen.getByText(/2026年10月8日/)).toBeVisible();
  });
});
