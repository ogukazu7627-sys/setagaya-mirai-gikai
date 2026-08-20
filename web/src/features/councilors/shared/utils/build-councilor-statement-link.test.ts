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

  it("points a general question at the bill's opinion anchor", () => {
    expect(
      buildCouncilorStatementLink({
        billId: "bill-2",
        publicationCategory: "general_question",
        majorCategory: "防災☔",
        statementIndex: 0,
      }).kind
    ).toBe("bill");
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
