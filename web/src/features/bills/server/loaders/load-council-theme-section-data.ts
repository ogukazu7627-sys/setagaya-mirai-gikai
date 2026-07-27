import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type {
  CouncilBillDirectoryEntry,
  CouncilThemeSectionData,
} from "../../shared/types/council-bill-directory";
import {
  buildCouncilThemeCategorySummaries,
  paginateCouncilBillDirectoryEntries,
  resolveInitialCouncilThemeCategoryId,
} from "../../shared/utils/council-bill-directory";
import { THEME_BILLS_PAGE_SIZE } from "../../shared/utils/theme-bills";
import { loadCouncilBillCardsByIds } from "./load-council-bill-cards";

type LoadCouncilThemeSectionDataOptions = {
  year: number;
  entries: CouncilBillDirectoryEntry[];
  dietSessionIds: string[];
  difficultyLevel: DifficultyLevelEnum;
};

type LoadCouncilThemeSectionDataDependencies = {
  loadCards?: typeof loadCouncilBillCardsByIds;
};

export async function loadCouncilThemeSectionData(
  options: LoadCouncilThemeSectionDataOptions,
  dependencies: LoadCouncilThemeSectionDataDependencies = {}
): Promise<CouncilThemeSectionData> {
  const categories = buildCouncilThemeCategorySummaries(options.entries);
  const initialCategoryId = resolveInitialCouncilThemeCategoryId(categories);
  const initialCategory = categories.find(
    ({ category }) => category.id === initialCategoryId
  );
  const page = paginateCouncilBillDirectoryEntries(
    options.entries,
    {
      contentType: "all",
      majorCategory: initialCategory?.category.label ?? null,
      committeeName: null,
    },
    1,
    THEME_BILLS_PAGE_SIZE
  );
  const bills = await (dependencies.loadCards ?? loadCouncilBillCardsByIds)(
    page.billIds,
    options.dietSessionIds,
    options.difficultyLevel
  );

  return {
    year: options.year,
    categories,
    initialCategoryId,
    initialPage: {
      bills,
      total: page.total,
      currentPage: page.currentPage,
      totalPages: page.totalPages,
    },
  };
}
