import type { BillPublicationCategory } from "@/features/bills/shared/types";
import { getBudgetQuestionCategoryByMajorCategory } from "@/features/budget/shared/constants/budget-question-categories";
import { getGeneralQuestionCategoryByMajorCategory } from "@/features/general-questions/shared/utils/general-question-categories";
import { routes } from "@/lib/routes";

export type CouncilorStatementLinkInput = {
  billId: string;
  publicationCategory: BillPublicationCategory;
  majorCategory: string | null;
  sessionId?: string | null;
  sessionSlug?: string | null;
  sessionStartDate?: string | null;
  statementIndex: number;
};

export type CouncilorStatementLink = {
  href: string;
  /** 予算委員会での質問は遷移先が異なるため、画面側で見分けられるようにする。 */
  kind: "bill" | "budget-question" | "general-question";
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
  sessionId,
  sessionSlug,
  sessionStartDate,
  statementIndex,
}: CouncilorStatementLinkInput): CouncilorStatementLink {
  if (publicationCategory === "budget") {
    const category = getBudgetQuestionCategoryByMajorCategory(majorCategory);
    return {
      href: routes.budgetQuestionCategory(category?.slug ?? "all", billId),
      kind: "budget-question",
    };
  }

  if (publicationCategory === "general_question") {
    const category = getGeneralQuestionCategoryByMajorCategory(majorCategory);
    const yearMatch = sessionStartDate?.match(/^(\d{4})/u);
    if (category && yearMatch && sessionId) {
      return {
        href: routes.generalQuestionCategory(
          Number(yearMatch[1]),
          category.id,
          sessionSlug ?? sessionId,
          billId
        ),
        kind: "general-question",
      };
    }

    return {
      href: routes.billDetail(billId),
      kind: "general-question",
    };
  }

  return {
    href: routes.billDetailCouncilorStatement(billId, statementIndex),
    kind: "bill",
  };
}
