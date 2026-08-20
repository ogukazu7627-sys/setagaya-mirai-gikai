import type { BillPublicationCategory } from "@/features/bills/shared/types";
import { getBudgetQuestionCategoryByMajorCategory } from "@/features/budget/shared/constants/budget-question-categories";
import { routes } from "@/lib/routes";

export type CouncilorStatementLinkInput = {
  billId: string;
  publicationCategory: BillPublicationCategory;
  majorCategory: string | null;
  statementIndex: number;
};

export type CouncilorStatementLink = {
  href: string;
  /** 予算委員会での質問は遷移先が異なるため、画面側で見分けられるようにする。 */
  kind: "bill" | "budget-question";
};

/**
 * 議員の発言から本文の該当箇所へ渡すリンク。
 *
 * 予算案件の `/bills/<id>` は予算カテゴリページへリダイレクトされるため、
 * 予算の質問は最初から質問ページの該当質問を指す。
 */
export function buildCouncilorStatementLink({
  billId,
  publicationCategory,
  majorCategory,
  statementIndex,
}: CouncilorStatementLinkInput): CouncilorStatementLink {
  if (publicationCategory === "budget") {
    const category = getBudgetQuestionCategoryByMajorCategory(majorCategory);
    return {
      href: routes.budgetQuestionCategory(category?.slug ?? "all", billId),
      kind: "budget-question",
    };
  }

  return {
    href: routes.billDetailCouncilorStatement(billId, statementIndex),
    kind: "bill",
  };
}
