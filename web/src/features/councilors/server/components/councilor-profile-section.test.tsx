// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CouncilorProfileCatalogEntry } from "../../shared/councilor-profile-types";
import type { PublicCouncilor } from "../repositories/councilor-directory-repository";
import { CouncilorProfileSection } from "./councilor-profile-section";

const councilor: PublicCouncilor = {
  id: "councilor-1",
  displayName: "甲議員",
  normalizedName: "甲",
  iconUrl: "https://example.com/councilor.png",
  committees: [
    {
      id: "committee-1",
      name: "とても長い名称の企画総務常任委員会",
      role: "委員長",
    },
  ],
};

const profile: CouncilorProfileCatalogEntry = {
  normalizedName: "甲",
  factionName: "長い名称の会派等",
  summary:
    "このサイトに掲載中の質問では、教育と福祉に関する制度の現状を確認しています。学校施設と介護支援の具体的な運用について尋ねています。",
  themes: ["教育", "福祉"],
  questionCount: 12,
  summaryAsOf: "2026-08-29",
};

describe("CouncilorProfileSection", () => {
  it("renders affiliation, linked committees, summary, themes, and dates", () => {
    render(
      <CouncilorProfileSection
        councilor={councilor}
        profile={profile}
        publishedQuestionCount={12}
      />
    );

    expect(
      screen.getByRole("heading", { name: "この議員について" })
    ).toBeInTheDocument();
    expect(screen.getByText("長い名称の会派等")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "とても長い名称の企画総務常任委員会（委員長）",
      })
    ).toHaveAttribute("href", "/committees/committee-1");
    expect(screen.getByText("教育")).toBeInTheDocument();
    expect(screen.getByText("福祉")).toBeInTheDocument();
    expect(
      screen.getByText(/このサイトで公開中の質問12件をもとに整理/)
    ).toHaveTextContent("2026年8月29日現在");
    for (const sourceLink of screen.getAllByRole("link", {
      name: "世田谷区公式名簿",
    })) {
      expect(sourceLink.parentElement).toHaveTextContent("2026年8月25日現在");
    }
  });

  it("shows affiliation but not inferred tendencies when summary is missing", () => {
    render(
      <CouncilorProfileSection
        councilor={councilor}
        profile={{
          ...profile,
          summary: null,
          themes: [],
          questionCount: null,
          summaryAsOf: null,
        }}
        publishedQuestionCount={4}
      />
    );

    expect(screen.getByText("長い名称の会派等")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "掲載中の質問から" })
    ).not.toBeInTheDocument();
  });

  it("shows the no-question state without a summary", () => {
    render(
      <CouncilorProfileSection
        councilor={{ ...councilor, committees: [] }}
        profile={null}
        publishedQuestionCount={0}
      />
    );

    expect(
      screen.getByText("このサイトに掲載している質問はまだありません。")
    ).toBeInTheDocument();
    expect(screen.getByText("所属情報を確認中です")).toBeInTheDocument();
    expect(screen.getByText("所属情報を確認中です。")).toBeInTheDocument();
  });
});
