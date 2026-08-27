import type { BillCardData } from "@/features/bills/shared/types";
import type { CouncilDirectoryItem } from "@/features/bills/shared/types/council-bill-directory";
import type { GeneralQuestionCategoryCardData } from "../types/general-question";
import { getGeneralQuestionCategoryByMajorCategory } from "./general-question-categories";

export function groupGeneralQuestionSearchResults(
  bills: readonly BillCardData[],
  categories: readonly GeneralQuestionCategoryCardData[],
  year: number
): CouncilDirectoryItem[] {
  const categoryCards = new Map(
    categories.map((category) => [category.categoryId, category])
  );
  const matchedCounts = new Map<string, number>();
  for (const bill of bills) {
    if (bill.publication_category !== "general_question") continue;
    const category = getGeneralQuestionCategoryByMajorCategory(
      bill.major_category
    );
    if (category) {
      matchedCounts.set(category.id, (matchedCounts.get(category.id) ?? 0) + 1);
    }
  }

  const emittedCategoryIds = new Set<string>();
  return bills.flatMap((bill): CouncilDirectoryItem[] => {
    if (bill.publication_category !== "general_question") {
      return [{ kind: "bill", bill }];
    }

    const category = getGeneralQuestionCategoryByMajorCategory(
      bill.major_category
    );
    if (!category || emittedCategoryIds.has(category.id)) {
      return [];
    }
    emittedCategoryIds.add(category.id);

    const categoryCard = categoryCards.get(category.id) ?? {
      categoryId: category.id,
      name: category.name,
      majorCategory: category.label,
      description: category.description,
      year,
      questionCount: matchedCounts.get(category.id) ?? 1,
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
