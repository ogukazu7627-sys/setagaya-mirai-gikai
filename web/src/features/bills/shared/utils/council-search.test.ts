import { describe, expect, it } from "vitest";
import type { BillCardData } from "../types";
import type { CouncilSearchDocument } from "../types/council-search";
import {
  createCouncilSearchFilters,
  searchCouncilDocuments,
} from "./council-search";

const documents: CouncilSearchDocument[] = [
  createDocument({
    id: "education-bill",
    title: "学校給食費を無償化する議案",
    itemType: "bill",
    majorCategoryId: "education",
    committeeName: "文教常任委員会",
    submittedDate: "2026-06-01",
  }),
  createDocument({
    id: "welfare-report",
    title: "高齢者の見守りに関する報告",
    itemType: "report",
    majorCategoryId: "welfare",
    committeeName: "福祉保健常任委員会",
    submittedDate: "2026-07-01",
  }),
];

describe("searchCouncilDocuments", () => {
  it("情報種別・テーマ・委員会をローカルで絞り込む", () => {
    expect(
      searchCouncilDocuments(documents, {
        contentType: "report",
        themeId: "welfare",
        committeeName: "福祉保健常任委員会",
      }).map(({ id }) => id)
    ).toEqual(["welfare-report"]);
  });

  it("条件がない場合は新しい案件を先に並べる", () => {
    expect(
      searchCouncilDocuments(documents, {
        contentType: "all",
        themeId: "",
        committeeName: "",
      }).map(({ id }) => id)
    ).toEqual(["welfare-report", "education-bill"]);
  });
});

describe("createCouncilSearchFilters", () => {
  it("有効なURL条件だけを引き継ぐ", () => {
    expect(
      createCouncilSearchFilters(
        {
          type: "bill",
          theme: "education",
          committee: "文教常任委員会",
        },
        ["文教常任委員会", "福祉保健常任委員会"],
        ["education", "welfare"]
      )
    ).toEqual({
      contentType: "bill",
      themeId: "education",
      committeeName: "文教常任委員会",
    });
  });

  it("未知の条件を既定値へ戻す", () => {
    expect(
      createCouncilSearchFilters(
        {
          type: "committee",
          theme: "unknown",
          committee: "存在しない委員会",
        },
        ["文教常任委員会"],
        ["education", "welfare"]
      )
    ).toEqual({
      contentType: "all",
      themeId: "",
      committeeName: "",
    });
  });
});

function createDocument(input: {
  id: string;
  title: string;
  itemType: BillCardData["item_type"];
  majorCategoryId: string;
  committeeName: string;
  submittedDate: string;
}): CouncilSearchDocument {
  return {
    kind: "bill",
    id: input.id,
    title: input.title,
    officialName: input.title,
    summary: "",
    itemType: input.itemType,
    majorCategoryId: input.majorCategoryId,
    majorCategoryLabel: input.majorCategoryId,
    committeeName: input.committeeName,
    tags: [],
    submittedDate: input.submittedDate,
    thumbnailUrl: null,
    card: {
      id: input.id,
      name: input.title,
      item_type: input.itemType,
      major_category: input.majorCategoryId,
      status: "introduced",
      status_label: null,
      status_note: input.committeeName,
      submitted_date: input.submittedDate,
      thumbnail_url: null,
      is_featured: false,
      is_review_completed: false,
      interview_enabled: false,
      hasPublicInterview: false,
      bill_content: { title: input.title, summary: "" },
      tags: [],
    },
  };
}
