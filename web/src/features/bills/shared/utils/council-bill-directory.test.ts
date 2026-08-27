import { describe, expect, it } from "vitest";
import type { CouncilBillDirectoryEntry } from "../types/council-bill-directory";
import {
  buildCouncilThemeCategorySummaries,
  paginateCouncilBillDirectoryEntries,
  resolveInitialCouncilThemeCategoryId,
} from "./council-bill-directory";

describe("council bill directory", () => {
  it("公開案件のあるテーマだけを定義順で集計する", () => {
    const entries = [
      createEntry("bill-1", { majorCategory: "防災☔" }),
      createEntry("bill-2", { majorCategory: "教育🏫" }),
      createEntry("bill-3", { majorCategory: "教育🏫" }),
    ];

    const categories = buildCouncilThemeCategorySummaries(entries);

    expect(
      categories.map(({ category, count }) => [category.id, count])
    ).toEqual([
      ["education", 2],
      ["disaster-prevention", 1],
    ]);
    expect(resolveInitialCouncilThemeCategoryId(categories)).toBe("education");
    expect(resolveInitialCouncilThemeCategoryId([])).toBeNull();
  });

  it("種別、テーマ、委員会を絞り込み、既存の種別・日付順でページングする", () => {
    const entries = [
      createEntry("report", {
        itemType: "report",
        submittedDate: "2026-07-10",
      }),
      createEntry("bill-old", {
        itemType: "bill",
        submittedDate: "2026-07-01",
      }),
      createEntry("question-old", {
        itemType: "question",
        submittedDate: "2026-07-02",
      }),
      createEntry("question-new", {
        itemType: "question",
        submittedDate: "2026-07-09",
      }),
      createEntry("different-committee", {
        committeeName: "企画総務常任委員会",
      }),
    ];

    const page = paginateCouncilBillDirectoryEntries(
      entries,
      {
        contentType: "all",
        majorCategory: "教育🏫",
        committeeName: "文教常任委員会",
      },
      1,
      3
    );

    expect(page).toEqual({
      entries: [entries[3], entries[2], entries[1]],
      billIds: ["question-new", "question-old", "bill-old"],
      total: 4,
      currentPage: 1,
      totalPages: 2,
    });
    expect(
      paginateCouncilBillDirectoryEntries(
        entries,
        {
          contentType: "report",
          majorCategory: null,
          committeeName: null,
        },
        99,
        5
      )
    ).toEqual({
      entries: [entries[0]],
      billIds: ["report"],
      total: 1,
      currentPage: 1,
      totalPages: 1,
    });
  });
});

function createEntry(
  id: string,
  overrides: Partial<CouncilBillDirectoryEntry> = {}
): CouncilBillDirectoryEntry {
  return {
    id,
    itemType: "bill",
    majorCategory: "教育🏫",
    committeeName: "文教常任委員会",
    submittedDate: "2026-07-05",
    ...overrides,
  };
}
