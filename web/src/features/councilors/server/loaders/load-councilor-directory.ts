import "server-only";

import { cache } from "react";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import {
  buildCouncilorQuestionCounts,
  createEmptyCouncilorQuestionCounts,
} from "../../shared/utils/councilor-question-counts";
import { getCouncilorStatementPreviewText } from "../../shared/utils/get-councilor-statement-preview-text";
import { selectDailyCouncilors } from "../../shared/utils/select-daily-councilors";
import {
  findActivePublicCouncilorById,
  findActivePublicCouncilors,
} from "../repositories/councilor-directory-repository";
import {
  findPublishedCouncilorStatementCounts,
  findPublishedCouncilorStatementCountsByCouncilorIds,
  findPublishedCouncilorStatementDetails,
} from "../repositories/councilor-statement-repository";

export async function loadCouncilorDirectory() {
  const [councilors, questionCountSummaries] = await Promise.all([
    findActivePublicCouncilors(),
    isSetagayaMockMode
      ? Promise.resolve([])
      : findPublishedCouncilorStatementCounts(),
  ]);
  const questionCountsByCouncilorId = new Map(
    questionCountSummaries.flatMap((count) =>
      count.councilorId ? [[count.councilorId, count.questionCounts]] : []
    )
  );

  return councilors.map((councilor) => ({
    ...councilor,
    questionCounts:
      questionCountsByCouncilorId.get(councilor.id) ??
      createEmptyCouncilorQuestionCounts(),
  }));
}

export async function loadRecommendedCouncilors(currentDate: Date) {
  const councilors = await findActivePublicCouncilors();
  const recommendedCouncilors = selectDailyCouncilors(councilors, currentDate);
  const questionCountSummaries = isSetagayaMockMode
    ? []
    : await findPublishedCouncilorStatementCountsByCouncilorIds(
        recommendedCouncilors.map((councilor) => councilor.id)
      );
  const questionCountsByCouncilorId = new Map(
    questionCountSummaries.map((count) => [
      count.councilorId,
      count.questionCounts,
    ])
  );

  return recommendedCouncilors.map((councilor) => ({
    ...councilor,
    questionCounts:
      questionCountsByCouncilorId.get(councilor.id) ??
      createEmptyCouncilorQuestionCounts(),
  }));
}

/**
 * 詳細ページ本体と generateMetadata の双方から呼ばれるため、
 * 同一リクエスト内では 1 回だけ問い合わせる。
 */
export const loadCouncilorDetail = cache(async (councilorId: string) => {
  const councilor = await findActivePublicCouncilorById(councilorId);
  if (!councilor) {
    return null;
  }

  const statementDetails = isSetagayaMockMode
    ? []
    : await findPublishedCouncilorStatementDetails({ councilorId });
  const statements = statementDetails.map(
    ({ billNormalContent, ...statement }) => ({
      ...statement,
      previewText: getCouncilorStatementPreviewText({
        normalContent: billNormalContent,
        statementIndex: statement.statement_index,
        fallbackText: statement.content_text,
      }),
    })
  );

  return {
    councilor,
    statements,
    questionCounts: buildCouncilorQuestionCounts(
      statementDetails.flatMap((statement) =>
        statement.bills?.publication_category
          ? [statement.bills.publication_category]
          : []
      )
    ),
  };
});
