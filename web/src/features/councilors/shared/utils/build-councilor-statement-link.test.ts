import { describe, expect, it } from "vitest";
import { buildCouncilorStatementLink } from "./build-councilor-statement-link";

describe("buildCouncilorStatementLink", () => {
  it("points a report statement at the bill's opinion anchor", () => {
    expect(
      buildCouncilorStatementLink({
        billId: "bill-1",
        publicationCategory: "report",
        majorCategory: "教育🏫",
        statementIndex: 2,
      })
    ).toEqual({
      href: "/bills/bill-1#councilor-opinion-2",
      kind: "bill",
    });
  });

  it("一般質問を会期別の大分類ページにある元質問へ送る", () => {
    expect(
      buildCouncilorStatementLink({
        billId: "bill-2",
        publicationCategory: "general_question",
        majorCategory: "防災☔",
        sessionId: "session-1",
        sessionSlug: "2026-1",
        sessionStartDate: "2026-01-01",
        statementIndex: 0,
      })
    ).toEqual({
      href: "/bills/questions/2026/disaster-prevention/2026-1?focus=bill-2",
      kind: "general-question",
    });
  });

  it("sends a budget question to its budget category page", () => {
    // 予算案件の /bills/<id> はリダイレクトされるため、質問ページを直接指す。
    expect(
      buildCouncilorStatementLink({
        billId: "bill-3",
        publicationCategory: "budget",
        majorCategory: "教育🏫",
        statementIndex: 1,
      })
    ).toEqual({
      href: "/budget/questions/education?focus=bill-3",
      kind: "budget-question",
    });
  });

  it("falls back to the overall budget page for an unknown major category", () => {
    expect(
      buildCouncilorStatementLink({
        billId: "bill-4",
        publicationCategory: "budget",
        majorCategory: null,
        statementIndex: 0,
      }).href
    ).toBe("/budget/questions/all?focus=bill-4");

    expect(
      buildCouncilorStatementLink({
        billId: "bill-5",
        publicationCategory: "budget",
        majorCategory: "存在しない分類",
        statementIndex: 0,
      }).href
    ).toBe("/budget/questions/all?focus=bill-5");
  });

  it("maps the overall budget major category to the all page", () => {
    expect(
      buildCouncilorStatementLink({
        billId: "bill-6",
        publicationCategory: "budget",
        majorCategory: "全体",
        statementIndex: 0,
      }).href
    ).toBe("/budget/questions/all?focus=bill-6");
  });
});
