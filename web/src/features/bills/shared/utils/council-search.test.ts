import { describe, expect, it } from "vitest";
import type { CouncilSearchDocument } from "../types/council-search";
import {
  createCouncilSearchFilters,
  searchCouncilDocuments,
} from "./council-search";

const documents: CouncilSearchDocument[] = [
  {
    kind: "bill",
    id: "education-bill",
    title: "学校給食費を無償化する議案",
    officialName: "議案第1号",
    summary: "区立小中学校の給食費について定めます。",
    itemType: "bill",
    majorCategoryId: "education",
    majorCategoryLabel: "教育🏫",
    committeeName: "文教常任委員会",
    tags: ["学校給食"],
    submittedDate: "2026-06-01",
  },
  {
    kind: "bill",
    id: "welfare-report",
    title: "高齢者の見守りに関する報告",
    officialName: "報告第2号",
    summary: "地域の高齢者を支える取組を報告します。",
    itemType: "report",
    majorCategoryId: "welfare",
    majorCategoryLabel: "福祉🤝",
    committeeName: "福祉保健常任委員会",
    tags: ["高齢者福祉"],
    submittedDate: "2026-07-01",
  },
  {
    kind: "committee",
    id: "education-committee",
    name: "文教常任委員会",
    committeeKindLabel: "常任委員会",
    summary: "学校の教育環境と生涯学習を審査します。",
    responsibilities: ["児童・生徒の教育環境", "生涯学習"],
  },
];

describe("searchCouncilDocuments", () => {
  it("searches titles, summaries, tags, categories, and committees", () => {
    const results = searchCouncilDocuments(documents, {
      query: "学校",
      contentType: "all",
      themeId: "",
      committeeName: "",
    });

    expect(results.map(({ id }) => id)).toEqual([
      "education-bill",
      "education-committee",
    ]);
  });

  it("requires every query token to match", () => {
    const results = searchCouncilDocuments(documents, {
      query: "高齢者 見守り",
      contentType: "all",
      themeId: "",
      committeeName: "",
    });

    expect(results.map(({ id }) => id)).toEqual(["welfare-report"]);
  });

  it("treats middle-dot-separated terms as alternatives", () => {
    const results = searchCouncilDocuments(documents, {
      query: "学校・高齢者",
      contentType: "all",
      themeId: "",
      committeeName: "",
    });

    expect(results.map(({ id }) => id)).toEqual([
      "welfare-report",
      "education-bill",
      "education-committee",
    ]);
  });

  it("filters by content type, theme, and committee", () => {
    expect(
      searchCouncilDocuments(documents, {
        query: "",
        contentType: "report",
        themeId: "welfare",
        committeeName: "福祉保健常任委員会",
      }).map(({ id }) => id)
    ).toEqual(["welfare-report"]);
  });

  it("shows newer bills first when no search condition is active", () => {
    const results = searchCouncilDocuments(documents, {
      query: "",
      contentType: "all",
      themeId: "",
      committeeName: "",
    });

    expect(results.slice(0, 2).map(({ id }) => id)).toEqual([
      "welfare-report",
      "education-bill",
    ]);
  });
});

describe("createCouncilSearchFilters", () => {
  it("keeps valid shared URL filters and drops unknown values", () => {
    expect(
      createCouncilSearchFilters(
        {
          q: "  学校 ",
          type: "bill",
          theme: "education",
          committee: "文教常任委員会",
        },
        documents,
        ["education", "welfare"]
      )
    ).toEqual({
      query: "学校",
      contentType: "bill",
      themeId: "education",
      committeeName: "文教常任委員会",
    });

    expect(
      createCouncilSearchFilters(
        {
          type: "unknown",
          theme: "unknown",
          committee: "存在しない委員会",
        },
        documents,
        ["education", "welfare"]
      )
    ).toEqual({
      query: "",
      contentType: "all",
      themeId: "",
      committeeName: "",
    });
  });
});
