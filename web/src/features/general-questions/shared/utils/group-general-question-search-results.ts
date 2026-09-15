import type { BillCardData } from "@/features/bills/shared/types";
import type { CouncilDirectoryItem } from "@/features/bills/shared/types/council-bill-directory";
import type { GeneralQuestionCategoryCardData } from "../types/general-question";
import {
  getGeneralQuestionCategoryByMajorCategory,
  getGeneralQuestionCategoryGroupKey,
} from "./general-question-categories";

export function groupGeneralQuestionSearchResults(
  bills: readonly BillCardData[],
  categories: readonly GeneralQuestionCategoryCardData[],
  year: number
): CouncilDirectoryItem[] {
  const categoryCards = new Map(
    categories.map((category) => [
      getGeneralQuestionCategoryGroupKey(
        category.dietSession.id,
        category.categoryId
      ),
      category,
    ])
  );
  const matchedCounts = new Map<string, number>();
  for (const bill of bills) {
    if (bill.publication_category !== "general_question") continue;
    const category = getGeneralQuestionCategoryByMajorCategory(
      bill.major_category
    );
    if (category && bill.diet_session) {
      const key = getGeneralQuestionCategoryGroupKey(
        bill.diet_session.id,
        category.id
      );
      matchedCounts.set(key, (matchedCounts.get(key) ?? 0) + 1);
    }
  }

  const emittedCategoryKeys = new Set<string>();
  return bills.flatMap((bill): CouncilDirectoryItem[] => {
    if (bill.publication_category !== "general_question") {
      return [{ kind: "bill", bill }];
    }

    const category = getGeneralQuestionCategoryByMajorCategory(
      bill.major_category
    );
    if (!category || !bill.diet_session) {
      return [];
    }
    const key = getGeneralQuestionCategoryGroupKey(
      bill.diet_session.id,
      category.id
    );
    if (emittedCategoryKeys.has(key)) {
      return [];
    }
    emittedCategoryKeys.add(key);

    const categoryCard = categoryCards.get(key) ?? {
      categoryId: category.id,
      name: category.name,
      majorCategory: category.label,
      description: category.description,
      year,
      dietSession: {
        ...bill.diet_session,
        startDate: null,
      },
      questionCount: matchedCounts.get(key) ?? 1,
      latestSubmittedDate: bill.submitted_date,
    };
    return [
      {
        kind: "general-question-category",
        category: { ...categoryCard, focusBillId: bill.id },
      },
    ];
  });
}
